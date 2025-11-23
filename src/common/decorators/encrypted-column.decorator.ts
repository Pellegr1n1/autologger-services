import { ValueTransformer } from 'typeorm';
import { EncryptionUtil } from '../utils/encryption.util';

/**
 * Transformer para criptografar/descriptografar campos automaticamente
 * Usado com TypeORM @Column({ transformer: { ... } })
 */
export class EncryptedTransformer implements ValueTransformer {
  /**
   * Criptografar valor antes de salvar no banco
   */
  to(value: string | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    return EncryptionUtil.encrypt(value);
  }

  /**
   * Descriptografar valor ao ler do banco
   */
  from(value: string | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    try {
      return EncryptionUtil.decrypt(value);
    } catch (error) {
      console.warn(
        'Erro ao descriptografar campo. Retornando valor original:',
        error.message,
      );
      return value;
    }
  }
}
