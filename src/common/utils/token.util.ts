/**
 * Utilitário para geração de tokens seguros
 * Centraliza a lógica de geração de tokens criptograficamente seguros
 */
import * as crypto from 'node:crypto';

/**
 * Gera um token criptograficamente seguro
 * @param length - Tamanho do token em bytes (padrão: 32 bytes = 64 caracteres hex)
 * @returns Token hexadecimal seguro
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

