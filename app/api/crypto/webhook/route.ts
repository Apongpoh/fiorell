import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import CryptoPayment from "@/models/CryptoPayment";
import CryptoSubscription from "@/models/CryptoSubscription";
import CryptoWallet from "@/models/CryptoWallet";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import { getCryptoService } from "@/lib/cryptoService";

// Webhook for Bitcoin transaction confirmations
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    
    // Verify webhook authenticity (you should implement proper webhook signature verification)
    const webhookSecret = process.env.CRYPTO_WEBHOOK_SECRET;
    const signature = request.headers.get("x-webhook-signature");
    
    if (!signature || !verifyWebhookSignature(JSON.stringify(body), signature, webhookSecret)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }
    
    const {
      txid,
      address,
      amount,
      confirmations,
      cryptocurrency,
      type = "confirmation"
    } = body;
    
    console.log(`Webhook received: ${type} for ${cryptocurrency} transaction ${txid}`);
    
    if (type === "confirmation" || type === "payment") {
      await handlePaymentConfirmation({
        txid,
        address,
        amount,
        confirmations,
        cryptocurrency,
      });
    } else if (type === "mempool") {
      await handleMempoolTransaction({
        txid,
        address,
        amount,
        cryptocurrency,
      });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentConfirmation({
  txid,
  address,
  amount,
  confirmations,
  cryptocurrency,
}: {
  txid: string;
  address: string;
  amount: number;
  confirmations: number;
  cryptocurrency: string;
}) {
  // Find the payment by address and expected amount
  const payment = await CryptoPayment.findOne({
    paymentAddress: address,
    cryptocurrency,
    status: { $in: ["pending", "received"] },
  });
  
  if (!payment) {
    console.log(`No payment found for address ${address}`);
    return;
  }
  
  // Update payment with transaction details
  payment.transactionId = txid;
  payment.confirmations = confirmations;
  
  const requiredConfirmations = cryptocurrency === "bitcoin" ? 1 : 10; // Bitcoin: 1, Monero: 10
  
  if (confirmations >= requiredConfirmations) {
    payment.status = "confirmed";
    payment.confirmedAt = new Date();
    
    // Process the successful payment
    await processSuccessfulPayment(payment);
  } else if (confirmations > 0) {
    payment.status = "received";
    payment.receivedAt = new Date();
  }
  
  await payment.save();
  
  // Update wallet balance
  const wallet = await CryptoWallet.findOne({
    userId: payment.userId,
    address: payment.paymentAddress,
    cryptocurrency,
  });
  
  if (wallet) {
    wallet.balance += amount;
    wallet.lastTransactionId = txid;
    wallet.lastTransactionAt = new Date();
    await wallet.save();
  }
}

async function handleMempoolTransaction({
  txid,
  address,
  cryptocurrency,
}: {
  txid: string;
  address: string;
  amount: number;
  cryptocurrency: string;
}) {
  // Find the payment by address
  const payment = await CryptoPayment.findOne({
    paymentAddress: address,
    cryptocurrency,
    status: "pending",
  });
  
  if (!payment) {
    console.log(`No pending payment found for address ${address}`);
    return;
  }
  
  // Update payment status to indicate transaction is in mempool
  payment.transactionId = txid;
  payment.status = "received";
  payment.receivedAt = new Date();
  payment.confirmations = 0;
  
  await payment.save();
  
  console.log(`Payment ${payment.paymentId} detected in mempool: ${txid}`);
}

async function processSuccessfulPayment(payment: {
  paymentId: string;
  userId: string;
  subscriptionId?: string;
  planType: string;
  planDuration?: string;
  cryptocurrency: string;
}) {
  try {
    const user = await User.findById(payment.userId);
    if (!user) {
      console.error(`User not found for payment ${payment.paymentId}`);
      return;
    }
    
    // Check if this is a subscription payment
    const cryptoSubscription = await CryptoSubscription.findOne({
      userId: payment.userId,
      cryptocurrency: payment.cryptocurrency,
      planType: payment.planType,
      status: { $in: ["pending", "active"] },
    });
    
    if (cryptoSubscription) {
      await processSubscriptionPayment(payment, cryptoSubscription, user);
    } else {
      await processOneTimePayment(payment, user);
    }
    
  } catch (error) {
    console.error("Error processing successful payment:", error);
  }
}

async function processSubscriptionPayment(
  payment: { planType: string },
  cryptoSubscription: any,
  user: any
) {
  // Update crypto subscription
  cryptoSubscription.status = "active";
  cryptoSubscription.totalPayments += 1;
  cryptoSubscription.successfulPayments += 1;
  cryptoSubscription.lastPaymentAt = new Date();
  cryptoSubscription.health = "healthy";
  
  // Calculate next billing date
  const nextBilling = new Date(cryptoSubscription.nextBillingDate);
  if (cryptoSubscription.billingCycle === "monthly") {
    nextBilling.setMonth(nextBilling.getMonth() + 1);
  } else {
    nextBilling.setFullYear(nextBilling.getFullYear() + 1);
  }
  
  cryptoSubscription.nextBillingDate = nextBilling;
  cryptoSubscription.currentPeriodStart = new Date();
  cryptoSubscription.currentPeriodEnd = new Date(nextBilling);
  
  await cryptoSubscription.save();
  
  // Create or update regular subscription
  let subscription = await Subscription.findOne({ userId: user._id });
  
  if (!subscription) {
    subscription = new Subscription({
      userId: user._id,
      type: payment.planType,
      status: "active",
      startDate: new Date(),
      endDate: nextBilling,
      paymentMethod: "crypto",
      autoRenew: cryptoSubscription.autoRenew,
    });
  } else {
    subscription.type = payment.planType;
    subscription.status = "active";
    subscription.endDate = nextBilling;
    subscription.paymentMethod = "crypto";
    subscription.autoRenew = cryptoSubscription.autoRenew;
  }
  
  await subscription.save();
  
  // Update user subscription status
  user.subscriptionType = payment.planType;
  user.subscriptionStatus = "active";
  user.subscriptionEndDate = nextBilling;
  
  // Set crypto as the payment method
  if (!user.subscription) {
    user.subscription = {
      type: "free",
      features: [],
      paymentMethod: "crypto",
      preferredPaymentMethod: "crypto",
    };
  } else {
    user.subscription.paymentMethod = "crypto";
    if (!user.subscription.preferredPaymentMethod) {
      user.subscription.preferredPaymentMethod = "crypto";
    }
  }
  
  await user.save();
  
  console.log(`Subscription activated for user ${user._id}: ${payment.planType}`);
}

async function processOneTimePayment(
  payment: { planType: string; planDuration?: string },
  user: any
) {
  // For one-time payments, just activate premium features for the specified duration
  const duration = payment.planDuration || "monthly";
  const endDate = new Date();
  
  if (duration === "monthly") {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (duration === "annual") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }
  
  // Create subscription
  const subscription = new Subscription({
    userId: user._id,
    type: payment.planType,
    status: "active",
    startDate: new Date(),
    endDate: endDate,
    paymentMethod: "crypto",
    autoRenew: false,
  });
  
  await subscription.save();
  
  // Update user
  user.subscriptionType = payment.planType;
  user.subscriptionStatus = "active";
  user.subscriptionEndDate = endDate;
  
  // Set crypto as the payment method
  if (!user.subscription) {
    user.subscription = {
      type: "free",
      features: [],
      paymentMethod: "crypto",
      preferredPaymentMethod: "crypto",
    };
  } else {
    user.subscription.paymentMethod = "crypto";
    if (!user.subscription.preferredPaymentMethod) {
      user.subscription.preferredPaymentMethod = "crypto";
    }
  }
  
  await user.save();
  
  console.log(`One-time subscription activated for user ${user._id}: ${payment.planType}`);
}

async function verifyWebhookSignature(payload: string, signature: string, secret: string | undefined): Promise<boolean> {
  if (!secret) return false;
  
  // Implement HMAC-SHA256 signature verification
  const crypto = await import("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  const providedSignature = signature.replace("sha256=", "");
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(providedSignature, "hex")
  );
}

// GET endpoint to manually check payment status
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    const address = searchParams.get("address");
    
    if (!paymentId && !address) {
      return NextResponse.json(
        { error: "Payment ID or address is required" },
        { status: 400 }
      );
    }
    
    const query = paymentId 
      ? { paymentId }
      : { paymentAddress: address };
    
    const payment = await CryptoPayment.findOne(query);
    
    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }
    
    // Check current status from blockchain
    const cryptoService = getCryptoService();
    const blockchainStatus = await cryptoService.checkTransactionStatus(
      payment.cryptocurrency,
      payment.transactionId || "",
      payment.paymentAddress
    );
    
    return NextResponse.json({
      payment: {
        paymentId: payment.paymentId,
        status: payment.status,
        cryptocurrency: payment.cryptocurrency,
        amount: payment.amount,
        paymentAddress: payment.paymentAddress,
        transactionId: payment.transactionId,
        confirmations: payment.confirmations,
        requiredConfirmations: payment.requiredConfirmations,
        expiresAt: payment.expiresAt,
        receivedAt: payment.receivedAt,
        confirmedAt: payment.confirmedAt,
      },
      blockchain: blockchainStatus,
    });
    
  } catch (error) {
    console.error("Payment status check error:", error);
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 }
    );
  }
}