import * as crypto from 'crypto';

/**
 * Utilitário de criptografia para dados sensíveis
 * 
 * IMPORTANTE: Usa criptografia determinística (mesmo input = mesmo output)
 * para permitir buscas e constraints UNIQUE no banco de dados.
 * 
 * NOTA DE SEGURANÇA: Criptografia determinística permite verificações de 
 * unicidade sem descriptografar todos os registros, mas oferece menos 
 * proteção contra análise de padrões. Adequado para placas de veículos.
 */
export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly IV_LENGTH = 16; // Para AES, IV é sempre 16 bytes
  private static readonly KEY_LENGTH = 32; // AES-256 requer 32 bytes (256 bits)

  /**
   * Obter chave de criptografia da variável de ambiente
   * A chave deve ter exatamente 32 bytes (256 bits) para AES-256
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
      throw new Error(
        'ENCRYPTION_KEY não configurada. Defina uma chave de 32 bytes (64 caracteres hex) ' +
        'ou use SHA256 de uma string secreta.'
      );
    }

    // Se a chave for hex, converter para Buffer
    if (/^[0-9a-fA-F]{64}$/.test(key)) {
      return Buffer.from(key, 'hex');
    }

    // Caso contrário, usar SHA256 da chave como seed para derivar chave de 32 bytes
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Criptografar texto de forma determinística
   * Para campos que precisam ser pesquisáveis (unique constraints)
   */
  static encrypt(text: string): string {
    if (!text) {
      return text;
    }

    try {
      const key = this.getEncryptionKey();
      
      // Para criptografia determinística, usar um IV fixo derivado do texto
      // Isso permite que o mesmo texto sempre gere a mesma criptografia
      const iv = crypto
        .createHash('sha256')
        .update(text)
        .digest()
        .slice(0, this.IV_LENGTH);

      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Retornar IV + texto criptografado em formato base64 para armazenamento
      const combined = iv.toString('hex') + encrypted;
      return Buffer.from(combined, 'hex').toString('base64');
    } catch (error) {
      throw new Error(`Erro ao criptografar: ${error.message}`);
    }
  }

  /**
   * Descriptografar texto
   */
  static decrypt(encryptedText: string): string {
    if (!encryptedText) {
      return encryptedText;
    }

    try {
      const key = this.getEncryptionKey();
      
      // Decodificar base64
      const combined = Buffer.from(encryptedText, 'base64').toString('hex');
      
      // Extrair IV (primeiros 32 caracteres hex = 16 bytes)
      const iv = Buffer.from(combined.slice(0, this.IV_LENGTH * 2), 'hex');
      
      // Extrair texto criptografado
      const encrypted = combined.slice(this.IV_LENGTH * 2);

      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Erro ao descriptografar: ${error.message}`);
    }
  }

  /**
   * Verificar se a chave está configurada
   */
  static isKeyConfigured(): boolean {
    try {
      return !!process.env.ENCRYPTION_KEY;
    } catch {
      return false;
    }
  }
}

