const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
const { Pool } = require('pg');

// Configuração da conexão com o banco de dados de pagamentos
const pool = new Pool({
  connectionString: 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway'
});

async function main() {
  try {
    console.log('Gerando relatório de transações aprovadas e enviadas para provedores...');
    
    // Define o período de análise
    const dataInicio = new Date('2025-03-02');
    const dataFim = new Date('2025-05-16T23:59:59');
    
    console.log(`Período: ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}`);
    
    // Consulta SQL simplificada para obter apenas transações aprovadas com external_order_id
    const query = `
      SELECT 
        t.id as transaction_id, 
        t.external_id,
        t.status, 
        t.amount, 
        t.created_at,
        pr.service_id,
        pr.service_name,
        pr.additional_data,
        prl.external_order_id,
        prl.provider_id
      FROM 
        transactions t
      LEFT JOIN 
        payment_requests pr ON t.payment_request_id = pr.id
      LEFT JOIN
        provider_response_logs prl ON t.id = prl.transaction_id
      WHERE 
        t.created_at >= $1 AND t.created_at <= $2
        AND t.status = 'approved'
        AND prl.external_order_id IS NOT NULL
      ORDER BY
        t.created_at ASC
    `;
    
    const { rows: transacoes } = await pool.query(query, [dataInicio, dataFim]);
    
    console.log(`Encontradas ${transacoes.length} transações aprovadas com pedidos enviados`);
    
    // Função para extrair a quantidade da transação
    function extrairQuantidade(additionalData) {
      if (!additionalData) return null;
      
      try {
        const data = JSON.parse(additionalData);
        return data.quantity || data.quantidade || null;
      } catch (e) {
        return null;
      }
    }
    
    // Prepara os dados para o Excel
    const dadosExcel = transacoes.map(t => ({
      'ID da Transação': t.transaction_id,
      'External ID': t.external_id,
      'Status': t.status,
      'Valor (R$)': parseFloat(t.amount),
      'Data de Criação': format(new Date(t.created_at), 'dd/MM/yyyy HH:mm:ss'),
      'ID do Serviço': t.service_id,
      'Nome do Serviço': t.service_name,
      'Quantidade': extrairQuantidade(t.additional_data),
      'External Order ID': t.external_order_id,
      'Provider ID': t.provider_id
    }));
    
    // Calcula o valor total
    const valorTotal = transacoes.reduce((total, t) => total + parseFloat(t.amount), 0);
    console.log(`Valor total das transações: R$ ${valorTotal.toFixed(2)}`);
    
    // Cria o arquivo Excel
    const nomeArquivo = `relatorio_transacoes_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    
    // Adiciona a planilha ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Transações Aprovadas');
    
    // Salva o arquivo
    XLSX.writeFile(wb, nomeArquivo);
    console.log(`Relatório salvo em: ${nomeArquivo}`);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
