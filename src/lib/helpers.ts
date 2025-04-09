/**
 * Funções utilitárias para o projeto de pagamentos
 */

/**
 * Verifica se uma string é um UUID válido
 * @param value String ou array de strings para verificar
 * @returns Boolean indicando se é um UUID válido
 */
export function isValidUuid(value: string | string[]): boolean {
  const singleValue = getSingleValue(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(singleValue);
}

/**
 * Extrai um valor único de uma string ou array de strings
 * @param value String ou array de strings
 * @returns String única
 */
export function getSingleValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Formata um valor monetário para exibição
 * @param amount Valor a ser formatado
 * @param currency Moeda (padrão: BRL)
 * @returns String formatada
 */
export function formatCurrency(amount: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency 
  }).format(amount);
}

/**
 * Formata uma data para exibição
 * @param date Data a ser formatada
 * @returns String formatada
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
} 