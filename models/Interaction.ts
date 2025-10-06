import mongoose, { Schema, Document } from "mongoose";

export interface IInteraction extends Document {
  userId: string;
  targetUserId: string;
  action: "like" | "pass" | "super_like";
  createdAt: Date;
  isMatch: boolean; // Set to true when a mutual like/super_like occurs
}

const InteractionSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    targetUserId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ["like", "pass", "super_like"],
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
    isMatch: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true, // Adds updatedAt field which we'll use when a match occurs
  }
);

// Compound index for efficient stats queries
InteractionSchema.index({ userId: 1, action: 1, createdAt: 1 });
InteractionSchema.index({ userId: 1, isMatch: 1 });

// Index for daily interaction queries
InteractionSchema.index({ userId: 1, targetUserId: 1, action: 1, createdAt: 1 });

// Helper function to get start of day in UTC
function getStartOfDay(date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  return startOfDay;
}

// Helper function to get end of day in UTC
function getEndOfDay(date = new Date()) {
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return endOfDay;
}

// Add pre-save middleware to prevent duplicate daily interactions
InteractionSchema.pre("save", async function (next) {
  if (this.isNew) {
    const today = new Date();
    const startOfDay = getStartOfDay(today);
    const endOfDay = getEndOfDay(today);

    const existingTodayInteraction = await mongoose.models.Interaction.findOne({
      userId: this.userId,
      targetUserId: this.targetUserId,
      action: this.action,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (existingTodayInteraction) {
      const error = new Error(`You can only ${this.action} this user once per day`);
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

// Add static method to check daily interaction limit
InteractionSchema.statics.hasUserInteractedToday = async function(userId: string, targetUserId: string, action: string) {
  const today = new Date();
  const startOfDay = getStartOfDay(today);
  const endOfDay = getEndOfDay(today);

  const interaction = await this.findOne({
    userId,
    targetUserId,
    action,
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  return !!interaction;
};

export default mongoose.models.Interaction ||
  mongoose.model<IInteraction>("Interaction", InteractionSchema);
