/**
 * Utilitário para validação de senhas
 * Centraliza a lógica de validação de força de senha para evitar duplicação
 */

/**
 * Valida se uma senha atende aos requisitos mínimos de segurança
 * @param password - Senha a ser validada
 * @returns true se a senha atende aos requisitos, false caso contrário
 */
export function isPasswordStrong(password: string): boolean {
  if (!password || password.length < 8) {
    return false;
  }

  // Deve conter pelo menos uma letra minúscula
  if (!/[a-z]/.test(password)) {
    return false;
  }

  // Deve conter pelo menos uma letra maiúscula
  if (!/[A-Z]/.test(password)) {
    return false;
  }

  // Deve conter pelo menos um número
  if (!/\d/.test(password)) {
    return false;
  }

  // Deve conter pelo menos um caractere especial
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return false;
  }

  return true;
}
