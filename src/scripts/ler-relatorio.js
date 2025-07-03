const XLSX = require('xlsx');
const path = require('path');

// Caminho para o arquivo Excel com o relatório
const relatorioPath = path.resolve(process.cwd(), 'relatorio_custos_2025-05-30_15-15-56.xlsx');

// Lê o arquivo Excel
const workbook = XLSX.readFile(relatorioPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Converte os dados do Excel para JSON
const dados = XLSX.utils.sheet_to_json(worksheet);

// Calcula os totais
let valorTotalTransacoes = 0;
let custoTotalCalculado = 0;
let transacoesComCusto = 0;
let totalTransacoes = dados.length;

for (const item of dados) {
  const valorTransacao = item['Valor da Transação (R$)'] || 0;
  const custoCalculado = item['Custo Calculado (R$)'] || 0;
  
  valorTotalTransacoes += valorTransacao;
  
  if (custoCalculado > 0) {
    custoTotalCalculado += custoCalculado;
    transacoesComCusto++;
  }
}

// Exibe o resumo
console.log('\n=== RESUMO DO PERÍODO DE 02/03/2025 ATÉ 16/05/2025 ===');
console.log(`Total de transações aprovadas: ${totalTransacoes}`);
console.log(`Transações com custo calculado: ${transacoesComCusto} (${((transacoesComCusto / totalTransacoes) * 100).toFixed(2)}%)`);
console.log(`Valor total das transações: R$ ${valorTotalTransacoes.toFixed(2)}`);
console.log(`VALOR TOTAL GASTO COM PRODUTOS: R$ ${custoTotalCalculado.toFixed(2)}`);
console.log(`Lucro total: R$ ${(valorTotalTransacoes - custoTotalCalculado).toFixed(2)}`);
console.log(`Margem de lucro média: ${((valorTotalTransacoes - custoTotalCalculado) / valorTotalTransacoes * 100).toFixed(2)}%`);
