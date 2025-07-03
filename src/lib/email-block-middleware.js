/**
 * Middleware para verificar e bloquear emails na lista de bloqueio
 */

const { isEmailBlocked } = require('./blocked-emails');

/**
 * Middleware para verificar se um email está bloqueado
 * @param {Object} req - Requisição HTTP
 * @param {Object} res - Resposta HTTP
 * @param {Function} next - Função para continuar o fluxo
 * @returns {Object|void} - Retorna erro se o email estiver bloqueado ou continua o fluxo
 */
function checkBlockedEmail(req, res, next) {
  // Verificar se é uma requisição POST
  if (req.method !== 'POST') {
    return next();
  }
  
  // Verificar se temos um corpo de requisição
  if (!req.body) {
    return next();
  }
  
  // Extrair o email do corpo da requisição
  const email = req.body.customer_email || req.body.email;
  
  // Se não houver email, continuar o fluxo
  if (!email) {
    return next();
  }
  
  // Verificar se o email está bloqueado
  if (isEmailBlocked(email)) {
    console.log(`[BLOQUEIO] Tentativa de pagamento bloqueada para email: ${email}`);
    
    // Retornar erro 403 (Forbidden)
    return res.status(403).json({
      error: 'Email bloqueado',
      message: 'Este email está impedido de realizar compras no sistema.',
      code: 'EMAIL_BLOCKED'
    });
  }
  
  // Se o email não estiver bloqueado, continuar o fluxo
  return next();
}

module.exports = {
  checkBlockedEmail
}; 