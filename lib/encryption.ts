import crypto from 'crypto';

// Key management: In production, use a secure key store (e.g., AWS KMS, HashiCorp Vault, or similar)
// For now, keys are loaded from environment variables
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || '';
const IV_LENGTH = 12; // AES-GCM recommended IV length

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('MESSAGE_ENCRYPTION_KEY must be set to a 32-byte base64 string');
}

export function encryptMessage(plainText: string): { encryptedContent: string; iv: string; keyId: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY, 'base64');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encryptedContent: Buffer.concat([encrypted, tag]).toString('base64'),
    iv: iv.toString('base64'),
    keyId: 'default', // In production, rotate keys and set keyId accordingly
  };
}

export function decryptMessage(encryptedContent: string, iv: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, 'base64');
  const ivBuf = Buffer.from(iv, 'base64');
  const data = Buffer.from(encryptedContent, 'base64');
  const tag = data.slice(data.length - 16);
  const encrypted = data.slice(0, data.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuf);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
