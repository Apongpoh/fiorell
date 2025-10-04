// End-to-end encryption utilities for messages
// Uses Web Crypto API for secure encryption/decryption

export interface EncryptedMessage {
  encryptedContent: string;
  iv: string;
  keyId?: string; // For key rotation in the future
}

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface StoredKeyPair {
  publicKey: string; // Base64 encoded
  privateKey: string; // Base64 encoded
}

// Generate a new key pair for asymmetric encryption
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );

  return keyPair as KeyPair;
}

// Export key pair to base64 strings for storage
export async function exportKeyPair(keyPair: KeyPair): Promise<StoredKeyPair> {
  const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    privateKey: arrayBufferToBase64(privateKeyBuffer),
  };
}

// Import key pair from base64 strings
export async function importKeyPair(storedKeyPair: StoredKeyPair): Promise<KeyPair> {
  const publicKeyBuffer = base64ToArrayBuffer(storedKeyPair.publicKey);
  const privateKeyBuffer = base64ToArrayBuffer(storedKeyPair.privateKey);

  const publicKey = await window.crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );

  const privateKey = await window.crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );

  return { publicKey, privateKey };
}

// Import just public key from base64 string
export async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
  
  return await window.crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

// Generate a symmetric key for AES encryption
export async function generateSymmetricKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt message content using hybrid encryption (RSA + AES)
export async function encryptMessage(
  content: string,
  recipientPublicKey: CryptoKey
): Promise<EncryptedMessage> {
  // Generate a symmetric key for this message
  const symmetricKey = await generateSymmetricKey();
  
  // Generate IV for AES
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the content with AES
  const contentBuffer = new TextEncoder().encode(content);
  const encryptedContentBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    symmetricKey,
    contentBuffer
  );

  // Export the symmetric key
  const exportedSymmetricKey = await window.crypto.subtle.exportKey("raw", symmetricKey);
  
  // Encrypt the symmetric key with recipient's public key
  const encryptedSymmetricKey = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    recipientPublicKey,
    exportedSymmetricKey
  );

  // Combine encrypted symmetric key + encrypted content
  const combinedBuffer = new Uint8Array(
    encryptedSymmetricKey.byteLength + encryptedContentBuffer.byteLength
  );
  combinedBuffer.set(new Uint8Array(encryptedSymmetricKey), 0);
  combinedBuffer.set(new Uint8Array(encryptedContentBuffer), encryptedSymmetricKey.byteLength);

  return {
    encryptedContent: arrayBufferToBase64(combinedBuffer.buffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

// Decrypt message content using hybrid decryption
export async function decryptMessage(
  encryptedMessage: EncryptedMessage,
  privateKey: CryptoKey
): Promise<string> {
  const combinedBuffer = base64ToArrayBuffer(encryptedMessage.encryptedContent);
  const iv = base64ToArrayBuffer(encryptedMessage.iv);

  // Split the combined buffer (first 256 bytes are encrypted symmetric key)
  const encryptedSymmetricKeySize = 256; // RSA-2048 encrypted output size
  const encryptedSymmetricKey = combinedBuffer.slice(0, encryptedSymmetricKeySize);
  const encryptedContent = combinedBuffer.slice(encryptedSymmetricKeySize);

  // Decrypt the symmetric key with private key
  const symmetricKeyBuffer = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    encryptedSymmetricKey
  );

  // Import the symmetric key
  const symmetricKey = await window.crypto.subtle.importKey(
    "raw",
    symmetricKeyBuffer,
    {
      name: "AES-GCM",
    },
    false,
    ["decrypt"]
  );

  // Decrypt the content with the symmetric key
  const decryptedContentBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    symmetricKey,
    encryptedContent
  );

  return new TextDecoder().decode(decryptedContentBuffer);
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Key management functions
export function storeKeyPair(userId: string, keyPair: StoredKeyPair): void {
  localStorage.setItem(`fiorell_keypair_${userId}`, JSON.stringify(keyPair));
}

export function getStoredKeyPair(userId: string): StoredKeyPair | null {
  const stored = localStorage.getItem(`fiorell_keypair_${userId}`);
  return stored ? JSON.parse(stored) : null;
}

export function storePublicKey(userId: string, publicKey: string): void {
  localStorage.setItem(`fiorell_pubkey_${userId}`, publicKey);
}

export function getStoredPublicKey(userId: string): string | null {
  return localStorage.getItem(`fiorell_pubkey_${userId}`);
}

// Initialize encryption for a user (generates keys if not exists)
export async function initializeEncryption(userId: string): Promise<KeyPair> {
  let storedKeyPair = getStoredKeyPair(userId);
  
  if (!storedKeyPair) {
    // Generate new key pair
    const keyPair = await generateKeyPair();
    storedKeyPair = await exportKeyPair(keyPair);
    storeKeyPair(userId, storedKeyPair);
    
    // Also upload public key to server for other users
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      await fetch("/api/user/public-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          publicKey: storedKeyPair.publicKey,
        }),
      });
    } catch (error) {
      console.warn("Failed to upload public key to server:", error);
    }
    
    return keyPair;
  }
  
  return await importKeyPair(storedKeyPair);
}

// Get recipient's public key (from cache or server)
export async function getRecipientPublicKey(recipientId: string): Promise<CryptoKey> {
  // Try cache first
  let publicKeyBase64 = getStoredPublicKey(recipientId);
  
  if (!publicKeyBase64) {
    // Fetch from server
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      const response = await fetch(`/api/user/public-key/${recipientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        publicKeyBase64 = data.publicKey;
        
        // Cache it
        if (publicKeyBase64) {
          storePublicKey(recipientId, publicKeyBase64);
        }
      }
    } catch (error) {
      console.error("Failed to fetch recipient public key:", error);
      throw new Error("Unable to encrypt message: recipient public key not available");
    }
  }
  
  if (!publicKeyBase64) {
    throw new Error("Recipient public key not found");
  }
  
  return await importPublicKey(publicKeyBase64);
}