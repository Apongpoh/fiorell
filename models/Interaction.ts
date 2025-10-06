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

// Unique compound index to prevent multiple interactions of same type between same users
InteractionSchema.index(
  { userId: 1, targetUserId: 1, action: 1 },
  { unique: true }
);

// Add pre-save middleware to prevent duplicate interactions
InteractionSchema.pre("save", async function (next) {
  if (this.isNew) {
    const existingInteraction = await mongoose.models.Interaction.findOne({
      userId: this.userId,
      targetUserId: this.targetUserId,
      action: this.action,
    });

    if (existingInteraction) {
      next(new Error("Interaction already exists between these users"));
    }
  }
  next();
});

export default mongoose.models.Interaction ||
  mongoose.model<IInteraction>("Interaction", InteractionSchema);
