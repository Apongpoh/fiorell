import mongoose, { Document, Schema } from "mongoose";

export interface ICryptoSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  
  // Subscription details
  planType: "premium" | "premium_plus";
  planDuration: "monthly" | "annual";
  status: "active" | "cancelled" | "expired" | "failed" | "pending";
  
  // Crypto settings
  cryptocurrency: "bitcoin" | "monero";
  network: "mainnet" | "testnet";
  
  // Pricing
  amountCrypto: number; // Amount in crypto for each payment
  amountUSD: number; // USD equivalent
  
  // Billing cycle
  billingCycle: "monthly" | "annual";
  nextBillingDate: Date;
  lastBillingDate?: Date;
  
  // Payment tracking
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  totalAmountPaid: number; // Total in crypto
  totalAmountPaidUSD: number; // Total in USD
  
  // Auto-renewal settings
  autoRenew: boolean;
  maxRetries: number; // Max retry attempts for failed payments
  currentRetries: number;
  
  // Grace period
  gracePeriodDays: number;
  gracePeriodEnds?: Date;
  
  // Subscription period
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  
  // Cancellation
  cancelledAt?: Date;
  cancellationReason?: string;
  cancelAtPeriodEnd: boolean;
  
  // Wallet information
  paymentAddress: string; // Address for payments
  backupAddresses: string[]; // Backup addresses
  
  // Notifications
  notificationSettings: {
    paymentReminder: boolean;
    paymentSuccess: boolean;
    paymentFailure: boolean;
    subscriptionExpiry: boolean;
  };
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  createdAt: Date;
  updatedAt: Date;
}

const CryptoSubscriptionSchema = new Schema<ICryptoSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    status: {
      type: String,
      enum: ["active", "cancelled", "expired", "failed", "pending"],
      default: "pending",
      index: true,
    },
    
    // Crypto settings
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
    },
    
    // Pricing
    amountCrypto: {
      type: Number,
      required: true,
      min: 0,
    },
    amountUSD: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Billing cycle
    billingCycle: {
      type: String,
      enum: ["monthly", "annual"],
      required: true,
    },
    nextBillingDate: {
      type: Date,
      required: true,
      index: true,
    },
    lastBillingDate: {
      type: Date,
      index: true,
    },
    
    // Payment tracking
    totalPayments: {
      type: Number,
      default: 0,
      min: 0,
    },
    successfulPayments: {
      type: Number,
      default: 0,
      min: 0,
    },
    failedPayments: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmountPaidUSD: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Auto-renewal settings
    autoRenew: {
      type: Boolean,
      default: true,
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10,
    },
    currentRetries: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Grace period
    gracePeriodDays: {
      type: Number,
      default: 3,
      min: 0,
      max: 30,
    },
    gracePeriodEnds: {
      type: Date,
    },
    
    // Subscription period
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    
    // Cancellation
    cancelledAt: {
      type: Date,
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    
    // Wallet information
    paymentAddress: {
      type: String,
      required: true,
      trim: true,
    },
    backupAddresses: [{
      type: String,
      trim: true,
    }],
    
    // Notifications
    notificationSettings: {
      paymentReminder: {
        type: Boolean,
        default: true,
      },
      paymentSuccess: {
        type: Boolean,
        default: true,
      },
      paymentFailure: {
        type: Boolean,
        default: true,
      },
      subscriptionExpiry: {
        type: Boolean,
        default: true,
      },
    },
    
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
CryptoSubscriptionSchema.index({ userId: 1, status: 1 });
CryptoSubscriptionSchema.index({ cryptocurrency: 1, status: 1 });
CryptoSubscriptionSchema.index({ nextBillingDate: 1, status: 1 });
CryptoSubscriptionSchema.index({ gracePeriodEnds: 1 });
CryptoSubscriptionSchema.index({ currentPeriodEnd: 1 });

// Virtual for subscription health
CryptoSubscriptionSchema.virtual("health").get(function () {
  if (this.status === "active") {
    const successRate = this.totalPayments > 0 ? 
      (this.successfulPayments / this.totalPayments) * 100 : 100;
    
    if (successRate >= 90) return "excellent";
    if (successRate >= 75) return "good";
    if (successRate >= 50) return "fair";
    return "poor";
  }
  return "inactive";
});

// Method to check if subscription is due for renewal
CryptoSubscriptionSchema.methods.isDue = function (): boolean {
  return new Date() >= this.nextBillingDate && 
         this.status === "active" && 
         this.autoRenew;
};

// Method to check if subscription is in grace period
CryptoSubscriptionSchema.methods.isInGracePeriod = function (): boolean {
  return this.gracePeriodEnds && 
         new Date() <= this.gracePeriodEnds && 
         this.status === "active";
};

// Method to calculate next billing date
CryptoSubscriptionSchema.methods.calculateNextBillingDate = function (): Date {
  const current = this.nextBillingDate || new Date();
  const next = new Date(current);
  
  if (this.billingCycle === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else if (this.billingCycle === "annual") {
    next.setFullYear(next.getFullYear() + 1);
  }
  
  return next;
};

// Method to record payment attempt
CryptoSubscriptionSchema.methods.recordPaymentAttempt = async function (
  success: boolean, 
  amount?: number, 
  amountUSD?: number
): Promise<void> {
  this.totalPayments += 1;
  
  if (success) {
    this.successfulPayments += 1;
    this.currentRetries = 0;
    this.lastBillingDate = new Date();
    this.nextBillingDate = this.calculateNextBillingDate();
    
    if (amount) this.totalAmountPaid += amount;
    if (amountUSD) this.totalAmountPaidUSD += amountUSD;
    
    // Clear grace period
    this.gracePeriodEnds = undefined;
  } else {
    this.failedPayments += 1;
    this.currentRetries += 1;
    
    // Set grace period if max retries reached
    if (this.currentRetries >= this.maxRetries) {
      const gracePeriod = new Date();
      gracePeriod.setDate(gracePeriod.getDate() + this.gracePeriodDays);
      this.gracePeriodEnds = gracePeriod;
    }
  }
  
  await this.save();
};

export default mongoose.models.CryptoSubscription ||
  mongoose.model<ICryptoSubscription>("CryptoSubscription", CryptoSubscriptionSchema);