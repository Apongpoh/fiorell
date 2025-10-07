import mongoose, { Document, Schema } from "mongoose";

export interface IRateLimit extends Document {
  userId: mongoose.Types.ObjectId;
  resourceType: "message" | "like" | "superlike" | "boost" | "media_upload";
  resourceId?: string; // For specific resources like matchId for messages
  identifier: string; // Unique identifier for the rate limit (e.g., userId:matchId for messages)
  contentHash?: string; // For duplicate detection
  lastAction: Date;
  actionCount: number;
  windowStart: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ["message", "like", "superlike", "boost", "media_upload"],
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    identifier: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    contentHash: {
      type: String,
    },
    lastAction: {
      type: Date,
      required: true,
      default: Date.now,
    },
    actionCount: {
      type: Number,
      required: true,
      default: 1,
    },
    windowStart: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
RateLimitSchema.index({ userId: 1, resourceType: 1 });
RateLimitSchema.index({ resourceType: 1, expiresAt: 1 });
RateLimitSchema.index({ identifier: 1, expiresAt: 1 });

// Pre-save middleware to set expiration time
RateLimitSchema.pre('save', function (next) {
  if (this.isNew) {
    // Set expiration time based on resource type
    const now = new Date();
    switch (this.resourceType) {
      case 'message':
        // Messages rate limits expire after 1 hour
        this.expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case 'like':
      case 'superlike':
        // Like rate limits reset daily
        this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'boost':
        // Boost rate limits reset daily
        this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'media_upload':
        // Media upload limits reset hourly
        this.expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      default:
        // Default to 1 hour
        this.expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    }
  }
  next();
});

const RateLimit = mongoose.models.RateLimit || mongoose.model<IRateLimit>("RateLimit", RateLimitSchema);

export default RateLimit;