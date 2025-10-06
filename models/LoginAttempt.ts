import mongoose, { Schema, Document } from "mongoose";

export interface ILoginAttempt extends Document {
  ip: string;
  email: string;
  createdAt: Date;
}

const LoginAttemptSchema = new Schema<ILoginAttempt>({
  ip: { type: String, required: true, index: true },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 900 }, // expires after 15 minutes
});

export default mongoose.models.LoginAttempt ||
  mongoose.model<ILoginAttempt>("LoginAttempt", LoginAttemptSchema);
