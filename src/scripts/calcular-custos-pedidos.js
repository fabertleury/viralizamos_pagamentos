const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
const { Pool } = require('pg');

// Configuração da conexão direta com o PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway'
});

// Interface para os dados de custo do serviço
class ServicoCusto {
  constructor(id, nome, tipo, quantidade, custoTotal) {
    this.id = id;
    this.nome = nome;
    this.tipo = tipo;
    this.quantidade = quantidade;
    this.custoTotal = custoTotal;
    // Calcula o custo unitário (por item)
    this.custoUnitario = this.quantidade > 0 ? this.custoTotal / this.quantidade : 0;
  }
}

// Mapeamento de IDs de serviço conhecidos para facilitar a correspondência
const MAPEAMENTO_SERVICOS = {
  // ID do serviço "Seguidores Instagram" que aparece nas transações mas não está no Excel
  '927ebc73-2105-44a2-8171-e9cc04e22415': {
    nomeServico: 'Seguidores Instagram',
    // Aqui você pode definir um ID de referência que existe no Excel
    idReferencia: null, // Será preenchido dinamicamente ao encontrar um serviço similar
    tipoCorrespondencia: 'nome'
  }
};

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
    
    // Verifica se temos pelo menos a linha de cabeçalho
    if (rows.length < 2) {
      throw new Error('Arquivo Excel não contém dados suficientes');
    }
    
    // Mapa para armazenar os pacotes de serviço por ID
    const pacotesPorServico = new Map();
    
    // Mapa para armazenar os serviços por nome (para busca por nome)
    const servicosPorNome = new Map();
    
    // Processa as linhas do Excel (pula a linha de cabeçalho)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Verifica se a linha tem dados suficientes
      if (row.length < 10) continue;
      
      // Extrai os dados conforme as colunas especificadas
      const id = row[0]?.toString(); // Coluna A: ID do serviço
      const nome = row[1]?.toString(); // Coluna B: Nome do serviço
      const tipo = row[2]?.toString(); // Coluna C: Tipo
      const quantidade = parseInt(row[3], 10); // Coluna D: Quantidade do pacote
      const custoTotal = parseFloat(row[9]); // Coluna J: Custo total do pacote
      
      // Verifica se temos dados válidos
      if (id && nome && !isNaN(quantidade) && !isNaN(custoTotal)) {
        // Cria um objeto ServicoCusto
        const servicoCusto = new ServicoCusto(id, nome, tipo, quantidade, custoTotal);
        
        // Adiciona ao mapa por ID
        if (!pacotesPorServico.has(id)) {
          pacotesPorServico.set(id, []);
        }
        pacotesPorServico.get(id).push(servicoCusto);
        
        // Adiciona ao mapa por nome (para busca por nome)
        const nomeChave = nome.toLowerCase();
        if (!servicosPorNome.has(nomeChave)) {
          servicosPorNome.set(nomeChave, []);
        }
        servicosPorNome.get(nomeChave).push(servicoCusto);
        
        // Verifica se é um serviço que pode ser usado como referência para os mapeamentos
        for (const [idDesconhecido, info] of Object.entries(MAPEAMENTO_SERVICOS)) {
          if (info.tipoCorrespondencia === 'nome' && 
              nome.toLowerCase().includes(info.nomeServico.toLowerCase()) && 
              !info.idReferencia) {
            console.log(`Encontrado serviço de referência para "${info.nomeServico}": ${id} (${nome})`);
            MAPEAMENTO_SERVICOS[idDesconhecido].idReferencia = id;
          }
        }
      }
    }
    
    // Para cada serviço, ordena os pacotes por quantidade (do menor para o maior)
    pacotesPorServico.forEach((pacotes) => {
      pacotes.sort((a, b) => a.quantidade - b.quantidade);
    });
    
    console.log(`Mapa de custos criado com ${pacotesPorServico.size} serviços diferentes`);
    
    // Define o período de análise
    const dataInicio = new Date('2025-03-02');
    const dataFim = new Date('2025-05-16T23:59:59');
    
    console.log(`Buscando transações e pedidos no período de ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}...`);
    
    // Busca as transações aprovadas no período especificado
    const queryTransacoes = `
      SELECT 
        t.id as transaction_id, 
        t.payment_request_id, 
        t.status, 
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
      ORDER BY 
        t.created_at ASC
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
      ORDER BY 
        o.created_at ASC
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
    
    // Função para encontrar o pacote de referência para um pedido
    function encontrarPacoteReferencia(serviceId, serviceName) {
      // Verifica se o ID está no mapeamento de serviços conhecidos
      if (MAPEAMENTO_SERVICOS[serviceId] && MAPEAMENTO_SERVICOS[serviceId].idReferencia) {
        const idReferencia = MAPEAMENTO_SERVICOS[serviceId].idReferencia;
        if (pacotesPorServico.has(idReferencia)) {
          const pacotes = pacotesPorServico.get(idReferencia);
          return pacotes.length > 0 ? pacotes[0] : null;
        }
      }
      
      // Verifica se o ID está diretamente no mapa de pacotes
      if (pacotesPorServico.has(serviceId)) {
        const pacotes = pacotesPorServico.get(serviceId);
        return pacotes.length > 0 ? pacotes[0] : null;
      }
      
      // Tenta encontrar por nome similar
      if (serviceName) {
        const nomeServico = serviceName.toLowerCase();
        
        // Procura por correspondências exatas no nome
        for (const [nome, pacotes] of servicosPorNome.entries()) {
          if (nome === nomeServico && pacotes.length > 0) {
            return pacotes[0];
          }
        }
        
        // Procura por correspondências parciais no nome
        for (const [nome, pacotes] of servicosPorNome.entries()) {
          // Verifica se o nome do serviço contém palavras-chave como "seguidores", "curtidas", etc.
          if ((nome.includes('seguidores') && nomeServico.includes('seguidores')) ||
              (nome.includes('curtidas') && nomeServico.includes('curtidas')) ||
              (nome.includes('views') && nomeServico.includes('views')) ||
              (nome.includes('comentários') && nomeServico.includes('comentários'))) {
            return pacotes[0];
          }
        }
      }
      
      return null;
    }
    
    // Processa os pedidos e calcula os custos
    const relatorioPedidos = [];
    let totalTransacoes = 0;
    let totalPedidos = 0;
    let totalPedidosComCusto = 0;
    let valorTotalTransacoes = 0;
    let custoTotalCalculado = 0;
    
    for (const transacao of transacoes) {
      totalTransacoes++;
      valorTotalTransacoes += parseFloat(transacao.amount);
      
      // Obtém os pedidos desta transação
      const pedidosTransacao = pedidosPorTransacao.get(transacao.transaction_id) || [];
      
      // Se não houver pedidos, tenta usar a própria transação como um pedido único
      if (pedidosTransacao.length === 0) {
        totalPedidos++;
        
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
          // Encontra o pacote de referência para o serviço
          const pacoteReferencia = encontrarPacoteReferencia(transacao.service_id, transacao.service_name);
          
          if (pacoteReferencia) {
            // Calcula o custo proporcional
            const custoUnitario = pacoteReferencia.custoUnitario;
            const custoCalculado = custoUnitario * parseInt(quantidade, 10);
            
            custoTotalCalculado += custoCalculado;
            totalPedidosComCusto++;
            
            relatorioPedidos.push({
              transaction_id: transacao.transaction_id,
              order_id: null,
              service_id: transacao.service_id,
              service_name: transacao.service_name,
              quantidade: quantidade,
              valor_transacao: parseFloat(transacao.amount),
              pacote_referencia: {
                id: pacoteReferencia.id,
                nome: pacoteReferencia.nome,
                quantidade: pacoteReferencia.quantidade,
                custo_total: pacoteReferencia.custoTotal
              },
              custo_unitario: custoUnitario,
              custo_calculado: custoCalculado,
              data_criacao: format(new Date(transacao.created_at), 'dd/MM/yyyy HH:mm:ss')
            });
          }
        }
      } else {
        // Processa cada pedido individualmente
        for (const pedido of pedidosTransacao) {
          totalPedidos++;
          
          // Verifica se o pedido tem quantidade
          if (pedido.quantity) {
            // Encontra o pacote de referência para o serviço
            const pacoteReferencia = encontrarPacoteReferencia(pedido.service_id, pedido.service_name);
            
            if (pacoteReferencia) {
              // Calcula o custo proporcional
              const custoUnitario = pacoteReferencia.custoUnitario;
              const custoCalculado = custoUnitario * parseInt(pedido.quantity, 10);
              
              custoTotalCalculado += custoCalculado;
              totalPedidosComCusto++;
              
              relatorioPedidos.push({
                transaction_id: pedido.transaction_id,
                order_id: pedido.order_id,
                service_id: pedido.service_id,
                service_name: pedido.service_name,
                quantidade: pedido.quantity,
                valor_transacao: parseFloat(transacao.amount) / pedidosTransacao.length, // Divide o valor da transação pelo número de pedidos
                pacote_referencia: {
                  id: pacoteReferencia.id,
                  nome: pacoteReferencia.nome,
                  quantidade: pacoteReferencia.quantidade,
                  custo_total: pacoteReferencia.custoTotal
                },
                custo_unitario: custoUnitario,
                custo_calculado: custoCalculado,
                data_criacao: format(new Date(pedido.created_at), 'dd/MM/yyyy HH:mm:ss')
              });
            }
          }
        }
      }
    }
    
    // Gera o relatório final
    console.log('\n=== RELATÓRIO DE CUSTOS DOS PEDIDOS INDIVIDUAIS ===');
    console.log(`Período: ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}`);
    console.log(`Total de transações: ${totalTransacoes}`);
    console.log(`Total de pedidos: ${totalPedidos}`);
    console.log(`Pedidos com custo calculado: ${totalPedidosComCusto} (${((totalPedidosComCusto / totalPedidos) * 100).toFixed(2)}%)`);
    console.log(`Valor total das transações: R$ ${valorTotalTransacoes.toFixed(2)}`);
    console.log(`VALOR TOTAL GASTO COM PRODUTOS: R$ ${custoTotalCalculado.toFixed(2)}`);
    console.log(`Lucro total: R$ ${(valorTotalTransacoes - custoTotalCalculado).toFixed(2)}`);
    console.log(`Margem de lucro média: ${((valorTotalTransacoes - custoTotalCalculado) / valorTotalTransacoes * 100).toFixed(2)}%`);
    
    // Salva o relatório em um arquivo Excel
    const nomeArquivoExcel = `relatorio_custos_pedidos_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
    
    // Prepara os dados para o Excel
    const dadosExcel = relatorioPedidos.map(item => ({
      'ID da Transação': item.transaction_id,
      'ID do Pedido': item.order_id || 'N/A',
      'ID do Serviço': item.service_id || '',
      'Nome do Serviço': item.service_name || '',
      'Quantidade': item.quantidade || '',
      'Valor da Transação (R$)': item.valor_transacao,
      'ID do Pacote de Referência': item.pacote_referencia ? item.pacote_referencia.id : '',
      'Nome do Pacote de Referência': item.pacote_referencia ? item.pacote_referencia.nome : '',
      'Quantidade do Pacote de Referência': item.pacote_referencia ? item.pacote_referencia.quantidade : '',
      'Custo do Pacote de Referência (R$)': item.pacote_referencia ? item.pacote_referencia.custo_total : '',
      'Custo Unitário (R$)': item.custo_unitario || '',
      'Custo Calculado (R$)': item.custo_calculado || '',
      'Lucro (R$)': item.valor_transacao - item.custo_calculado,
      'Margem de Lucro (%)': ((item.valor_transacao - item.custo_calculado) / item.valor_transacao * 100).toFixed(2) + '%',
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
    
    // Exibe alguns pedidos de exemplo no console
    console.log('\n=== EXEMPLOS DE PEDIDOS ===');
    for (let i = 0; i < Math.min(5, relatorioPedidos.length); i++) {
      const item = relatorioPedidos[i];
      console.log(`\nPedido #${i+1}:`);
      console.log(`  ID da Transação: ${item.transaction_id}`);
      console.log(`  ID do Pedido: ${item.order_id || 'N/A'}`);
      console.log(`  Serviço: ${item.service_name} (${item.service_id})`);
      console.log(`  Quantidade: ${item.quantidade}`);
      console.log(`  Valor da Transação: R$ ${item.valor_transacao.toFixed(2)}`);
      
      if (item.pacote_referencia) {
        console.log(`  Pacote Referência: ${item.pacote_referencia.nome} (${item.pacote_referencia.quantidade} unidades por R$ ${item.pacote_referencia.custo_total.toFixed(2)})`);
        console.log(`  Custo Unitário: R$ ${item.custo_unitario.toFixed(6)}`);
      } else {
        console.log(`  Pacote Referência: N/A`);
      }
      
      console.log(`  Custo Calculado: R$ ${item.custo_calculado.toFixed(2)}`);
      console.log(`  Lucro: R$ ${(item.valor_transacao - item.custo_calculado).toFixed(2)}`);
      console.log(`  Margem de Lucro: ${((item.valor_transacao - item.custo_calculado) / item.valor_transacao * 100).toFixed(2)}%`);
      console.log(`  Data de Criação: ${item.data_criacao}`);
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    // Fecha a conexão com o banco de dados
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
