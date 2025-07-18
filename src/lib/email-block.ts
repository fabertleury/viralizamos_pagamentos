import { db } from './prisma';

/**
 * Lista de domínios bloqueados
 */
const BLOCKED_DOMAINS = [
  'tempmail.com',
  'temp-mail.org',
  'disposablemail.com',
  'throwawaymail.com'
];

/**
 * Verifica se um email está bloqueado
 * @param email Email para verificar
 * @returns true se o email estiver bloqueado, false caso contrário
 */
export async function isEmailBlocked(email: string): Promise<boolean> {
  try {
    // Normalizar o email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verificar se o domínio está na lista de bloqueados
    const domain = normalizedEmail.split('@')[1];
    if (BLOCKED_DOMAINS.includes(domain)) {
      return true;
    }
    
    // Verificar se o email está na lista de bloqueados no banco
    const blockedEmail = await db.blockedEmail.findUnique({
      where: { email: normalizedEmail }
    });
    
    return !!blockedEmail;
  } catch (error) {
    console.error('Erro ao verificar email bloqueado:', error);
    // Em caso de erro, permitir o email para evitar falsos positivos
    return false;
  }
} 