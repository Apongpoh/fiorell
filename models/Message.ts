import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  match: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'location';
  media?: {
    url: string;
    key: string;
    mimeType: string;
    size: number;
  };
  readStatus: {
    isRead: boolean;
    readAt?: Date;
  };
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  match: {
    type: Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function() {
      return this.type === 'text';
    },
    maxlength: [1000, 'Message cannot exceed 1000 characters'],
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'location'],
    default: 'text'
  },
  media: {
    url: { type: String },
    key: { type: String },
    mimeType: { type: String },
    size: { type: Number }
  },
  readStatus: {
    isRead: { type: Boolean, default: false },
    readAt: { type: Date }
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
MessageSchema.index({ match: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ recipient: 1, 'readStatus.isRead': 1 });
MessageSchema.index({ isDeleted: 1 });

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);