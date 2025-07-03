/**
 * Lista de emails bloqueados para compras no checkout
 * Estes emails não poderão realizar novas compras no sistema
 */

const blockedEmails = [
  "betojunior691@gmail.com",
  "kauacordeiro450@gmail.com",
  "anaaa2345ds@gmail.com",
  "lucianateoniliacosta12345@gmail.com",
  "lucianateoniliacosta@gmail.com",
  "lucianateoniliacosta@hotmail.com",
  "fernandao651709@gmail.com",
  "mluisa8234@gmail.com",
  "silvakjj2@gmail.com",
  "yasminsantana1608@gmail.com",
  "julliafurtadodecarvalho@gmail.com",
  "jarbas091@gmail.com",
  "nevesthiago@gmail.com",
  "marcella.saraiva05@gmail.com",
  "guilhermelouredo05@gmail.com",
  "matheuusalexandreee@gmail.com",
  "kaykejames70@gmail.com",
  "lorenabeatriz130131@gmail.com",
  "miguel.cerveira2010@gmail.com",
  "beatriznascimentor@gmail.com",
  "ingrydiasmyn5@gmail.com",
  "willianxavier702@icloud.com",
  "arturjulio473@gmail.com",
  "camilivitoria294@gmail.com",
  "matheusjonatamatheusvicetedasi@gmail.com",
  "kelvinalves23451@gmail.com",
  "arthur78667@gmail.com",
  "monykedeabreupessoa84@gmail.com",
  "isachhenriquemelinhoo@gmail.com",
  "kevemrocha11@gmail.com",
  "mmartins3735@gmail.com",
  "santhiagolouredo077@gmail.com",
  "gabrieleabreeu@gmail.com",
  "Luanagabrielaninaa12@outlook.com",
  "iudyoliver9@gmail.com",
  "wzim09999@gmail.com",
  "gamesronaldinho0@gmail.com",
  "ivaneidepereira953@gmail.com",
  "antoniodiaspedro07@gmail.com",
  "silvakjj2@gmail.com",
  "saragomes.2444@gmail.com",
  "gv942138@gmail.com",
  "usuariooo.201017@gmail.com",
  "felipegabrielcorreapinheiro@gmail.com"
];

/**
 * Função para verificar se um email está bloqueado
 * @param {string} email - Email para verificar
 * @returns {boolean} - Retorna true se o email estiver bloqueado
 */
function isEmailBlocked(email) {
  if (!email) return false;
  
  // Normalizar o email (converter para minúsculas)
  const normalizedEmail = email.toLowerCase().trim();
  
  // Verificar se o email está na lista de bloqueados
  return blockedEmails.some(blockedEmail => 
    blockedEmail.toLowerCase() === normalizedEmail
  );
}

/**
 * Exportar funções e dados
 */
module.exports = {
  blockedEmails,
  isEmailBlocked
}; 