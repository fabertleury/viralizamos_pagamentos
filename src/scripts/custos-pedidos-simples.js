const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
const { Pool } = require('pg');

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway'
});

async function main() {
  try {
    console.log('Calculando custos dos pedidos individuais...');
    
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
        custosUnitariosPorId.set(id, { 
          custoUnitario, 
          nome, 
          quantidade, 
          custoTotal 
        });
        
        custosUnitariosPorNome.set(nome.toLowerCase(), { 
          custoUnitario, 
          id, 
          quantidade, 
          custoTotal 
        });
      }
    }
    
    // Define o período de análise
    const dataInicio = new Date('2025-03-02');
    const dataFim = new Date('2025-05-16T23:59:59');
    
    console.log(`Buscando transações no período de ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}...`);
    
    // Busca as transações aprovadas no período
    const queryTransacoes = `
      SELECT 
        t.id as transaction_id, 
        t.amount, 
        t.created_at
      FROM 
        transactions t
      WHERE 
        t.created_at >= $1 AND t.created_at <= $2
        AND t.status = 'approved'
    `;
    
    const { rows: transacoes } = await pool.query(queryTransacoes, [dataInicio, dataFim]);
    console.log(`Encontradas ${transacoes.length} transações aprovadas no período`);
    
    // Busca os pedidos associados a cada transação
    const queryPedidos = `
      SELECT 
        o.id as order_id,
        o.transaction_id,
        o.service_id,
        o.service_name,
        o.quantity,
        o.status,
        o.created_at
      FROM 
        orders o
      WHERE 
        o.transaction_id IN (
          SELECT t.id FROM transactions t WHERE t.created_at >= $1 AND t.created_at <= $2 AND t.status = 'approved'
        )
    `;
    
    const { rows: pedidos } = await pool.query(queryPedidos, [dataInicio, dataFim]);
    console.log(`Encontrados ${pedidos.length} pedidos associados às transações aprovadas`);
    
    // Organiza os pedidos por transação
    const pedidosPorTransacao = new Map();
    
    for (const pedido of pedidos) {
      if (!pedidosPorTransacao.has(pedido.transaction_id)) {
        pedidosPorTransacao.set(pedido.transaction_id, []);
      }
      pedidosPorTransacao.get(pedido.transaction_id).push(pedido);
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
    
    // Processa os pedidos e calcula os custos
    let totalTransacoes = transacoes.length;
    let totalPedidos = pedidos.length;
    let totalPedidosComCusto = 0;
    let valorTotalTransacoes = 0;
    let custoTotalCalculado = 0;
    
    // Calcula o valor total das transações
    for (const transacao of transacoes) {
      valorTotalTransacoes += parseFloat(transacao.amount);
    }
    
    // Prepara os dados para o relatório
    const relatorioPedidos = [];
    
    // Processa cada pedido
    for (const pedido of pedidos) {
      if (pedido.quantity) {
        const infoServico = encontrarCustoUnitario(pedido.service_id, pedido.service_name);
        
        if (infoServico) {
          // Calcula o custo proporcional usando a fórmula:
          // (custo do pacote / quantidade do pacote) * quantidade do pedido
          const custoCalculado = infoServico.custoUnitario * parseInt(pedido.quantity, 10);
          
          custoTotalCalculado += custoCalculado;
          totalPedidosComCusto++;
          
          // Encontra a transação correspondente
          const transacao = transacoes.find(t => t.transaction_id === pedido.transaction_id);
          const valorTransacao = transacao ? parseFloat(transacao.amount) : 0;
          
          // Adiciona ao relatório
          relatorioPedidos.push({
            transaction_id: pedido.transaction_id,
            order_id: pedido.order_id,
            service_id: pedido.service_id,
            service_name: pedido.service_name,
            quantidade: pedido.quantity,
            valor_transacao: valorTransacao,
            pacote_referencia: {
              id: infoServico.id || '',
              nome: infoServico.nome || '',
              quantidade: infoServico.quantidade,
              custo_total: infoServico.custoTotal
            },
            custo_unitario: infoServico.custoUnitario,
            custo_calculado: custoCalculado,
            data_criacao: format(new Date(pedido.created_at), 'dd/MM/yyyy HH:mm:ss')
          });
        }
      }
    }
    
    // Exibe o resumo
    console.log('\n=== RESUMO DO PERÍODO DE 02/03/2025 ATÉ 16/05/2025 ===');
    console.log(`Total de transações aprovadas: ${totalTransacoes}`);
    console.log(`Total de pedidos: ${totalPedidos}`);
    console.log(`Pedidos com custo calculado: ${totalPedidosComCusto} (${((totalPedidosComCusto / totalPedidos) * 100).toFixed(2)}%)`);
    console.log(`Valor total das transações: R$ ${valorTotalTransacoes.toFixed(2)}`);
    console.log(`VALOR TOTAL GASTO COM PRODUTOS (por pedido): R$ ${custoTotalCalculado.toFixed(2)}`);
    console.log(`Lucro total: R$ ${(valorTotalTransacoes - custoTotalCalculado).toFixed(2)}`);
    console.log(`Margem de lucro média: ${((valorTotalTransacoes - custoTotalCalculado) / valorTotalTransacoes * 100).toFixed(2)}%`);
    
    // Salva o relatório em um arquivo Excel
    const nomeArquivoExcel = `relatorio_custos_pedidos_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
    
    // Prepara os dados para o Excel
    const dadosExcel = relatorioPedidos.map(item => ({
      'ID da Transação': item.transaction_id,
      'ID do Pedido': item.order_id,
      'ID do Serviço': item.service_id || '',
      'Nome do Serviço': item.service_name || '',
      'Quantidade': item.quantidade || '',
      'Valor da Transação (R$)': item.valor_transacao,
      'Nome do Pacote de Referência': item.pacote_referencia.nome,
      'Quantidade do Pacote de Referência': item.pacote_referencia.quantidade,
      'Custo do Pacote de Referência (R$)': item.pacote_referencia.custo_total,
      'Custo Unitário (R$)': item.custo_unitario,
      'Custo Calculado (R$)': item.custo_calculado,
      'Data de Criação': item.data_criacao
    }));
    
    // Cria uma nova planilha
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    
    // Adiciona a planilha ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Custos por Pedido');
    
    // Salva o arquivo Excel
    XLSX.writeFile(wb, nomeArquivoExcel);
    console.log(`\nRelatório Excel salvo em: ${nomeArquivoExcel}`);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
