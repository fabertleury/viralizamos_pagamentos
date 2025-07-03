const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
const { Pool } = require('pg');

// Configuração da conexão com o banco de dados de pagamentos
const poolPagamentos = new Pool({
  connectionString: 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway'
});

// Configuração da conexão com o banco de dados de orders
const poolOrders = new Pool({
  connectionString: 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway'
});

async function main() {
  try {
    console.log('Buscando transações aprovadas e pedidos enviados para provedores...');
    
    // Caminho para o arquivo Excel com os custos dos serviços
    const excelFilePath = path.resolve(process.cwd(), 'servicos_ativos_custos_2025-05-29_novo.xlsx');
    
    // Verifica se o arquivo existe
    if (!fs.existsSync(excelFilePath)) {
      throw new Error(`Arquivo Excel não encontrado: ${excelFilePath}`);
    }
    
    console.log(`Lendo arquivo Excel: ${excelFilePath}`);
    
    // Lê o arquivo Excel
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converte os dados do Excel para JSON com cabeçalhos
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Mapas para armazenar os custos unitários dos serviços
    const custosUnitariosPorId = new Map();
    
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
        custosUnitariosPorId.set(id, { 
          nome, 
          quantidade, 
          custoTotal, 
          custoUnitario 
        });
      }
    }
    
    // Define o período de análise
    const dataInicio = new Date('2025-03-02');
    const dataFim = new Date('2025-05-16T23:59:59');
    
    console.log(`\nBuscando transações no período de ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}...`);
    
    // Busca as transações aprovadas e os logs de resposta do provedor no período
    const queryTransacoes = `
      SELECT 
        t.id as transaction_id, 
        t.payment_request_id,
        t.external_id,
        t.status, 
        t.amount, 
        t.created_at,
        pr.service_id,
        pr.service_name,
        pr.additional_data,
        prl.id as provider_log_id,
        prl.provider_id,
        prl.service_id as provider_service_id,
        prl.external_order_id,
        prl.status as provider_status,
        prl.created_at as provider_created_at
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
    
    const { rows: transacoes } = await poolPagamentos.query(queryTransacoes, [dataInicio, dataFim]);
    console.log(`Encontradas ${transacoes.length} transações aprovadas com pedidos enviados para provedores`);
    
    // Função para extrair a quantidade da transação
    function extrairQuantidadeTransacao(transacao) {
      if (!transacao.additional_data) {
        return null;
      }
      
      try {
        const additionalData = JSON.parse(transacao.additional_data);
        return additionalData.quantity || additionalData.quantidade || null;
      } catch (e) {
        return null;
      }
    }
    
    // Processa as transações e calcula os custos
    let valorTotalTransacoes = 0;
    let custoTotalCalculado = 0;
    
    // Prepara os dados para o relatório
    const relatorio = [];
    
    for (const transacao of transacoes) {
      valorTotalTransacoes += parseFloat(transacao.amount);
      
      // Extrai a quantidade da transação
      const quantidade = extrairQuantidadeTransacao(transacao);
      
      // Calcula o custo se tiver a quantidade e o serviço
      let custoCalculado = null;
      if (quantidade && transacao.service_id && custosUnitariosPorId.has(transacao.service_id)) {
        const infoServico = custosUnitariosPorId.get(transacao.service_id);
        custoCalculado = infoServico.custoUnitario * parseInt(quantidade, 10);
        custoTotalCalculado += custoCalculado;
      }
      
      // Adiciona ao relatório
      relatorio.push({
        transaction_id: transacao.transaction_id,
        external_id: transacao.external_id,
        payment_request_id: transacao.payment_request_id,
        service_id: transacao.service_id,
        service_name: transacao.service_name,
        quantidade: quantidade,
        amount: parseFloat(transacao.amount),
        created_at: format(new Date(transacao.created_at), 'dd/MM/yyyy HH:mm:ss'),
        provider_id: transacao.provider_id,
        provider_service_id: transacao.provider_service_id,
        external_order_id: transacao.external_order_id,
        provider_status: transacao.provider_status,
        provider_created_at: transacao.provider_created_at ? format(new Date(transacao.provider_created_at), 'dd/MM/yyyy HH:mm:ss') : null,
        custo_calculado: custoCalculado
      });
    }
    
    // Exibe o resumo
    console.log('\n=== RESUMO DO PERÍODO DE 02/03/2025 ATÉ 16/05/2025 ===');
    console.log(`Total de transações aprovadas com pedidos enviados: ${transacoes.length}`);
    console.log(`Valor total das transações: R$ ${valorTotalTransacoes.toFixed(2)}`);
    console.log(`VALOR TOTAL GASTO COM PRODUTOS: R$ ${custoTotalCalculado.toFixed(2)}`);
    console.log(`Lucro total: R$ ${(valorTotalTransacoes - custoTotalCalculado).toFixed(2)}`);
    console.log(`Margem de lucro média: ${((valorTotalTransacoes - custoTotalCalculado) / valorTotalTransacoes * 100).toFixed(2)}%`);
    
    // Salva o relatório em um arquivo Excel
    const nomeArquivoExcel = `relatorio_transacoes_enviadas_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
    
    // Prepara os dados para o Excel
    const dadosExcel = relatorio.map(item => ({
      'ID da Transação': item.transaction_id,
      'External ID': item.external_id,
      'ID do Pagamento': item.payment_request_id,
      'ID do Serviço': item.service_id || '',
      'Nome do Serviço': item.service_name || '',
      'Quantidade': item.quantidade || '',
      'Valor da Transação (R$)': item.amount,
      'Data de Criação': item.created_at,
      'ID do Provedor': item.provider_id,
      'ID do Serviço no Provedor': item.provider_service_id,
      'External Order ID': item.external_order_id,
      'Status no Provedor': item.provider_status,
      'Data de Envio ao Provedor': item.provider_created_at,
      'Custo Calculado (R$)': item.custo_calculado
    }));
    
    // Cria uma nova planilha
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    
    // Adiciona a planilha ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Transações Enviadas');
    
    // Salva o arquivo Excel
    XLSX.writeFile(wb, nomeArquivoExcel);
    console.log(`\nRelatório Excel salvo em: ${nomeArquivoExcel}`);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    // Fecha as conexões com os bancos de dados
    await poolPagamentos.end();
    await poolOrders.end();
  }
}

// Executa o programa principal
main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    console.log('Programa finalizado.');
  });
