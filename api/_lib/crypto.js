// ============================================================
// Crypto Utility — AES-256-GCM
// Used by API routes to encrypt/decrypt PII
// ============================================================
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY env var is not set');
  // Key should be 32 bytes (64 hex chars) for AES-256
  if (key.length === 64) return Buffer.from(key, 'hex');
  // Or use SHA-256 hash of the key string
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a plaintext string → base64 encoded string
 * Format: base64(iv + authTag + ciphertext)
 */
export function encrypt(plaintext) {
  if (!plaintext) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: iv (16) + authTag (16) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt a base64 encoded string → plaintext
 */
export function decrypt(encoded) {
  if (!encoded) return '';
  const key = getKey();
  const combined = Buffer.from(encoded, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Encrypt PII fields on a booking object
 */
export function encryptBookingPII(booking) {
  return {
    ...booking,
    phone_encrypted: booking.phone_encrypted ? encrypt(booking.phone_encrypted) : '',
    email_encrypted: booking.email_encrypted ? encrypt(booking.email_encrypted) : '',
    dob_encrypted: booking.dob_encrypted ? encrypt(booking.dob_encrypted) : '',
  };
}

/**
 * Decrypt PII fields on a booking object
 */
export function decryptBookingPII(booking) {
  return {
    ...booking,
    phone_encrypted: booking.phone_encrypted ? decrypt(booking.phone_encrypted) : '',
    email_encrypted: booking.email_encrypted ? decrypt(booking.email_encrypted) : '',
    dob_encrypted: booking.dob_encrypted ? decrypt(booking.dob_encrypted) : '',
  };
}