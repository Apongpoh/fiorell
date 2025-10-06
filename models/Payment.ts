import mongoose, { Document, Schema } from "mongoose";

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;
  
  // Lemon Squeezy payment details
  lemonsqueezyOrderId: string;
  lemonsqueezySubscriptionId?: string;
  lemonsqueezyVariantId: string;
  lemonsqueezyCustomerId?: string;
  
  // Payment information
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded" | "partial_refund";
  paymentMethod: string;
  
  // Product details
  productName: string;
  planId: string;
  
  // Billing details
  billingEmail: string;
  billingName?: string;
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  
  // Dates
  paidAt?: Date;
  refundedAt?: Date;
  
  // Tax information
  taxAmount?: number;
  taxRate?: number;
  taxCountry?: string;
  
  // Receipt and invoices
  receiptUrl?: string;
  invoiceUrl?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
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
    
    // Lemon Squeezy fields
    lemonsqueezyOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    lemonsqueezySubscriptionId: {
      type: String,
    },
    lemonsqueezyVariantId: {
      type: String,
      required: true,
    },
    lemonsqueezyCustomerId: {
      type: String,
      index: true,
    },
    
    // Payment information
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "paid", "failed", "refunded", "partial_refund"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    
    // Product details
    productName: {
      type: String,
      required: true,
    },
    planId: {
      type: String,
      required: true,
      enum: ["premium", "premium_plus", "premium_annual", "premium_plus_annual"],
    },
    
    // Billing details
    billingEmail: {
      type: String,
      required: true,
    },
    billingName: {
      type: String,
    },
    billingAddress: {
      line1: { type: String },
      line2: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      postalCode: { type: String },
    },
    
    // Dates
    paidAt: {
      type: Date,
    },
    refundedAt: {
      type: Date,
    },
    
    // Tax information
    taxAmount: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    taxCountry: {
      type: String,
    },
    
    // Receipt and invoices
    receiptUrl: {
      type: String,
    },
    invoiceUrl: {
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

// Virtual for formatted amount
PaymentSchema.virtual("formattedAmount").get(function () {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency,
  }).format(this.amount);
});

// Indexes
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);