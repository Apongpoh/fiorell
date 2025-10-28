import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import CryptoPayment from "@/models/CryptoPayment";
import CryptoWallet from "@/models/CryptoWallet";
import { getCryptoService } from "@/lib/cryptoService";
import { activateSubscription } from "@/lib/subscriptionActivation";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import mongoose from "mongoose";

// Create a new crypto payment
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { userId } = verifyAuth(request);
    const body = await request.json();
    
    const {
      cryptocurrency,
      planType,
      planDuration,
      isRecurring = false,
      paymentType = "new", // NEW: "new", "retry", "renewal", "upgrade"
      previousPaymentId, // NEW: For retry/renewal scenarios
    } = body;
    
    // Validate input
    if (!["bitcoin", "monero"].includes(cryptocurrency)) {
      return NextResponse.json(
        { error: "Invalid cryptocurrency" },
        { status: 400 }
      );
    }
    
    if (!["premium", "premium_plus"].includes(planType)) {
      return NextResponse.json(
        { error: "Invalid plan type" },
        { status: 400 }
      );
    }
    
    if (!["monthly", "annual"].includes(planDuration)) {
      return NextResponse.json(
        { error: "Invalid plan duration" },
        { status: 400 }
      );
    }

    // Validate payment type
    if (!["new", "retry", "renewal", "upgrade"].includes(paymentType)) {
      return NextResponse.json(
        { error: "Invalid payment type" },
        { status: 400 }
      );
    }

    // For retry/renewal scenarios, validate previous payment exists
    if ((paymentType === "retry" || paymentType === "renewal") && !previousPaymentId) {
      return NextResponse.json(
        { error: "Previous payment ID required for retry/renewal" },
        { status: 400 }
      );
    }

    // Check for existing pending payments (avoid duplicates)
    const existingPendingPayment = await CryptoPayment.findOne({
      userId,
      status: { $in: ["pending", "user_confirmed", "admin_verifying"] },
      cryptocurrency,
      planType,
      planDuration,
    });

    if (existingPendingPayment && paymentType === "new") {
      return NextResponse.json({
        error: "You already have a pending payment for this plan",
        existingPayment: {
          paymentId: existingPendingPayment.paymentId,
          paymentReference: existingPendingPayment.paymentReference,
          status: existingPendingPayment.status,
          expiresAt: existingPendingPayment.expiresAt,
        },
      }, { status: 409 });
    }
    
    // Get pricing
    const cryptoService = getCryptoService();
    
    // Plan pricing in USD
    const planPricing: Record<string, Record<string, number>> = {
      premium: {
        monthly: 9.99,
        annual: 99.99,
      },
      premium_plus: {
        monthly: 19.99,
        annual: 199.99,
      },
    };
    
    const amountUSD = planPricing[planType]?.[planDuration] || 9.99;
    const amountCrypto = await cryptoService.convertUSDToCrypto(amountUSD, cryptocurrency);
    
    // Convert to satoshis for Bitcoin to avoid floating point issues
    const amountSat = cryptocurrency === "bitcoin" ? Math.round(amountCrypto * 100000000) : undefined;
    
    // Get static payment address (same address for all payments)
    const paymentAddress = await cryptoService.generateAddress(cryptocurrency);
    
    // Generate unique payment reference for tracking
    const generatePaymentReference = (): string => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      return `PAY_${timestamp}_${random}`.toUpperCase();
    };
    
    const paymentReference = generatePaymentReference();

    // Handle previous payment if this is a retry or renewal
    let previousPayment = null;
    if (previousPaymentId) {
      previousPayment = await CryptoPayment.findOne({
        paymentId: previousPaymentId,
        userId,
      });

      if (!previousPayment) {
        return NextResponse.json(
          { error: "Previous payment not found" },
          { status: 404 }
        );
      }

      // For retry: mark previous payment as expired if it's still pending
      if (paymentType === "retry" && ["pending", "user_confirmed", "admin_verifying"].includes(previousPayment.status)) {
        previousPayment.status = "expired";
        await previousPayment.save();
      }

      // For renewal: ensure previous payment was successful
      if (paymentType === "renewal" && previousPayment.status !== "confirmed") {
        return NextResponse.json(
          { error: "Cannot renew: previous payment was not confirmed" },
          { status: 400 }
        );
      }
    }
    
    // Create payment record
    const payment = new CryptoPayment({
      userId,
      paymentId: uuidv4(),
      paymentReference, // NEW: Unique reference for tracking
      cryptocurrency,
      network: process.env.CRYPTO_NETWORK || "testnet",
      amount: amountCrypto,
      amountSat, // NEW: Amount in satoshis for Bitcoin
      amountUSD,
      expectedAmountSat: amountSat, // NEW: Expected amount for verification
      toAddress: paymentAddress,
      planType,
      planDuration,
      isRecurring,
      status: "pending",
      confirmations: 0,
      requiredConfirmations: cryptocurrency === "bitcoin" ? 1 : 10, // Bitcoin needs 1, Monero needs 10
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
      metadata: {
        paymentType, // NEW: Track the type of payment
        previousPaymentId: previousPaymentId || null, // NEW: Link to previous payment if applicable
        createdReason: paymentType === "retry" ? "Payment retry" : 
                      paymentType === "renewal" ? "Subscription renewal" :
                      paymentType === "upgrade" ? "Plan upgrade" : "New payment",
      },
    });
    
    await payment.save();
    
    // Create payment URL for QR code
    const paymentUrl = cryptoService.createPaymentURL(
      paymentAddress,
      amountCrypto,
      cryptocurrency
    );
    
    // Generate QR code
    const qrCodeData = await QRCode.toDataURL(paymentUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    payment.paymentUrl = paymentUrl;
    await payment.save();
    
    // Optional: Create or update a single wallet record for this static address
    // Since you're using static addresses, we don't need per-user wallet records
    try {
      await CryptoWallet.findOneAndUpdate(
        { address: paymentAddress, cryptocurrency },
        {
          $setOnInsert: {
            userId: new mongoose.Types.ObjectId(userId), // Set only on first insert
            address: paymentAddress,
            cryptocurrency,
            network: process.env.CRYPTO_NETWORK || "mainnet",
            addressType: "receiving",
            isActive: true,
            isWatchOnly: true,
            label: `Static ${cryptocurrency.toUpperCase()} address`,
            createdAt: new Date(),
          },
          $set: {
            lastUsedAt: new Date(),
            updatedAt: new Date(),
          },
          $inc: { usageCount: 1 }
        },
        { upsert: true, new: true }
      );
    } catch (walletError) {
      // Log wallet error but don't fail the payment creation
      console.warn("Wallet record update failed (non-critical):", walletError);
    }
    
    // Start monitoring the address (in a real implementation)
    // cryptoService.monitorAddress(paymentAddress, cryptocurrency, amountCrypto, handlePaymentReceived);
    
    return NextResponse.json({
      payment: {
        paymentId: payment.paymentId,
        paymentReference: payment.paymentReference, // NEW: Include reference for user tracking
        cryptocurrency,
        amount: amountCrypto,
        amountSat, // NEW: Include satoshi amount for Bitcoin
        amountUSD,
        expectedAmountSat: amountSat, // NEW: Expected amount for user verification
        paymentAddress: paymentAddress,
        paymentUrl,
        qrCode: qrCodeData,
        status: payment.status,
        expiresAt: payment.expiresAt,
        requiredConfirmations: payment.requiredConfirmations,
        paymentType, // NEW: Include payment type in response
        previousPaymentId: previousPaymentId || null, // NEW: Reference to previous payment
      },
    });
    
  } catch (error) {
    console.error("Create crypto payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get crypto payment status
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { userId } = verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    
    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }
    
    const payment = await CryptoPayment.findOne({
      userId,
      paymentId,
    });
    
    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }
    
    // Check if payment has expired
    if (payment.isExpired()) {
      payment.status = "expired";
      await payment.save();
    }
    
    // Get current address info to check for new transactions
    const cryptoService = getCryptoService();
    const addressInfo = await cryptoService.getAddressInfo(
      payment.toAddress,
      payment.cryptocurrency
    );
    
    // Check if payment has been received
    if (addressInfo.balance >= payment.amount && payment.status === "pending") {
      payment.status = "confirming";
      payment.confirmations = addressInfo.confirmations || 0;
      await payment.save();
    }
    
    // Check if payment is confirmed
    if (payment.confirmations >= payment.requiredConfirmations && payment.status === "confirming") {
      payment.status = "confirmed";
      payment.confirmedAt = new Date();
      await payment.save();
      
      // Activate the subscription
      const activationResult = await activateSubscription({
        userId: userId,
        planType: payment.planType,
        planDuration: payment.planDuration,
        cryptocurrency: payment.cryptocurrency,
        isRecurring: payment.isRecurring
      });

      if (!activationResult.success) {
        console.error("Failed to activate subscription:", activationResult.message);
      }
    }
    
    return NextResponse.json({
      payment: {
        paymentId: payment.paymentId,
        status: payment.status,
        cryptocurrency: payment.cryptocurrency,
        amount: payment.amount,
        amountUSD: payment.amountUSD,
        address: payment.toAddress,
        confirmations: payment.confirmations,
        requiredConfirmations: payment.requiredConfirmations,
        expiresAt: payment.expiresAt,
        confirmedAt: payment.confirmedAt,
        currentBalance: addressInfo.balance,
      },
    });
    
  } catch (error) {
    console.error("Get crypto payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}