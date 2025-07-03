const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
const { Pool } = require('pg');

// Configuração da conexão direta com o PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway'
});

async function main() {
  try {
    console.log('Calculando gastos com produtos...');
    
    // Caminho para o arquivo Excel com os custos dos serviços
    const excelFilePath = path.resolve(process.cwd(), 'servicos_ativos_custos_2025-05-29_novo.xlsx');
    
    // Verifica se o arquivo existe
    if (!fs.existsSync(excelFilePath)) {
      throw new Error(`Arquivo Excel não encontrado: ${excelFilePath}`);
    }
    
    // Lê o arquivo Excel
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converte os dados do Excel para JSON com cabeçalhos
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Mapa para armazenar os pacotes de serviço por ID
    const pacotesPorServico = new Map();
    
    // Mapa para armazenar os serviços por nome
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
        // Calcula o custo unitário
        const custoUnitario = quantidade > 0 ? custoTotal / quantidade : 0;
        
        // Adiciona ao mapa por ID
        if (!pacotesPorServico.has(id)) {
          pacotesPorServico.set(id, []);
        }
        pacotesPorServico.get(id).push({ id, nome, tipo, quantidade, custoTotal, custoUnitario });
        
        // Adiciona ao mapa por nome
        const nomeChave = nome.toLowerCase();
        if (!servicosPorNome.has(nomeChave)) {
          servicosPorNome.set(nomeChave, []);
        }
        servicosPorNome.get(nomeChave).push({ id, nome, tipo, quantidade, custoTotal, custoUnitario });
      }
    }
    
    // Define o período de análise
    const dataInicio = new Date('2025-03-02');
    const dataFim = new Date('2025-05-16T23:59:59');
    
    console.log(`Analisando transações no período de ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}...`);
    
    // Busca apenas as transações aprovadas no período especificado
    const queryTransacoes = `
      SELECT 
        t.id, 
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
    
    // Função para extrair a quantidade de uma transação
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
    
    // Função para encontrar o pacote de referência para uma transação
    function encontrarPacoteReferencia(serviceId, serviceName) {
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
    
    // Processa as transações e calcula os custos
    let totalTransacoes = 0;
    let valorTotalTransacoes = 0;
    let custoTotalCalculado = 0;
    
    for (const transacao of transacoes) {
      totalTransacoes++;
      valorTotalTransacoes += parseFloat(transacao.amount);
      
      const serviceId = transacao.service_id;
      const serviceName = transacao.service_name;
      
      // Encontra o pacote de referência para o serviço
      const pacoteReferencia = encontrarPacoteReferencia(serviceId, serviceName);
      
      if (pacoteReferencia) {
        // Extrai a quantidade da transação
        const quantidadeTransacao = extrairQuantidadeTransacao(transacao);
        
        if (quantidadeTransacao) {
          // Calcula o custo proporcional
          const custoCalculado = pacoteReferencia.custoUnitario * parseInt(quantidadeTransacao, 10);
          custoTotalCalculado += custoCalculado;
        }
      }
    }
    
    // Exibe o resumo
    console.log('\n=== RESUMO DO PERÍODO DE 02/03/2025 ATÉ 16/05/2025 ===');
    console.log(`Total de transações aprovadas: ${totalTransacoes}`);
    console.log(`Valor total das transações: R$ ${valorTotalTransacoes.toFixed(2)}`);
    console.log(`VALOR TOTAL GASTO COM PRODUTOS: R$ ${custoTotalCalculado.toFixed(2)}`);
    console.log(`Lucro total: R$ ${(valorTotalTransacoes - custoTotalCalculado).toFixed(2)}`);
    console.log(`Margem de lucro média: ${((valorTotalTransacoes - custoTotalCalculado) / valorTotalTransacoes * 100).toFixed(2)}%`);
    
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
