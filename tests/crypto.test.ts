import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, maskSecret } from '@/lib/security/crypto';

describe('AES-256-GCM Crypto Service', () => {
  it('should encrypt and decrypt plaintext accurately', () => {
    const secret = 'super-secret-smtp-password-1234!';
    const encrypted = encrypt(secret);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(secret);
    expect(encrypted.split(':').length).toBe(3); // iv:tag:ciphertext

    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(secret);
  });

  it('should fail decryption if ciphertext or tag is tampered with', () => {
    const secret = 'my-api-key';
    const encrypted = encrypt(secret);
    const parts = encrypted.split(':');

    // Tamper with ciphertext
    const tampered = `${parts[0]}:${parts[1]}:deadbeef`;

    expect(() => decrypt(tampered)).toThrow();
  });

  it('should mask sensitive keys correctly for UI display', () => {
    const key = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456';
    const masked = maskSecret(key);

    expect(masked).toBe('sk-a••••••••3456');
    expect(masked).not.toContain('abcdef');
  });
});
