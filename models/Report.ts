import mongoose, { Schema, Document } from "mongoose";

export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId;
  reported: mongoose.Types.ObjectId;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reported: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

ReportSchema.index({ reporter: 1, reported: 1 });

export default mongoose.models.Report ||
  mongoose.model<IReport>("Report", ReportSchema);
