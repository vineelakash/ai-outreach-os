import crypto from 'crypto';

/**
 * Derives a consistent 32-byte Buffer from the environment ENCRYPTION_KEY.
 * Falls back to a deterministic SHA-256 hash if the key is not 64 hex chars.
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY || 'ai_outreach_os_default_fallback_secret_key_32_bytes_long_!!';
  if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: "iv:authTag:ciphertext" (all in hex)
 */
export function encrypt(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload in "iv:authTag:ciphertext" format.
 */
export function decrypt(cipherPayload: string): string {
  if (!cipherPayload) return '';
  const parts = cipherPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format. Expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks a sensitive API key or password for safe frontend presentation.
 * Example: "sk-proj-1234567890abcdef" -> "sk-p...cdef"
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return '••••••••';
  if (secret.length <= 8) return '••••••••';
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}••••••••${suffix}`;
}
