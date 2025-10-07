import mongoose, { Document, Schema } from "mongoose";

export interface IProfileBoost extends Document {
  userId: mongoose.Types.ObjectId;
  type: "daily" | "weekly" | "premium";
  duration: number; // in minutes
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  cost: number; // for tracking purposes
  createdAt: Date;
  updatedAt: Date;
}

const ProfileBoostSchema = new Schema<IProfileBoost>(
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
    duration: {
      type: Number,
      required: true,
      min: 30, // minimum 30 minutes
      max: 1440, // maximum 24 hours
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    cost: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
ProfileBoostSchema.index({ userId: 1, isActive: 1, endTime: 1 });
ProfileBoostSchema.index({ endTime: 1, isActive: 1 }); // for cleanup

// Virtual to check if boost is currently active
ProfileBoostSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  return this.isActive && now >= this.startTime && now <= this.endTime;
});

export default mongoose.models.ProfileBoost ||
  mongoose.model<IProfileBoost>("ProfileBoost", ProfileBoostSchema);
