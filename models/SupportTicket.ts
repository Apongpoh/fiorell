import mongoose, { Document, Schema } from "mongoose";

export interface ISupportTicket extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  message: string;
  type: "chat" | "email";
  priority: "low" | "medium" | "high";
  status: "open" | "closed" | "pending" | "in-progress";
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    type: {
      type: String,
      enum: ["chat", "email"],
      default: "email",
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "closed", "pending", "in-progress"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

SupportTicketSchema.index({ createdAt: -1 });

export default mongoose.models.SupportTicket ||
  mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);
