import mongoose, { Schema, Document } from "mongoose";

export interface IEmailVerification extends Document {
  userId: string;
  email: string;
  code: string;
  createdAt: Date;
  verified: boolean;
}

const EmailVerificationSchema = new Schema<IEmailVerification>({
  userId: { type: String, required: true, index: true },
  email: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // expires after 24 hours
  verified: { type: Boolean, default: false },
});

export default mongoose.models.EmailVerification ||
  mongoose.model<IEmailVerification>(
    "EmailVerification",
    EmailVerificationSchema
  );
