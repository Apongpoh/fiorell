import mongoose, { Document, Schema } from "mongoose";

export interface IMatch extends Document {
  user1: mongoose.Types.ObjectId;
  user2: mongoose.Types.ObjectId;
  status: "pending" | "matched" | "unmatched";
  initiatedBy: mongoose.Types.ObjectId;
  matchedAt?: Date;
  lastMessageAt?: Date;
  isActive: boolean;
  disappearingMessageDuration?: number;
  // Pre-match message support
  hasPreMatchMessage?: boolean;
  preMatchMessageSender?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
    user1: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user2: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "matched", "unmatched"],
      default: "pending",
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    matchedAt: {
      type: Date,
    },
    lastMessageAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    disappearingMessageDuration: {
      type: Number,
      default: null,
    },
    // Pre-match message support
    hasPreMatchMessage: {
      type: Boolean,
      default: false,
    },
    preMatchMessageSender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique matches between users
MatchSchema.index({ user1: 1, user2: 1 }, { unique: true });

// Indexes for better query performance
MatchSchema.index({ user1: 1, status: 1 });
MatchSchema.index({ user2: 1, status: 1 });
MatchSchema.index({ status: 1, matchedAt: -1 });
MatchSchema.index({ isActive: 1 });

// Pre-save middleware to ensure user1 < user2 for consistency
MatchSchema.pre("save", function (next) {
  if (this.user1.toString() > this.user2.toString()) {
    [this.user1, this.user2] = [this.user2, this.user1];
  }
  next();
});

export default mongoose.models.Match ||
  mongoose.model<IMatch>("Match", MatchSchema);
