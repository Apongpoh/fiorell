import mongoose, { Schema, Document } from 'mongoose';

export interface IBlock extends Document {
  blocker: mongoose.Types.ObjectId;
  blocked: mongoose.Types.ObjectId;
  reason?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BlockSchema = new Schema<IBlock>({
  blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, maxlength: 300 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export default mongoose.models.Block || mongoose.model<IBlock>('Block', BlockSchema);
