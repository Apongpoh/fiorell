import crypto from "crypto";

// Key management: In production, use a secure key store (e.g., AWS KMS, HashiCorp Vault, or similar)
// For now, keys are loaded from environment variables.
const getEncryptionKey = (): Buffer => {
  const key = process.env.MESSAGE_ENCRYPTION_KEY || "";
  const base64Key = Buffer.from(key, "base64");

  if (base64Key.length === 32) {
    return base64Key;
  }

  if (Buffer.byteLength(key, "utf8") === 32) {
    return Buffer.from(key, "utf8");
  }

  throw new Error(
    "MESSAGE_ENCRYPTION_KEY must be a base64-encoded 32-byte key"
  );
};

const ENCRYPTION_KEY = getEncryptionKey();
const IV_LENGTH = 12; // AES-GCM recommended IV length

export function encryptMessage(plainText: string): {
  encryptedContent: string;
  iv: string;
  keyId: string;
} {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    encryptedContent: Buffer.concat([encrypted, tag]).toString("base64"),
    iv: iv.toString("base64"),
    keyId: "default", // In production, rotate keys and set keyId accordingly
  };
}

export function decryptMessage(encryptedContent: string, iv: string): string {
  const ivBuf = Buffer.from(iv, "base64");
  const data = Buffer.from(encryptedContent, "base64");
  const tag = data.slice(data.length - 16);
  const encrypted = data.slice(0, data.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, ivBuf);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
