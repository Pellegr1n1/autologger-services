/**
 * Utilitário para sanitização de strings para prevenir XSS
 * Remove ou escapa caracteres perigosos em strings que serão inseridas em HTML
 */

/**
 * Escapa caracteres HTML especiais para prevenir XSS
 * @param input - String a ser sanitizada
 * @returns String com caracteres HTML escapados
 */
export function escapeHtml(input: string | null | undefined): string {
  if (!input) {
    return '';
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return input.replaceAll(/[&<>"']/g, (char) => map[char]);
}

/**
 * Sanitiza um nome de usuário para uso seguro em templates HTML
 * Remove caracteres perigosos e limita o tamanho
 * @param userName - Nome do usuário a ser sanitizado
 * @returns Nome sanitizado
 */
export function sanitizeUserName(userName: string | null | undefined): string {
  if (!userName) {
    return 'Usuário';
  }

  // Remove caracteres HTML perigosos e limita tamanho
  const sanitized = escapeHtml(userName.trim());
  
  // Limita a 100 caracteres para evitar problemas de layout
  return sanitized.length > 100 ? sanitized.substring(0, 100) + '...' : sanitized;
}

