import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import CryptoPayment from "@/models/CryptoPayment";
import CryptoWallet from "@/models/CryptoWallet";
import { getCryptoService } from "@/lib/cryptoService";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";

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
    
    // Generate payment address
    const paymentAddress = await cryptoService.generateAddress(cryptocurrency);
    
    // Create payment record
    const payment = new CryptoPayment({
      userId,
      paymentId: uuidv4(),
      cryptocurrency,
      network: process.env.CRYPTO_NETWORK || "testnet",
      amount: amountCrypto,
      amountUSD,
      toAddress: paymentAddress,
      planType,
      planDuration,
      isRecurring,
      status: "pending",
      confirmations: 0,
      requiredConfirmations: cryptocurrency === "bitcoin" ? 1 : 10, // Bitcoin needs 1, Monero needs 10
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
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
    
    // Create or update wallet record
    await CryptoWallet.findOneAndUpdate(
      { userId, address: paymentAddress, cryptocurrency },
      {
        userId,
        address: paymentAddress,
        cryptocurrency,
        network: process.env.CRYPTO_NETWORK || "testnet",
        addressType: "receiving",
        isActive: true,
        isWatchOnly: true,
      },
      { upsert: true, new: true }
    );
    
    // Start monitoring the address (in a real implementation)
    // cryptoService.monitorAddress(paymentAddress, cryptocurrency, amountCrypto, handlePaymentReceived);
    
    return NextResponse.json({
      payment: {
        paymentId: payment.paymentId,
        cryptocurrency,
        amount: amountCrypto,
        amountUSD,
        paymentAddress: paymentAddress,
        paymentUrl,
        qrCode: qrCodeData,
        status: payment.status,
        expiresAt: payment.expiresAt,
        requiredConfirmations: payment.requiredConfirmations,
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
      
      // Here you would activate the subscription
      // await activateSubscription(userId, payment);
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