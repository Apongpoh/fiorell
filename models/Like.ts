import mongoose, { Document, Schema } from 'mongoose';

export interface ILike extends Document {
  liker: mongoose.Types.ObjectId;
  liked: mongoose.Types.ObjectId;
  type: 'like' | 'super_like' | 'pass';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LikeSchema = new Schema<ILike>({
  liker: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  liked: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'super_like', 'pass'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure one action per user pair
LikeSchema.index({ liker: 1, liked: 1 }, { unique: true });

// Indexes for better query performance
LikeSchema.index({ liked: 1, type: 1, isActive: 1 });
LikeSchema.index({ liker: 1, type: 1, createdAt: -1 });

export default mongoose.models.Like || mongoose.model<ILike>('Like', LikeSchema);