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
    console.log('Calculando custos por provedor...');
    
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
        custosUnitariosPorId.set(id, { 
          nome, 
          quantidade, 
          custoTotal, 
          custoUnitario 
        });
        
        custosUnitariosPorNome.set(nome.toLowerCase(), { 
          id, 
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
    
    // Primeiro, vamos verificar a estrutura da tabela provider_response_logs
    const queryEstrutura = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'provider_response_logs'
    `;
    
    const { rows: colunas } = await pool.query(queryEstrutura);
    const colunasNomes = colunas.map(c => c.column_name);
    
    // Verifica se as colunas necessárias existem
    const temExternalOrderId = colunasNomes.includes('external_order_id');
    const temResponseData = colunasNomes.includes('response_data');
    
    // Constrói a consulta com base nas colunas disponíveis
    let camposProvider = 'prl.provider_id, prl.service_id as provider_service_id';
    
    if (temExternalOrderId) {
      camposProvider += ', prl.external_order_id';
    }
    
    if (temResponseData) {
      camposProvider += ', prl.response_data';
    }
    
    // Busca as transações aprovadas no período com informações do provedor
    const queryTransacoes = `
      SELECT 
        t.id as transaction_id, 
        t.payment_request_id,
        t.external_id,
        t.status, 
        t.amount, 
        t.created_at,
        t.provider,
        pr.service_id,
        pr.service_name,
        pr.additional_data,
        ${camposProvider}
      FROM 
        transactions t
      LEFT JOIN 
        payment_requests pr ON t.payment_request_id = pr.id
      LEFT JOIN
        provider_response_logs prl ON t.id = prl.transaction_id
      WHERE 
        t.created_at >= $1 AND t.created_at <= $2
        AND t.status = 'approved'
        AND prl.id IS NOT NULL
      ORDER BY
        t.created_at ASC
    `;
    
    const { rows: transacoes } = await pool.query(queryTransacoes, [dataInicio, dataFim]);
    console.log(`Encontradas ${transacoes.length} transações aprovadas com informações de provedor`);
    
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
    
    // Função para encontrar o custo unitário de um serviço
    function encontrarCustoUnitario(serviceId, serviceName) {
      // Tenta encontrar pelo ID
      if (custosUnitariosPorId.has(serviceId)) {
        return custosUnitariosPorId.get(serviceId);
      }
      
      // Tenta encontrar pelo nome exato
      if (serviceName && custosUnitariosPorNome.has(serviceName.toLowerCase())) {
        return custosUnitariosPorNome.get(serviceName.toLowerCase());
      }
      
      // Tenta encontrar por correspondência parcial no nome
      if (serviceName) {
        const nomeServico = serviceName.toLowerCase();
        
        for (const [nome, info] of custosUnitariosPorNome.entries()) {
          if ((nome.includes('seguidores') && nomeServico.includes('seguidores')) ||
              (nome.includes('curtidas') && nomeServico.includes('curtidas')) ||
              (nome.includes('views') && nomeServico.includes('views')) ||
              (nome.includes('comentários') && nomeServico.includes('comentários'))) {
            return info;
          }
        }
      }
      
      return null;
    }
    
    // Processa as transações e calcula os custos por provedor
    const custosPorProvedor = new Map();
    const transacoesPorProvedor = new Map();
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
      if (quantidade && transacao.service_id) {
        const infoServico = encontrarCustoUnitario(transacao.service_id, transacao.service_name);
        
        if (infoServico) {
          // Calcula o custo proporcional usando a fórmula:
          // (custo do pacote / quantidade do pacote) * quantidade da transação
          custoCalculado = infoServico.custoUnitario * parseInt(quantidade, 10);
          custoTotalCalculado += custoCalculado;
          
          // Adiciona ao mapa de custos por provedor
          const provedor = transacao.provider || 'desconhecido';
          
          if (!custosPorProvedor.has(provedor)) {
            custosPorProvedor.set(provedor, 0);
            transacoesPorProvedor.set(provedor, 0);
          }
          
          custosPorProvedor.set(provedor, custosPorProvedor.get(provedor) + custoCalculado);
          transacoesPorProvedor.set(provedor, transacoesPorProvedor.get(provedor) + 1);
        }
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
        provider: transacao.provider,
        provider_id: transacao.provider_id,
        provider_service_id: transacao.provider_service_id,
        external_order_id: temExternalOrderId ? transacao.external_order_id : null,
        custo_calculado: custoCalculado
      });
    }
    
    // Exibe o resumo por provedor
    console.log('\n=== CUSTOS POR PROVEDOR (02/03/2025 ATÉ 16/05/2025) ===');
    
    const resumoProvedores = [];
    
    for (const [provedor, custo] of custosPorProvedor.entries()) {
      const numTransacoes = transacoesPorProvedor.get(provedor);
      console.log(`Provedor: ${provedor}`);
      console.log(`  Transações: ${numTransacoes}`);
      console.log(`  Custo total: R$ ${custo.toFixed(2)}`);
      console.log(`  Custo médio por transação: R$ ${(custo / numTransacoes).toFixed(2)}`);
      console.log('');
      
      resumoProvedores.push({
        provedor,
        transacoes: numTransacoes,
        custo_total: custo,
        custo_medio: custo / numTransacoes
      });
    }
    
    // Exibe o resumo geral
    console.log('\n=== RESUMO GERAL DO PERÍODO ===');
    console.log(`Total de transações aprovadas: ${transacoes.length}`);
    console.log(`Valor total das transações: R$ ${valorTotalTransacoes.toFixed(2)}`);
    console.log(`VALOR TOTAL GASTO COM PRODUTOS: R$ ${custoTotalCalculado.toFixed(2)}`);
    console.log(`Lucro total: R$ ${(valorTotalTransacoes - custoTotalCalculado).toFixed(2)}`);
    console.log(`Margem de lucro média: ${((valorTotalTransacoes - custoTotalCalculado) / valorTotalTransacoes * 100).toFixed(2)}%`);
    
    // Salva o relatório em um arquivo Excel
    const nomeArquivoExcel = `relatorio_custos_por_provedor_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
    
    // Cria uma nova planilha
    const wb = XLSX.utils.book_new();
    
    // Adiciona a planilha de transações
    const wsTransacoes = XLSX.utils.json_to_sheet(relatorio.map(item => ({
      'ID da Transação': item.transaction_id,
      'External ID': item.external_id,
      'ID do Pagamento': item.payment_request_id,
      'ID do Serviço': item.service_id || '',
      'Nome do Serviço': item.service_name || '',
      'Quantidade': item.quantidade || '',
      'Valor da Transação (R$)': item.amount,
      'Data de Criação': item.created_at,
      'Provedor': item.provider,
      'Provider ID': item.provider_id,
      'Provider Service ID': item.provider_service_id,
      'External Order ID': item.external_order_id,
      'Custo Calculado (R$)': item.custo_calculado
    })));
    
    XLSX.utils.book_append_sheet(wb, wsTransacoes, 'Transações');
    
    // Adiciona a planilha de resumo por provedor
    const wsResumo = XLSX.utils.json_to_sheet(resumoProvedores.map(item => ({
      'Provedor': item.provedor,
      'Número de Transações': item.transacoes,
      'Custo Total (R$)': item.custo_total,
      'Custo Médio por Transação (R$)': item.custo_medio
    })));
    
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo por Provedor');
    
    // Salva o arquivo Excel
    XLSX.writeFile(wb, nomeArquivoExcel);
    console.log(`\nRelatório Excel salvo em: ${nomeArquivoExcel}`);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
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
