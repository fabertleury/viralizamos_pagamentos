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
    console.log('Iniciando cálculo de custos dos pedidos individuais...');
    
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
        
        console.log(`Serviço: ${nome}, Quantidade: ${quantidade}, Custo Total: ${custoTotal}, Custo Unitário: ${custoUnitario.toFixed(6)}`);
      }
    }
    
    // Define o período de análise
    const dataInicio = new Date('2025-03-02');
    const dataFim = new Date('2025-05-16T23:59:59');
    
    console.log(`\nBuscando transações no período de ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}...`);
    
    // Busca as transações aprovadas no período
    const queryTransacoes = `
      SELECT 
        t.id as transaction_id, 
        t.payment_request_id,
        t.amount, 
        t.created_at,
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
    
    const { rows: transacoes } = await poolPagamentos.query(queryTransacoes, [dataInicio, dataFim]);
    console.log(`Encontradas ${transacoes.length} transações aprovadas no período`);
    
    // Mapeia os IDs das transações para buscar os pedidos correspondentes
    const transactionIds = transacoes.map(t => t.transaction_id);
    
    // Verifica a estrutura das tabelas no banco de orders
    const queryTables = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const { rows: tables } = await poolOrders.query(queryTables);
    console.log('\nTabelas no banco de orders:');
    tables.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    // Busca os pedidos no banco de orders
    // Nota: Precisamos verificar o nome correto da tabela e os campos
    const queryOrders = `
      SELECT * 
      FROM orders 
      WHERE external_reference IN (${transactionIds.map((_, i) => `$${i + 1}`).join(',')})
      OR transaction_id IN (${transactionIds.map((_, i) => `$${transactionIds.length + i + 1}`).join(',')})
      LIMIT 100
    `;
    
    const { rows: orders } = await poolOrders.query(
      queryOrders, 
      [...transactionIds, ...transactionIds]
    );
    
    console.log(`\nEncontrados ${orders.length} pedidos associados às transações`);
    
    // Se não encontrou pedidos, tenta verificar a estrutura da tabela orders
    if (orders.length === 0) {
      const orderTable = tables.find(t => t.table_name === 'orders');
      
      if (orderTable) {
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
        
        // Tenta buscar alguns pedidos para entender a estrutura
        const querySample = `
          SELECT * FROM orders LIMIT 5
        `;
        
        const { rows: sampleOrders } = await poolOrders.query(querySample);
        console.log('\nExemplo de pedidos:');
        sampleOrders.forEach((order, index) => {
          console.log(`\nPedido #${index + 1}:`);
          Object.entries(order).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        });
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
    
    // Processa os pedidos e calcula os custos
    let totalTransacoes = transacoes.length;
    let totalPedidos = orders.length;
    let totalPedidosComCusto = 0;
    let valorTotalTransacoes = 0;
    let custoTotalCalculado = 0;
    
    // Calcula o valor total das transações
    for (const transacao of transacoes) {
      valorTotalTransacoes += parseFloat(transacao.amount);
    }
    
    // Prepara os dados para o relatório
    const relatorioPedidos = [];
    
    // Se não encontrou pedidos na tabela orders, usa as transações como pedidos
    if (orders.length === 0) {
      console.log('\nUsando transações como pedidos...');
      
      for (const transacao of transacoes) {
        // Extrai a quantidade da transação
        let quantidade = null;
        if (transacao.additional_data) {
          try {
            const additionalData = JSON.parse(transacao.additional_data);
            quantidade = additionalData.quantity || additionalData.quantidade;
          } catch (e) {
            console.log(`Erro ao fazer parse do additional_data: ${e.message}`);
          }
        }
        
        if (quantidade) {
          const infoServico = encontrarCustoUnitario(transacao.service_id, transacao.service_name);
          
          if (infoServico) {
            // Calcula o custo proporcional usando a fórmula:
            // (custo do pacote / quantidade do pacote) * quantidade da transação
            const custoCalculado = infoServico.custoUnitario * parseInt(quantidade, 10);
            
            custoTotalCalculado += custoCalculado;
            totalPedidosComCusto++;
            
            // Adiciona ao relatório
            relatorioPedidos.push({
              transaction_id: transacao.transaction_id,
              order_id: null,
              service_id: transacao.service_id,
              service_name: transacao.service_name,
              quantidade: quantidade,
              valor_transacao: parseFloat(transacao.amount),
              pacote_referencia: {
                id: infoServico.id || '',
                nome: infoServico.nome || '',
                quantidade: infoServico.quantidade,
                custo_total: infoServico.custoTotal
              },
              custo_unitario: infoServico.custoUnitario,
              custo_calculado: custoCalculado,
              data_criacao: format(new Date(transacao.created_at), 'dd/MM/yyyy HH:mm:ss')
            });
          }
        }
      }
    } else {
      // Processa os pedidos encontrados na tabela orders
      for (const pedido of orders) {
        // Adaptar conforme a estrutura real da tabela orders
        const quantidade = pedido.quantity;
        const serviceId = pedido.service_id;
        const serviceName = pedido.service_name;
        
        if (quantidade) {
          const infoServico = encontrarCustoUnitario(serviceId, serviceName);
          
          if (infoServico) {
            // Calcula o custo proporcional
            const custoCalculado = infoServico.custoUnitario * parseInt(quantidade, 10);
            
            custoTotalCalculado += custoCalculado;
            totalPedidosComCusto++;
            
            // Encontra a transação correspondente
            const transacao = transacoes.find(t => t.transaction_id === pedido.transaction_id || t.transaction_id === pedido.external_reference);
            const valorTransacao = transacao ? parseFloat(transacao.amount) : 0;
            
            // Adiciona ao relatório
            relatorioPedidos.push({
              transaction_id: pedido.transaction_id || pedido.external_reference,
              order_id: pedido.id,
              service_id: serviceId,
              service_name: serviceName,
              quantidade: quantidade,
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
    }
    
    // Exibe o resumo
    console.log('\n=== RESUMO DO PERÍODO DE 02/03/2025 ATÉ 16/05/2025 ===');
    console.log(`Total de transações aprovadas: ${totalTransacoes}`);
    console.log(`Total de pedidos processados: ${totalPedidosComCusto}`);
    console.log(`Valor total das transações: R$ ${valorTotalTransacoes.toFixed(2)}`);
    console.log(`VALOR TOTAL GASTO COM PRODUTOS (por pedido): R$ ${custoTotalCalculado.toFixed(2)}`);
    console.log(`Lucro total: R$ ${(valorTotalTransacoes - custoTotalCalculado).toFixed(2)}`);
    console.log(`Margem de lucro média: ${((valorTotalTransacoes - custoTotalCalculado) / valorTotalTransacoes * 100).toFixed(2)}%`);
    
    // Salva o relatório em um arquivo Excel
    const nomeArquivoExcel = `relatorio_custos_orders_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
    
    // Prepara os dados para o Excel
    const dadosExcel = relatorioPedidos.map(item => ({
      'ID da Transação': item.transaction_id,
      'ID do Pedido': item.order_id || 'N/A',
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
