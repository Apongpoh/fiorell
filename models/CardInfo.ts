import mongoose, { Schema, Document } from "mongoose";

export interface ICardInfo extends Document {
  userId: string;
  sessionId: string;
  planId: string;
  
  // Card Details (encrypted/masked in production)
  cardNumber: string; // Last 4 digits only in production
  expiryMonth: string;
  expiryYear: string;
  cvc: string; // Never store in production
  cardholderName: string;
  
  // Billing Information
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  
  // Payment Details
  amount: number;
  currency: string;
  planName: string;
  planInterval: string; // "month" | "year"
  
  // Transaction Status
  status: "pending" | "completed" | "failed" | "cancelled";
  paymentMethod: "demo" | "credit_card" | "paypal" | "crypto";
  
  // Demo/Testing flags
  isDemo: boolean;
  demoNote?: string;
  
  // Timestamps
  createdAt: Date;
  processedAt?: Date;
  
  // Metadata
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

const CardInfoSchema: Schema = new Schema(
  {
    userId: { 
      type: String, 
      required: true, 
      index: true 
    },
    sessionId: { 
      type: String, 
      required: true, 
      unique: true
    },
    planId: { 
      type: String, 
      required: true 
    },
    
    // Card Details
    cardNumber: { 
      type: String, 
      required: true 
    }, // In production, only store last 4 digits
    expiryMonth: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v: string) {
          return /^(0[1-9]|1[0-2])$/.test(v);
        },
        message: 'Expiry month must be 01-12'
      }
    },
    expiryYear: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v: string) {
          return /^20[2-9][0-9]$/.test(v);
        },
        message: 'Expiry year must be valid (2020+)'
      }
    },
    cvc: { 
      type: String, 
      required: true 
    }, // Never store in production!
    cardholderName: { 
      type: String, 
      required: true,
      trim: true
    },
    
    // Billing Information
    billingAddress: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      zipCode: { type: String, trim: true }
    },
    
    // Payment Details
    amount: { 
      type: Number, 
      required: true,
      min: 0
    },
    currency: { 
      type: String, 
      required: true,
      uppercase: true,
      default: "USD"
    },
    planName: { 
      type: String, 
      required: true 
    },
    planInterval: { 
      type: String, 
      required: true,
      enum: ["month", "year"]
    },
    
    // Transaction Status
    status: {
      type: String,
      required: true,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["demo", "credit_card", "paypal", "crypto"],
      default: "demo"
    },
    
    // Demo/Testing flags
    isDemo: {
      type: Boolean,
      required: true,
      default: true
    },
    demoNote: {
      type: String,
      default: "Demo transaction - no real payment processed"
    },
    
    // Timestamps
    createdAt: { 
      type: Date, 
      default: Date.now,
      index: true
    },
    processedAt: { 
      type: Date 
    },
    
    // Metadata
    userAgent: { type: String },
    ipAddress: { type: String },
    metadata: { 
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
CardInfoSchema.index({ userId: 1, createdAt: -1 });
// Note: sessionId index is already created by unique: true constraint
CardInfoSchema.index({ status: 1, createdAt: -1 });
CardInfoSchema.index({ isDemo: 1, status: 1 });

// Pre-save middleware to mask sensitive data in production
CardInfoSchema.pre('save', function(next) {
  if (this.isNew && !this.isDemo) {
    // In production, mask card number (keep only last 4 digits)
    const cardNumber = this.cardNumber as string;
    if (cardNumber && cardNumber.length > 4) {
      const lastFour = cardNumber.slice(-4);
      this.cardNumber = `****-****-****-${lastFour}`;
    }
    
    // Never store CVC in production
    this.cvc = "***";
  }
  
  next();
});

// Instance method to get safe card info for display
CardInfoSchema.methods.getSafeCardInfo = function() {
  return {
    id: this._id,
    sessionId: this.sessionId,
    lastFour: this.cardNumber.slice(-4),
    cardholderName: this.cardholderName,
    expiryMonth: this.expiryMonth,
    expiryYear: this.expiryYear,
    planName: this.planName,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    isDemo: this.isDemo,
    createdAt: this.createdAt,
    processedAt: this.processedAt
  };
};

// Static method to find user's payment history
CardInfoSchema.statics.getUserPaymentHistory = function(userId: string, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-cvc -metadata.sensitive') // Never return sensitive data
    .lean();
};

// Static method to get payment stats
CardInfoSchema.statics.getPaymentStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" }
      }
    }
  ]);
};

export default mongoose.models.CardInfo || 
  mongoose.model<ICardInfo>("CardInfo", CardInfoSchema);