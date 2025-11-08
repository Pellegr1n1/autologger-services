import * as crypto from 'crypto';
import { EncryptionUtil } from './encryption.util';

describe('EncryptionUtil', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Reset environment variable
    delete process.env.ENCRYPTION_KEY;
  });

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    }
  });

  describe('getEncryptionKey', () => {
    it('should throw error when ENCRYPTION_KEY is not set', () => {
      expect(() => {
        EncryptionUtil.encrypt('test');
      }).toThrow('ENCRYPTION_KEY não configurada');
    });

    it('should use hex key when provided as 64 character hex string', () => {
      const hexKey = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = hexKey;

      const result = EncryptionUtil.encrypt('test');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should use SHA256 hash when key is not hex', () => {
      const stringKey = 'my-secret-key';
      process.env.ENCRYPTION_KEY = stringKey;

      const result = EncryptionUtil.encrypt('test');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('encrypt', () => {
    beforeEach(() => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    });

    it('should encrypt text deterministically', () => {
      const text = 'test-plate-123';
      const encrypted1 = EncryptionUtil.encrypt(text);
      const encrypted2 = EncryptionUtil.encrypt(text);

      expect(encrypted1).toBe(encrypted2);
      expect(encrypted1).not.toBe(text);
    });

    it('should return empty string when text is empty', () => {
      const result = EncryptionUtil.encrypt('');
      expect(result).toBe('');
    });

    it('should return null when text is null', () => {
      const result = EncryptionUtil.encrypt(null as any);
      expect(result).toBeNull();
    });

    it('should encrypt different texts to different values', () => {
      const text1 = 'plate-123';
      const text2 = 'plate-456';

      const encrypted1 = EncryptionUtil.encrypt(text1);
      const encrypted2 = EncryptionUtil.encrypt(text2);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should produce base64 encoded output', () => {
      const text = 'test-plate';
      const encrypted = EncryptionUtil.encrypt(text);

      // Should be valid base64
      expect(() => {
        Buffer.from(encrypted, 'base64');
      }).not.toThrow();
    });

    it('should handle special characters', () => {
      const text = 'ABC-1234';
      const encrypted = EncryptionUtil.encrypt(text);
      const decrypted = EncryptionUtil.decrypt(encrypted);

      expect(decrypted).toBe(text);
    });

    it('should handle long text', () => {
      const text = 'a'.repeat(1000);
      const encrypted = EncryptionUtil.encrypt(text);
      const decrypted = EncryptionUtil.decrypt(encrypted);

      expect(decrypted).toBe(text);
    });
  });

  describe('decrypt', () => {
    beforeEach(() => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    });

    it('should decrypt encrypted text correctly', () => {
      const originalText = 'test-plate-123';
      const encrypted = EncryptionUtil.encrypt(originalText);
      const decrypted = EncryptionUtil.decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it('should return empty string when encrypted text is empty', () => {
      const result = EncryptionUtil.decrypt('');
      expect(result).toBe('');
    });

    it('should return null when encrypted text is null', () => {
      const result = EncryptionUtil.decrypt(null as any);
      expect(result).toBeNull();
    });

    it('should decrypt multiple encrypted texts correctly', () => {
      const texts = ['plate-1', 'plate-2', 'plate-3'];

      texts.forEach((text) => {
        const encrypted = EncryptionUtil.encrypt(text);
        const decrypted = EncryptionUtil.decrypt(encrypted);
        expect(decrypted).toBe(text);
      });
    });

    it('should throw error when decrypting invalid encrypted text', () => {
      const invalidEncrypted = 'invalid-encrypted-text';

      expect(() => {
        EncryptionUtil.decrypt(invalidEncrypted);
      }).toThrow();
    });

    it('should throw error when encrypted text has wrong format', () => {
      const invalidBase64 = 'not-valid-base64!!!';

      expect(() => {
        EncryptionUtil.decrypt(invalidBase64);
      }).toThrow();
    });
  });

  describe('isKeyConfigured', () => {
    it('should return true when ENCRYPTION_KEY is set', () => {
      process.env.ENCRYPTION_KEY = 'test-key';
      expect(EncryptionUtil.isKeyConfigured()).toBe(true);
    });

    it('should return false when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(EncryptionUtil.isKeyConfigured()).toBe(false);
    });

    it('should return false when ENCRYPTION_KEY is empty string', () => {
      process.env.ENCRYPTION_KEY = '';
      expect(EncryptionUtil.isKeyConfigured()).toBe(false);
    });
  });

  describe('encrypt and decrypt roundtrip', () => {
    beforeEach(() => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    });

    it('should encrypt and decrypt various plate formats', () => {
      const plates = [
        'ABC-1234',
        'XYZ-5678',
        'DEF-9012',
        'GHI-3456',
      ];

      plates.forEach((plate) => {
        const encrypted = EncryptionUtil.encrypt(plate);
        const decrypted = EncryptionUtil.decrypt(encrypted);
        expect(decrypted).toBe(plate);
      });
    });

    it('should maintain determinism across multiple encryptions', () => {
      const text = 'test-plate';
      const encrypted1 = EncryptionUtil.encrypt(text);
      const encrypted2 = EncryptionUtil.encrypt(text);
      const encrypted3 = EncryptionUtil.encrypt(text);

      expect(encrypted1).toBe(encrypted2);
      expect(encrypted2).toBe(encrypted3);

      // All should decrypt to same value
      expect(EncryptionUtil.decrypt(encrypted1)).toBe(text);
      expect(EncryptionUtil.decrypt(encrypted2)).toBe(text);
      expect(EncryptionUtil.decrypt(encrypted3)).toBe(text);
    });
  });

  describe('error handling', () => {
    it('should throw error with message when encryption fails', () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);

      // Mock crypto to throw error
      const originalCreateCipheriv = crypto.createCipheriv;
      jest.spyOn(crypto, 'createCipheriv').mockImplementation(() => {
        throw new Error('Crypto error');
      });

      expect(() => {
        EncryptionUtil.encrypt('test');
      }).toThrow('Erro ao criptografar: Crypto error');

      jest.restoreAllMocks();
    });

    it('should throw error with message when decryption fails', () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);

      // Mock crypto to throw error
      const originalCreateDecipheriv = crypto.createDecipheriv;
      jest.spyOn(crypto, 'createDecipheriv').mockImplementation(() => {
        throw new Error('Decrypto error');
      });

      const encrypted = EncryptionUtil.encrypt('test');

      // Reset mock to allow encryption
      jest.restoreAllMocks();

      // Mock for decryption
      jest.spyOn(crypto, 'createDecipheriv').mockImplementation(() => {
        throw new Error('Decrypto error');
      });

      expect(() => {
        EncryptionUtil.decrypt(encrypted);
      }).toThrow('Erro ao descriptografar: Decrypto error');

      jest.restoreAllMocks();
    });
  });
});

