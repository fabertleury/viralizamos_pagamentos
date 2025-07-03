const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
const { Pool } = require('pg');

// Configuração da conexão com o banco de dados de orders
const poolOrders = new Pool({
  connectionString: 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway'
});

// Definição dos custos de referência para os serviços
// Formato: { tipo_servico: { quantidade_referencia: custo_referencia } }
const CUSTOS_REFERENCIA = {
  'seguidores': { quantidade: 1000, custo: 10.00 },
  'curtidas': { quantidade: 1000, custo: 3.00 },
  'views': { quantidade: 1000, custo: 1.50 },
  'visualizacoes': { quantidade: 1000, custo: 1.50 },
  'comentarios': { quantidade: 100, custo: 5.00 }
};

async function main() {
  try {
    console.log('Calculando custos por pedido e por provedor usando fórmula proporcional...');
    console.log('Fórmula: (custo_referencia / quantidade_referencia) * quantidade_pedido');
    
    console.log('\nCustos de referência utilizados:');
    for (const [tipo, info] of Object.entries(CUSTOS_REFERENCIA)) {
      console.log(`- ${tipo}: R$ ${info.custo.toFixed(2)} para ${info.quantidade} unidades (R$ ${(info.custo / info.quantidade).toFixed(6)} por unidade)`);
    }
    
    // Define o período de análise
    const dataInicio = new Date('2025-03-02');
    const dataFim = new Date('2025-05-16T23:59:59');
    
    // Busca os pedidos no período especificado
    console.log(`\nBuscando pedidos no período de ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}...`);
    
    // Nota: Como "Order" é uma palavra reservada em SQL, precisamos colocá-la entre aspas
    const queryOrders = `
      SELECT * 
      FROM "Order" 
      WHERE created_at >= $1 AND created_at <= $2
      ORDER BY created_at ASC
    `;
    
    const { rows: orders } = await poolOrders.query(queryOrders, [dataInicio, dataFim]);
    console.log(`Encontrados ${orders.length} pedidos no período`);
    
    // Função para extrair o nome do serviço do pedido
    function extrairNomeServico(pedido) {
      // Tenta extrair do metadata
      if (pedido.metadata) {
        try {
          const metadata = typeof pedido.metadata === 'string' 
            ? JSON.parse(pedido.metadata) 
            : pedido.metadata;
            
          if (metadata.service_info && metadata.service_info.name) {
            return metadata.service_info.name;
          }
          
          if (metadata.service_name) {
            return metadata.service_name;
          }
        } catch (e) {
          // Ignora erros de parse
        }
      }
      
      // Tenta extrair do provider_response
      if (pedido.provider_response) {
        try {
          const providerResponse = typeof pedido.provider_response === 'string'
            ? JSON.parse(pedido.provider_response)
            : pedido.provider_response;
            
          if (providerResponse.service_name) {
            return providerResponse.service_name;
          }
        } catch (e) {
          // Ignora erros de parse
        }
      }
      
      // Usa o target_url para inferir
      if (pedido.target_url) {
        if (pedido.target_url.includes('instagram.com/p/')) {
          return 'Curtidas Instagram';
        }
        if (pedido.target_url.includes('instagram.com') && !pedido.target_url.includes('/p/')) {
          return 'Seguidores Instagram';
        }
        if (pedido.target_url.includes('youtube.com')) {
          return 'Visualizações YouTube';
        }
      }
      
      return 'Serviço Desconhecido';
    }
    
    // Função para extrair a quantidade original do pedido
    function extrairQuantidadeOriginal(pedido) {
      // Primeiro tenta usar a quantidade do pedido
      if (pedido.quantity && pedido.quantity > 0) {
        return pedido.quantity;
      }
      
      // Tenta extrair do metadata
      if (pedido.metadata) {
        try {
          const metadata = typeof pedido.metadata === 'string' 
            ? JSON.parse(pedido.metadata) 
            : pedido.metadata;
            
          if (metadata.original_quantity) {
            return parseInt(metadata.original_quantity, 10);
          }
          
          if (metadata.quantity) {
            return parseInt(metadata.quantity, 10);
          }
        } catch (e) {
          // Ignora erros de parse
        }
      }
      
      return null;
    }
    
    // Função para determinar o tipo de serviço com base no nome ou URL
    function determinarTipoServico(pedido) {
      const serviceName = extrairNomeServico(pedido);
      const nome = serviceName.toLowerCase();
      
      // Determina o tipo pelo nome do serviço
      if (nome.includes('seguidores') || nome.includes('followers')) {
        return 'seguidores';
      }
      if (nome.includes('curtidas') || nome.includes('likes')) {
        return 'curtidas';
      }
      if (nome.includes('views') || nome.includes('visualizações') || nome.includes('visualizacoes')) {
        return 'visualizacoes';
      }
      if (nome.includes('comentários') || nome.includes('comentarios') || nome.includes('comments')) {
        return 'comentarios';
      }
      
      // Determina o tipo pela URL alvo
      if (pedido.target_url) {
        const url = pedido.target_url.toLowerCase();
        
        if (url.includes('instagram.com/p/')) {
          return 'curtidas';
        }
        if (url.includes('instagram.com') && !url.includes('/p/')) {
          return 'seguidores';
        }
        if (url.includes('youtube.com')) {
          return 'visualizacoes';
        }
      }
      
      // Tenta determinar pelo tipo de post no metadata
      if (pedido.metadata) {
        try {
          const metadata = typeof pedido.metadata === 'string' 
            ? JSON.parse(pedido.metadata) 
            : pedido.metadata;
            
          if (metadata.post) {
            if (metadata.post.is_reel) {
              return 'visualizacoes';
            }
            if (metadata.post.post_type === 'post') {
              return 'curtidas';
            }
          }
        } catch (e) {
          // Ignora erros de parse
        }
      }
      
      return null;
    }
    
    // Função para calcular o custo de um pedido
    function calcularCustoPedido(pedido) {
      const quantidade = extrairQuantidadeOriginal(pedido);
      if (!quantidade) return null;
      
      const tipoServico = determinarTipoServico(pedido);
      if (!tipoServico || !CUSTOS_REFERENCIA[tipoServico]) return null;
      
      const referencia = CUSTOS_REFERENCIA[tipoServico];
      const custoUnitario = referencia.custo / referencia.quantidade;
      const custoPedido = custoUnitario * quantidade;
      
      return {
        tipoServico,
        serviceName: extrairNomeServico(pedido),
        quantidade,
        custoUnitario,
        custoPedido,
        referenciaQuantidade: referencia.quantidade,
        referenciaCusto: referencia.custo
      };
    }
    
    // Processa os pedidos e calcula os custos
    const custosPorProvedor = new Map();
    const pedidosPorProvedor = new Map();
    let custoTotalCalculado = 0;
    let totalPedidosComCusto = 0;
    
    // Prepara os dados para o relatório
    const relatorioPedidos = [];
    
    for (const pedido of orders) {
      // Extrai o provedor
      const provedor = pedido.provider_id ? `provider_${pedido.provider_id}` : 'desconhecido';
      
      // Adiciona ao contador de pedidos por provedor
      if (!pedidosPorProvedor.has(provedor)) {
        pedidosPorProvedor.set(provedor, 0);
        custosPorProvedor.set(provedor, 0);
      }
      
      pedidosPorProvedor.set(provedor, pedidosPorProvedor.get(provedor) + 1);
      
      // Calcula o custo do pedido
      const resultado = calcularCustoPedido(pedido);
      
      if (resultado) {
        custoTotalCalculado += resultado.custoPedido;
        totalPedidosComCusto++;
        
        // Adiciona ao mapa de custos por provedor
        custosPorProvedor.set(provedor, custosPorProvedor.get(provedor) + resultado.custoPedido);
        
        // Adiciona ao relatório
        relatorioPedidos.push({
          id: pedido.id,
          transaction_id: pedido.transaction_id,
          service_id: pedido.service_id,
          service_name: resultado.serviceName,
          tipo_servico: resultado.tipoServico,
          quantidade: resultado.quantidade,
          provider: provedor,
          external_service_id: pedido.external_service_id,
          external_order_id: pedido.external_order_id,
          status: pedido.status,
          target_url: pedido.target_url,
          target_username: pedido.target_username,
          created_at: format(new Date(pedido.created_at), 'dd/MM/yyyy HH:mm:ss'),
          referencia_quantidade: resultado.referenciaQuantidade,
          referencia_custo: resultado.referenciaCusto,
          custo_unitario: resultado.custoUnitario,
          custo_calculado: resultado.custoPedido
        });
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
    const nomeArquivoExcel = `relatorio_custos_orders_ajustado_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
    
    // Cria uma nova planilha
    const wb = XLSX.utils.book_new();
    
    // Adiciona a planilha de pedidos
    const wsPedidos = XLSX.utils.json_to_sheet(relatorioPedidos.map(item => ({
      'ID do Pedido': item.id,
      'Transaction ID': item.transaction_id,
      'ID do Serviço': item.service_id || '',
      'Nome do Serviço': item.service_name || '',
      'Tipo de Serviço': item.tipo_servico,
      'Quantidade': item.quantidade || '',
      'Provedor': item.provider,
      'External Service ID': item.external_service_id,
      'External Order ID': item.external_order_id,
      'Status': item.status,
      'URL Alvo': item.target_url,
      'Username Alvo': item.target_username,
      'Data de Criação': item.created_at,
      'Quantidade de Referência': item.referencia_quantidade,
      'Custo de Referência (R$)': item.referencia_custo,
      'Custo Unitário (R$)': item.custo_unitario,
      'Custo Calculado (R$)': item.custo_calculado,
      'Fórmula': `(${item.referencia_custo} / ${item.referencia_quantidade}) * ${item.quantidade} = ${item.custo_calculado.toFixed(2)}`
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
