import mongoose, { Document, Schema } from "mongoose";

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  planId: string;
  status:
    | "active"
    | "cancelled"
    | "expired"
    | "on_trial"
    | "paused"
    | "past_due";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;

  // Lemon Squeezy specific fields
  lemonsqueezySubscriptionId: string;
  lemonsqueezyOrderId?: string;
  lemonsqueezyCustomerId?: string;
  lemonsqueezyVariantId: string;

  // Payment details
  price: number;
  currency: string;
  interval: "month" | "year";

  // Trial information
  trialStart?: Date;
  trialEnd?: Date;

  // Cancellation details
  cancelledAt?: Date;
  cancellationReason?: string;

  // Metadata
  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: String,
      required: true,
      enum: [
        "premium",
        "premium_plus",
        "premium_annual",
        "premium_plus_annual",
      ],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        "active",
        "cancelled",
        "expired",
        "on_trial",
        "paused",
        "past_due",
      ],
      default: "active",
      index: true,
    },
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    // Lemon Squeezy fields
    lemonsqueezySubscriptionId: {
      type: String,
      required: true,
      unique: true,
    },
    lemonsqueezyOrderId: {
      type: String,
    },
    lemonsqueezyCustomerId: {
      type: String,
    },
    lemonsqueezyVariantId: {
      type: String,
      required: true,
    },

    // Payment details
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
    },
    interval: {
      type: String,
      required: true,
      enum: ["month", "year"],
    },

    // Trial information
    trialStart: {
      type: Date,
    },
    trialEnd: {
      type: Date,
    },

    // Cancellation details
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },

    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for checking if subscription is active
SubscriptionSchema.virtual("isActive").get(function () {
  return this.status === "active" && new Date() < this.currentPeriodEnd;
});

// Virtual for checking if subscription is in trial
SubscriptionSchema.virtual("isInTrial").get(function () {
  const now = new Date();
  return (
    this.trialStart &&
    this.trialEnd &&
    now >= this.trialStart &&
    now <= this.trialEnd
  );
});

// Virtual for days remaining
SubscriptionSchema.virtual("daysRemaining").get(function () {
  const now = new Date();
  const diff = this.currentPeriodEnd.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Compound indexes
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

export default mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
