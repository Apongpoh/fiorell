import mongoose, { Document, Schema } from "mongoose";

export interface IBoost extends Document {
  userId: mongoose.Types.ObjectId;
  type: "daily" | "weekly" | "premium";
  status: "active" | "expired" | "cancelled";
  createdAt: Date;
  expiresAt: Date;
  activatedAt?: Date;
}

const BoostSchema = new Schema<IBoost>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["daily", "weekly", "premium"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    activatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
BoostSchema.index({ userId: 1, status: 1, createdAt: -1 });
BoostSchema.index({ userId: 1, type: 1, status: 1 });
BoostSchema.index({ expiresAt: 1, status: 1 }); // For cleanup jobs

// Pre-save middleware to set expiry based on boost type
BoostSchema.pre("save", function (next) {
  if (this.isNew && !this.expiresAt) {
    const now = new Date();
    switch (this.type) {
      case "daily":
        this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        break;
      case "weekly":
        this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        break;
      case "premium":
        // Premium boosts last 30 days
        this.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
    }
  }
  next();
});

export default mongoose.models.Boost || mongoose.model<IBoost>("Boost", BoostSchema);