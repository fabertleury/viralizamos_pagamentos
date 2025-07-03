const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway'
});

async function main() {
  try {
    console.log('Calculando total de gastos com produtos...');
    
    // Lê o arquivo Excel com os custos dos serviços
    const excelFilePath = path.resolve(process.cwd(), 'servicos_ativos_custos_2025-05-29_novo.xlsx');
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Mapas para armazenar os custos unitários dos serviços
    const custosUnitariosPorId = new Map();
    const custosUnitariosPorNome = new Map();
    
    // Processa as linhas do Excel
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 10) continue;
      
      const id = row[0]?.toString();
      const nome = row[1]?.toString();
      const quantidade = parseInt(row[3], 10);
      const custoTotal = parseFloat(row[9]);
      
      if (id && nome && !isNaN(quantidade) && !isNaN(custoTotal) && quantidade > 0) {
        const custoUnitario = custoTotal / quantidade;
        custosUnitariosPorId.set(id, custoUnitario);
        custosUnitariosPorNome.set(nome.toLowerCase(), custoUnitario);
      }
    }
    
    // Busca transações aprovadas no período especificado
    const dataInicio = new Date('2025-03-02');
    const dataFim = new Date('2025-05-16T23:59:59');
    
    const queryTransacoes = `
      SELECT 
        t.id, 
        t.amount, 
        pr.service_id,
        pr.service_name,
        pr.additional_data
      FROM 
        transactions t
      LEFT JOIN 
        payment_requests pr ON t.payment_request_id = pr.id
      WHERE 
        t.created_at >= $1 AND t.created_at <= $2
        AND t.status = 'approved'
    `;
    
    const { rows: transacoes } = await pool.query(queryTransacoes, [dataInicio, dataFim]);
    console.log(`Encontradas ${transacoes.length} transações aprovadas no período`);
    
    // Calcula o custo total
    let valorTotalTransacoes = 0;
    let custoTotalCalculado = 0;
    let transacoesComCusto = 0;
    
    for (const transacao of transacoes) {
      valorTotalTransacoes += parseFloat(transacao.amount);
      
      // Extrai a quantidade da transação
      let quantidade = null;
      if (transacao.additional_data) {
        try {
          const additionalData = JSON.parse(transacao.additional_data);
          quantidade = additionalData.quantity || additionalData.quantidade;
        } catch (e) {
          // Ignora erros de parse
        }
      }
      
      if (quantidade) {
        // Tenta encontrar o custo unitário pelo ID do serviço
        let custoUnitario = custosUnitariosPorId.get(transacao.service_id);
        
        // Se não encontrou pelo ID, tenta pelo nome
        if (!custoUnitario && transacao.service_name) {
          custoUnitario = custosUnitariosPorNome.get(transacao.service_name.toLowerCase());
          
          // Tenta encontrar por correspondência parcial no nome
          if (!custoUnitario) {
            const nomeServico = transacao.service_name.toLowerCase();
            
            for (const [nome, custo] of custosUnitariosPorNome.entries()) {
              if ((nome.includes('seguidores') && nomeServico.includes('seguidores')) ||
                  (nome.includes('curtidas') && nomeServico.includes('curtidas')) ||
                  (nome.includes('views') && nomeServico.includes('views')) ||
                  (nome.includes('comentários') && nomeServico.includes('comentários'))) {
                custoUnitario = custo;
                break;
              }
            }
          }
        }
        
        // Se encontrou um custo unitário, calcula o custo da transação
        if (custoUnitario) {
          const custoTransacao = custoUnitario * parseInt(quantidade, 10);
          custoTotalCalculado += custoTransacao;
          transacoesComCusto++;
        }
      }
    }
    
    // Exibe o resumo
    console.log('\n=== RESUMO DO PERÍODO DE 02/03/2025 ATÉ 16/05/2025 ===');
    console.log(`Total de transações aprovadas: ${transacoes.length}`);
    console.log(`Transações com custo calculado: ${transacoesComCusto} (${((transacoesComCusto / transacoes.length) * 100).toFixed(2)}%)`);
    console.log(`Valor total das transações: R$ ${valorTotalTransacoes.toFixed(2)}`);
    console.log(`VALOR TOTAL GASTO COM PRODUTOS: R$ ${custoTotalCalculado.toFixed(2)}`);
    console.log(`Lucro total: R$ ${(valorTotalTransacoes - custoTotalCalculado).toFixed(2)}`);
    console.log(`Margem de lucro média: ${((valorTotalTransacoes - custoTotalCalculado) / valorTotalTransacoes * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
