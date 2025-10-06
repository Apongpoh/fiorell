import User from '@/models/User';
import { IUser } from '@/models/User';
import mongoose from 'mongoose';

export async function getUserById(userId: string): Promise<IUser | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  return User.findById(userId);
}

export async function updateUser2FA(userId: string, twoFAData: Partial<IUser['twoFA']>): Promise<IUser | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  
  // Use dot notation to update specific fields without replacing the entire twoFA object
  const updateFields: Record<string, any> = {};
  if (twoFAData) {
    if (twoFAData.secret !== undefined) updateFields['twoFA.secret'] = twoFAData.secret;
    if (twoFAData.enabled !== undefined) updateFields['twoFA.enabled'] = twoFAData.enabled;
    if (twoFAData.tempSecret !== undefined) updateFields['twoFA.tempSecret'] = twoFAData.tempSecret;
    if (twoFAData.verified !== undefined) updateFields['twoFA.verified'] = twoFAData.verified;
    if (twoFAData.recoveryCodes !== undefined) updateFields['twoFA.recoveryCodes'] = twoFAData.recoveryCodes;
    if (twoFAData.enabledAt !== undefined) updateFields['twoFA.enabledAt'] = twoFAData.enabledAt;
    if (twoFAData.disabledAt !== undefined) updateFields['twoFA.disabledAt'] = twoFAData.disabledAt;
  }
  
  return User.findByIdAndUpdate(userId, { $set: updateFields }, { new: true });
}
