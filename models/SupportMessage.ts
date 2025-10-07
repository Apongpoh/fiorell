import mongoose, { Document, Schema } from "mongoose";

export interface ISupportMessage extends Document {
  ticketId: mongoose.Types.ObjectId;
  content: string;
  isFromSupport: boolean;
  supportAgentId?: mongoose.Types.ObjectId;
  supportAgentName?: string;
  readByUser: boolean;
  readBySupport: boolean;
  isAutoResponse?: boolean;
  attachments?: Array<{
    url: string;
    filename: string;
    size: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: "SupportTicket",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isFromSupport: {
      type: Boolean,
      required: true,
      default: false,
    },
    supportAgentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    supportAgentName: {
      type: String,
      required: false,
      trim: true,
    },
    isAutoResponse: {
      type: Boolean,
      default: false,
    },
    readByUser: {
      type: Boolean,
      default: false,
      index: true,
    },
    readBySupport: {
      type: Boolean,
      default: false,
      index: true,
    },
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

// Index for efficient querying
SupportMessageSchema.index({ ticketId: 1, createdAt: 1 });
SupportMessageSchema.index({ createdAt: -1 });

export default mongoose.models.SupportMessage ||
  mongoose.model<ISupportMessage>("SupportMessage", SupportMessageSchema);
