import mongoose, { Schema, Document } from 'mongoose';

export interface IProfileView extends Document {
  userId: string;      // The user who viewed the profile
  targetUserId: string; // The user whose profile was viewed
  createdAt: Date;
}

const ProfileViewSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  targetUserId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

// Compound index for efficient stats queries
ProfileViewSchema.index({ targetUserId: 1, createdAt: 1 });

// Unique compound index to prevent multiple views from same user per day
ProfileViewSchema.index(
  { userId: 1, targetUserId: 1, createdAt: 1 }, 
  { 
    unique: true,
    partialFilterExpression: {
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }
  }
);

export default mongoose.models.ProfileView || mongoose.model<IProfileView>('ProfileView', ProfileViewSchema);