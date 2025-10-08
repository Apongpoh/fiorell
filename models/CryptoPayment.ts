import mongoose, { Document, Schema } from "mongoose";

export interface ICryptoPayment extends Document {
  userId: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;
  paymentId: string; // Unique payment identifier
  
  // Crypto details
  cryptocurrency: "bitcoin" | "monero";
  network: "mainnet" | "testnet";
  
  // Payment amounts
  amount: number; // Amount in cryptocurrency (BTC/XMR)
  amountSat?: number; // For Bitcoin - amount in satoshis
  amountUSD: number; // USD equivalent at time of payment
  
  // Wallet addresses
  fromAddress?: string; // Sender's address
  toAddress: string; // Our receiving address
  
  // Transaction details
  txHash?: string; // Blockchain transaction hash
  confirmations: number;
  requiredConfirmations: number;
  
  // Payment status
  status: "pending" | "confirming" | "confirmed" | "failed" | "expired";
  paymentUrl?: string; // QR code or payment URL
  
  // Subscription details
  planType: "premium" | "premium_plus";
  planDuration: "monthly" | "annual";
  isRecurring: boolean;
  
  // Timing
  expiresAt: Date; // When payment expires if not completed
  confirmedAt?: Date; // When payment was confirmed
  createdAt: Date;
  updatedAt: Date;
  
  // Webhooks and notifications
  webhookProcessed: boolean;
  notificationsSent: string[]; // Array of notification types sent
  
  // Metadata
  metadata?: Record<string, unknown>;
}

const CryptoPaymentSchema = new Schema<ICryptoPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      index: true,
    },
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // Crypto details
    cryptocurrency: {
      type: String,
      enum: ["bitcoin", "monero"],
      required: true,
      index: true,
    },
    network: {
      type: String,
      enum: ["mainnet", "testnet"],
      default: "mainnet",
      index: true,
    },
    
    // Payment amounts
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountSat: {
      type: Number,
      min: 0,
    },
    amountUSD: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Wallet addresses
    fromAddress: {
      type: String,
      trim: true,
    },
    toAddress: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Transaction details
    txHash: {
      type: String,
      trim: true,
    },
    confirmations: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiredConfirmations: {
      type: Number,
      default: 1,
      min: 1,
    },
    
    // Payment status
    status: {
      type: String,
      enum: ["pending", "confirming", "confirmed", "failed", "expired"],
      default: "pending",
      index: true,
    },
    paymentUrl: {
      type: String,
      trim: true,
    },
    
    // Subscription details
    planType: {
      type: String,
      enum: ["premium", "premium_plus"],
      required: true,
    },
    planDuration: {
      type: String,
      enum: ["monthly", "annual"],
      required: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    
    // Timing
    expiresAt: {
      type: Date,
      required: true,
    },
    confirmedAt: {
      type: Date,
      index: true,
    },
    
    // Webhooks and notifications
    webhookProcessed: {
      type: Boolean,
      default: false,
    },
    notificationsSent: [{
      type: String,
    }],
    
    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
CryptoPaymentSchema.index({ userId: 1, status: 1 });
CryptoPaymentSchema.index({ cryptocurrency: 1, status: 1 });
CryptoPaymentSchema.index({ txHash: 1 }, { sparse: true });
CryptoPaymentSchema.index({ expiresAt: 1 });
CryptoPaymentSchema.index({ createdAt: -1 });

// Virtual for payment status display
CryptoPaymentSchema.virtual("statusDisplay").get(function () {
  switch (this.status) {
    case "pending":
      return "Awaiting Payment";
    case "confirming":
      return `Confirming (${this.confirmations}/${this.requiredConfirmations})`;
    case "confirmed":
      return "Payment Confirmed";
    case "failed":
      return "Payment Failed";
    case "expired":
      return "Payment Expired";
    default:
      return "Unknown";
  }
});

// Method to check if payment is expired
CryptoPaymentSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt && this.status === "pending";
};

// Method to check if payment is complete
CryptoPaymentSchema.methods.isComplete = function (): boolean {
  return this.status === "confirmed";
};

export default mongoose.models.CryptoPayment ||
  mongoose.model<ICryptoPayment>("CryptoPayment", CryptoPaymentSchema);