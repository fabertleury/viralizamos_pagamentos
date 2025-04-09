/**
 * Funções utilitárias para o projeto
 */

/**
 * Formata um valor numérico para moeda (R$)
 * @param value Valor a ser formatado
 * @param currency Moeda (padrão: BRL)
 * @returns String formatada com o valor da moeda
 */
export function formatCurrency(value: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency
  }).format(value);
}

/**
 * Formata uma data para o formato dd/mm/yyyy
 * @param date Data a ser formatada
 * @returns String formatada com a data
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('pt-BR');
}

/**
 * Formata uma data para o formato dd/mm/yyyy hh:mm
 * @param date Data a ser formatada
 * @returns String formatada com a data e hora
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('pt-BR');
}

/**
 * Trunca um texto se ele for maior que o tamanho máximo
 * @param text Texto a ser truncado
 * @param maxLength Tamanho máximo
 * @returns Texto truncado
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Gera um ID aleatório
 * @param length Tamanho do ID (padrão: 8)
 * @returns ID aleatório
 */
export function generateId(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Aplica máscara para CPF/CNPJ
 * @param value Valor a ser mascarado
 * @returns String formatada com o CPF/CNPJ
 */
export function formatDocument(value: string): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 11) {
    // CPF: 123.456.789-01
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 12.345.678/0001-90
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
}

/**
 * Aplica máscara para telefone
 * @param value Valor a ser mascarado
 * @returns String formatada com o telefone
 */
export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 10) {
    // (99) 9999-9999
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    // (99) 99999-9999
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
} 