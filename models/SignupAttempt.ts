import mongoose, { Schema, Document } from 'mongoose';

export interface ISignupAttempt extends Document {
  ip: string;
  createdAt: Date;
}

const SignupAttemptSchema = new Schema<ISignupAttempt>({
  ip: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // expires after 1 hour
});

export default mongoose.models.SignupAttempt || mongoose.model<ISignupAttempt>('SignupAttempt', SignupAttemptSchema);
