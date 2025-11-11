/**
 * Utilitário para validação de variáveis de ambiente
 * Garante que variáveis críticas estejam configuradas e validadas
 */

/**
 * Valida se uma variável de ambiente está definida
 * @param key - Nome da variável de ambiente
 * @param defaultValue - Valor padrão opcional (não recomendado para valores sensíveis)
 * @returns Valor da variável de ambiente ou valor padrão
 * @throws Error se a variável não estiver definida e não houver valor padrão
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  
  if (value === undefined) {
    throw new Error(`Variável de ambiente ${key} não está configurada`);
  }
  
  return value;
}

/**
 * Valida variáveis de ambiente críticas para OAuth do Google
 * @returns Objeto com as variáveis validadas
 * @throws Error se alguma variável crítica não estiver configurada (apenas em produção)
 */
export function validateGoogleOAuthEnvVars(): {
  clientId: string;
  clientSecret: string;
  frontendUrl: string;
} {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const frontendUrl = getEnvVar('FRONTEND_URL', 'http://localhost:5173');
  
  // Em desenvolvimento, permitir valores vazios (OAuth pode não estar configurado)
  const clientId = isDevelopment 
    ? (process.env.GOOGLE_CLIENT_ID || '')
    : getEnvVar('GOOGLE_CLIENT_ID');
  const clientSecret = isDevelopment
    ? (process.env.GOOGLE_CLIENT_SECRET || '')
    : getEnvVar('GOOGLE_CLIENT_SECRET');

  // Em produção, validar que estão configurados
  if (!isDevelopment && (!clientId || !clientSecret)) {
    throw new Error('GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devem ser configurados em produção');
  }

  return {
    clientId,
    clientSecret,
    frontendUrl,
  };
}

/**
 * Valida variáveis de ambiente críticas para o serviço de email
 * @returns Objeto com as variáveis validadas
 * @throws Error se alguma variável crítica não estiver configurada
 */
export function validateEmailEnvVars(): {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
} {
  // Em desenvolvimento, permitir valores padrão do Ethereal (para testes)
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const smtpHost = getEnvVar('SMTP_HOST', isDevelopment ? 'smtp.ethereal.email' : undefined);
  const smtpPort = parseInt(getEnvVar('SMTP_PORT', '587'), 10);
  const smtpUser = getEnvVar('SMTP_USER', isDevelopment ? 'default_user' : undefined);
  const smtpPass = getEnvVar('SMTP_PASS', isDevelopment ? 'default_pass' : undefined);
  const smtpFrom = getEnvVar('SMTP_FROM', 'noreply@autologger.com');

  // Em produção, validar que não são valores padrão inseguros
  if (!isDevelopment && (smtpUser === 'default_user' || smtpPass === 'default_pass')) {
    throw new Error('SMTP_USER e SMTP_PASS devem ser configurados com valores seguros em produção');
  }

  return {
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpFrom,
  };
}

