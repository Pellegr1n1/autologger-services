import { EncryptedTransformer } from './encrypted-column.decorator';
import { EncryptionUtil } from '../utils/encryption.util';

jest.mock('../utils/encryption.util');

describe('EncryptedTransformer', () => {
  let transformer: EncryptedTransformer;

  beforeEach(() => {
    transformer = new EncryptedTransformer();
    jest.clearAllMocks();
  });

  describe('to', () => {
    it('should encrypt value before saving to database', () => {
      const value = 'ABC-1234';
      const encryptedValue = 'encrypted-abc-1234';

      (EncryptionUtil.encrypt as jest.Mock).mockReturnValue(encryptedValue);

      const result = transformer.to(value);

      expect(EncryptionUtil.encrypt).toHaveBeenCalledWith(value);
      expect(result).toBe(encryptedValue);
    });

    it('should return null when value is null', () => {
      const result = transformer.to(null);

      expect(EncryptionUtil.encrypt).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when value is undefined', () => {
      const result = transformer.to(undefined);

      expect(EncryptionUtil.encrypt).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should encrypt empty string', () => {
      const value = '';
      const encryptedValue = 'encrypted-empty';

      (EncryptionUtil.encrypt as jest.Mock).mockReturnValue(encryptedValue);

      const result = transformer.to(value);

      expect(EncryptionUtil.encrypt).toHaveBeenCalledWith(value);
      expect(result).toBe(encryptedValue);
    });
  });

  describe('from', () => {
    it('should decrypt value when reading from database', () => {
      const encryptedValue = 'encrypted-abc-1234';
      const decryptedValue = 'ABC-1234';

      (EncryptionUtil.decrypt as jest.Mock).mockReturnValue(decryptedValue);

      const result = transformer.from(encryptedValue);

      expect(EncryptionUtil.decrypt).toHaveBeenCalledWith(encryptedValue);
      expect(result).toBe(decryptedValue);
    });

    it('should return null when value is null', () => {
      const result = transformer.from(null);

      expect(EncryptionUtil.decrypt).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when value is undefined', () => {
      const result = transformer.from(undefined);

      expect(EncryptionUtil.decrypt).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return original value when decryption fails', () => {
      const encryptedValue = 'invalid-encrypted';
      const error = new Error('Decryption failed');

      (EncryptionUtil.decrypt as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = transformer.from(encryptedValue);

      expect(EncryptionUtil.decrypt).toHaveBeenCalledWith(encryptedValue);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Erro ao descriptografar campo. Retornando valor original:',
        error.message,
      );
      expect(result).toBe(encryptedValue);

      consoleWarnSpy.mockRestore();
    });

    it('should handle decryption errors gracefully', () => {
      const encryptedValue = 'corrupted-data';
      const error = new Error('Invalid encrypted format');

      (EncryptionUtil.decrypt as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = transformer.from(encryptedValue);

      expect(result).toBe(encryptedValue);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('roundtrip', () => {
    it('should encrypt and decrypt correctly', () => {
      const originalValue = 'ABC-1234';
      const encryptedValue = 'encrypted-abc-1234';

      (EncryptionUtil.encrypt as jest.Mock).mockReturnValue(encryptedValue);
      (EncryptionUtil.decrypt as jest.Mock).mockReturnValue(originalValue);

      const encrypted = transformer.to(originalValue);
      const decrypted = transformer.from(encrypted);

      expect(encrypted).toBe(encryptedValue);
      expect(decrypted).toBe(originalValue);
    });
  });
});
