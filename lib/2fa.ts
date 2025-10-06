import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { getUserById, updateUser2FA } from "./user";

// Generate a new 2FA secret and QR code URL
export async function generate2FASecret(email: string) {
  const secret = speakeasy.generateSecret({ name: `Fiorell (${email})` });
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);
  return { secret: secret.base32, qrCodeUrl };
}

// Save secret for user (in DB)
export async function save2FASecret(userId: string, secret: string) {
  await updateUser2FA(userId, { secret, enabled: false });
}

// Get user's 2FA secret
export async function get2FASecret(userId: string): Promise<string | null> {
  const user = await getUserById(userId);
  return user?.twoFA?.secret || null;
}

// Verify code
export function verify2FACode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({ secret, encoding: "base32", token: code });
}

// Enable 2FA for user
export async function enable2FAForUser(userId: string) {
  await updateUser2FA(userId, { enabled: true, enabledAt: new Date() });
}

// Disable 2FA for user
export async function disable2FAForUser(userId: string) {
  await updateUser2FA(userId, { enabled: false, secret: undefined, disabledAt: new Date() });
}

// Is 2FA enabled for user
export async function is2FAEnabledForUser(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  return !!user?.twoFA?.enabled;
}
