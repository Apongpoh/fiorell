import mongoose, { Document, Schema } from "mongoose";

export interface ICryptoPayment extends Document {
  userId: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;
  paymentId: string; // Unique payment identifier
  paymentReference: string; // NEW: Unique reference for static address tracking
  
  // Crypto details
  cryptocurrency: "bitcoin" | "monero";
  network: "mainnet" | "testnet";
  
  // Payment amounts
  amount: number; // Amount in cryptocurrency (BTC/XMR)
  amountSat?: number; // For Bitcoin - amount in satoshis
  amountUSD: number; // USD equivalent at time of payment
  expectedAmountSat?: number; // NEW: Exact expected amount in satoshis
  
  // Wallet addresses
  fromAddress?: string; // Sender's address
  toAddress: string; // Our receiving address
  
  // Transaction details
  txHash?: string; // Blockchain transaction hash
  confirmations: number;
  requiredConfirmations: number;
  
  // Payment status and verification
  status: "pending" | "user_confirmed" | "admin_verifying" | "confirmed" | "failed" | "expired";
  paymentUrl?: string; // QR code or payment URL
  
  // NEW: User payment proof submission
  userProof?: {
    transactionHash: string;
    fromAddress?: string;
    amount: number;
    submittedAt: Date;
    screenshot?: string; // Optional proof screenshot
    notes?: string; // User notes
  };
  
  // NEW: Admin verification
  adminVerification?: {
    verifiedBy: mongoose.Types.ObjectId; // Admin user ID
    verifiedAt: Date;
    status: "approved" | "rejected";
    notes?: string; // Admin notes
    blockchainVerified: boolean; // Confirmed on blockchain
  };
  
  // Subscription details
  planType: "premium" | "premium_plus";
  planDuration: "monthly" | "annual";
  isRecurring: boolean;
  
  // Timing
  expiresAt: Date; // When payment expires if not completed
  confirmedAt?: Date; // When payment was confirmed
  userConfirmedAt?: Date; // NEW: When user submitted proof
  adminVerifiedAt?: Date; // NEW: When admin verified
  createdAt: Date;
  updatedAt: Date;
  
  // Webhooks and notifications
  webhookProcessed: boolean;
  notificationsSent: string[]; // Array of notification types sent
  
  // Metadata
  metadata?: Record<string, unknown>;
}

// Interface for static methods
interface ICryptoPaymentModel extends mongoose.Model<ICryptoPayment> {
  generatePaymentReference(): string;
  findByReference(reference: string): Promise<ICryptoPayment | null>;
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
    paymentReference: {
      type: String,
      required: true,
      unique: true,
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
    expectedAmountSat: {
      type: Number,
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
      enum: ["pending", "user_confirmed", "admin_verifying", "confirmed", "failed", "expired"],
      default: "pending",
      index: true,
    },
    paymentUrl: {
      type: String,
      trim: true,
    },
    
    // User payment proof submission
    userProof: {
      transactionHash: { type: String },
      fromAddress: { type: String },
      amount: { type: Number },
      submittedAt: { type: Date },
      screenshot: { type: String },
      notes: { type: String }
    },
    
    // Admin verification
    adminVerification: {
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: { type: Date },
      status: { 
        type: String, 
        enum: ["approved", "rejected"] 
      },
      notes: { type: String },
      blockchainVerified: { type: Boolean, default: false }
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
    userConfirmedAt: {
      type: Date,
      index: true,
    },
    adminVerifiedAt: {
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
CryptoPaymentSchema.index({ "userProof.transactionHash": 1 }, { sparse: true });
CryptoPaymentSchema.index({ "adminVerification.status": 1 }, { sparse: true });
CryptoPaymentSchema.index({ "adminVerification.verifiedBy": 1 }, { sparse: true });

// Virtual for payment status display
CryptoPaymentSchema.virtual("statusDisplay").get(function () {
  switch (this.status) {
    case "pending":
      return "Awaiting Payment";
    case "user_confirmed":
      return "User Confirmed - Pending Verification";
    case "admin_verifying":
      return "Under Admin Review";
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

// Method to submit user payment proof
CryptoPaymentSchema.methods.submitUserProof = function (proof: {
  transactionHash: string;
  fromAddress?: string;
  amount: number;
  screenshot?: string;
  notes?: string;
}) {
  this.userProof = {
    ...proof,
    submittedAt: new Date()
  };
  this.status = "user_confirmed";
  this.userConfirmedAt = new Date();
  return this.save();
};

// Method to update admin verification
CryptoPaymentSchema.methods.setAdminVerification = function (
  adminId: string,
  status: "approved" | "rejected",
  notes?: string,
  blockchainVerified = false
) {
  this.adminVerification = {
    verifiedBy: new mongoose.Types.ObjectId(adminId),
    verifiedAt: new Date(),
    status,
    notes,
    blockchainVerified
  };
  
  if (status === "approved") {
    this.status = "confirmed";
    this.confirmedAt = new Date();
  } else {
    this.status = "failed";
  }
  
  this.adminVerifiedAt = new Date();
  return this.save();
};

// Static method to generate unique payment reference
CryptoPaymentSchema.statics.generatePaymentReference = function (): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `PAY_${timestamp}_${random}`.toUpperCase();
};

// Static method to find payment by reference
CryptoPaymentSchema.statics.findByReference = function (reference: string) {
  return this.findOne({ paymentReference: reference });
};

export default mongoose.models.CryptoPayment ||
  mongoose.model<ICryptoPayment, ICryptoPaymentModel>("CryptoPayment", CryptoPaymentSchema);