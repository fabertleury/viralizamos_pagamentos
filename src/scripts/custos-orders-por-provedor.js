const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
const { Pool } = require('pg');

// Configuração da conexão com o banco de dados de orders
const poolOrders = new Pool({
  connectionString: 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway'
});

async function main() {
  try {
    console.log('Calculando custos por pedido e por provedor...');
    
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
        
        console.log(`Serviço: ${nome}, Quantidade: ${quantidade}, Custo Total: ${custoTotal}, Custo Unitário: ${custoUnitario.toFixed(6)}`);
        
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
    
    console.log(`\nVerificando tabelas no banco de dados de orders...`);
    
    // Verifica as tabelas disponíveis no banco de dados
    const queryTables = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const { rows: tables } = await poolOrders.query(queryTables);
    console.log('Tabelas encontradas:');
    tables.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    // Verifica se a tabela orders existe
    if (!tables.some(t => t.table_name === 'orders')) {
      throw new Error('A tabela "orders" não foi encontrada no banco de dados');
    }
    
    // Verifica a estrutura da tabela orders
    const queryColumns = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
    `;
    
    const { rows: columns } = await poolOrders.query(queryColumns);
    console.log('\nColunas da tabela orders:');
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });
    
    // Busca os pedidos no período especificado
    console.log(`\nBuscando pedidos no período de ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}...`);
    
    const queryOrders = `
      SELECT * 
      FROM orders 
      WHERE created_at >= $1 AND created_at <= $2
      ORDER BY created_at ASC
    `;
    
    const { rows: orders } = await poolOrders.query(queryOrders, [dataInicio, dataFim]);
    console.log(`Encontrados ${orders.length} pedidos no período`);
    
    // Se não encontrou pedidos, mostra um exemplo para entender a estrutura
    if (orders.length === 0) {
      console.log('\nBuscando exemplos de pedidos para entender a estrutura...');
      
      const querySample = `
        SELECT * FROM orders LIMIT 5
      `;
      
      const { rows: sampleOrders } = await poolOrders.query(querySample);
      
      if (sampleOrders.length > 0) {
        console.log('\nExemplo de pedido:');
        Object.entries(sampleOrders[0]).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      } else {
        console.log('Nenhum pedido encontrado na tabela');
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
              (nome.includes('visualizações') && nomeServico.includes('visualizações')) ||
              (nome.includes('comentários') && nomeServico.includes('comentários'))) {
            return info;
          }
        }
      }
      
      return null;
    }
    
    // Processa os pedidos e calcula os custos
    const custosPorProvedor = new Map();
    const pedidosPorProvedor = new Map();
    let valorTotalPedidos = 0;
    let custoTotalCalculado = 0;
    let totalPedidosComCusto = 0;
    
    // Prepara os dados para o relatório
    const relatorioPedidos = [];
    
    for (const pedido of orders) {
      // Extrai as informações do pedido
      const serviceId = pedido.service_id;
      const serviceName = pedido.service_name;
      const quantidade = pedido.quantity;
      const provedor = pedido.provider || 'desconhecido';
      
      // Adiciona ao contador de pedidos por provedor
      if (!pedidosPorProvedor.has(provedor)) {
        pedidosPorProvedor.set(provedor, 0);
        custosPorProvedor.set(provedor, 0);
      }
      
      pedidosPorProvedor.set(provedor, pedidosPorProvedor.get(provedor) + 1);
      
      // Calcula o custo se tiver a quantidade e o serviço
      let custoCalculado = null;
      if (quantidade && (serviceId || serviceName)) {
        const infoServico = encontrarCustoUnitario(serviceId, serviceName);
        
        if (infoServico) {
          // Calcula o custo proporcional usando a fórmula:
          // (custo do pacote / quantidade do pacote) * quantidade do pedido
          custoCalculado = infoServico.custoUnitario * parseInt(quantidade, 10);
          custoTotalCalculado += custoCalculado;
          totalPedidosComCusto++;
          
          // Adiciona ao mapa de custos por provedor
          custosPorProvedor.set(provedor, custosPorProvedor.get(provedor) + custoCalculado);
          
          // Adiciona ao relatório
          relatorioPedidos.push({
            id: pedido.id,
            external_id: pedido.external_id,
            transaction_id: pedido.transaction_id,
            service_id: serviceId,
            service_name: serviceName,
            quantidade: quantidade,
            provider: provedor,
            provider_service_id: pedido.provider_service_id,
            external_order_id: pedido.external_order_id,
            status: pedido.status,
            created_at: format(new Date(pedido.created_at), 'dd/MM/yyyy HH:mm:ss'),
            pacote_referencia: {
              id: infoServico.id || '',
              nome: infoServico.nome,
              quantidade: infoServico.quantidade,
              custo_total: infoServico.custoTotal
            },
            custo_unitario: infoServico.custoUnitario,
            custo_calculado: custoCalculado
          });
        }
      }
    }
    
    // Exibe o resumo por provedor
    console.log('\n=== CUSTOS POR PROVEDOR (02/03/2025 ATÉ 16/05/2025) ===');
    
    const resumoProvedores = [];
    
    for (const [provedor, numPedidos] of pedidosPorProvedor.entries()) {
      const custoTotal = custosPorProvedor.get(provedor) || 0;
      console.log(`Provedor: ${provedor}`);
      console.log(`  Pedidos: ${numPedidos}`);
      console.log(`  Custo total: R$ ${custoTotal.toFixed(2)}`);
      console.log(`  Custo médio por pedido: R$ ${(custoTotal / numPedidos).toFixed(2)}`);
      console.log('');
      
      resumoProvedores.push({
        provedor,
        pedidos: numPedidos,
        custo_total: custoTotal,
        custo_medio: custoTotal / numPedidos
      });
    }
    
    // Exibe o resumo geral
    console.log('\n=== RESUMO GERAL DO PERÍODO ===');
    console.log(`Total de pedidos: ${orders.length}`);
    console.log(`Pedidos com custo calculado: ${totalPedidosComCusto} (${((totalPedidosComCusto / orders.length) * 100).toFixed(2)}%)`);
    console.log(`VALOR TOTAL GASTO COM PRODUTOS: R$ ${custoTotalCalculado.toFixed(2)}`);
    
    // Salva o relatório em um arquivo Excel
    const nomeArquivoExcel = `relatorio_custos_orders_provedores_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
    
    // Cria uma nova planilha
    const wb = XLSX.utils.book_new();
    
    // Adiciona a planilha de pedidos
    const wsPedidos = XLSX.utils.json_to_sheet(relatorioPedidos.map(item => ({
      'ID do Pedido': item.id,
      'External ID': item.external_id,
      'Transaction ID': item.transaction_id,
      'ID do Serviço': item.service_id || '',
      'Nome do Serviço': item.service_name || '',
      'Quantidade': item.quantidade || '',
      'Provedor': item.provider,
      'Provider Service ID': item.provider_service_id,
      'External Order ID': item.external_order_id,
      'Status': item.status,
      'Data de Criação': item.created_at,
      'Pacote de Referência': item.pacote_referencia.nome,
      'Quantidade do Pacote': item.pacote_referencia.quantidade,
      'Custo do Pacote (R$)': item.pacote_referencia.custo_total,
      'Custo Unitário (R$)': item.custo_unitario,
      'Custo Calculado (R$)': item.custo_calculado
    })));
    
    XLSX.utils.book_append_sheet(wb, wsPedidos, 'Pedidos');
    
    // Adiciona a planilha de resumo por provedor
    const wsResumo = XLSX.utils.json_to_sheet(resumoProvedores.map(item => ({
      'Provedor': item.provedor,
      'Número de Pedidos': item.pedidos,
      'Custo Total (R$)': item.custo_total,
      'Custo Médio por Pedido (R$)': item.custo_medio
    })));
    
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo por Provedor');
    
    // Salva o arquivo Excel
    XLSX.writeFile(wb, nomeArquivoExcel);
    console.log(`\nRelatório Excel salvo em: ${nomeArquivoExcel}`);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
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
