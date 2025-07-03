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
  }
}

async function main() {
  try {
    console.log('Iniciando cálculo de custos das transações...');
    
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
    
    // Mapa para armazenar os pacotes de serviço por ID e quantidade
    const pacotesPorServico = new Map();
    
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
        // Cria uma chave composta de ID do serviço
        const key = id;
        
        // Se o ID já existe no mapa, adiciona o pacote à lista de pacotes para esse serviço
        if (!pacotesPorServico.has(key)) {
          pacotesPorServico.set(key, []);
        }
        
        // Adiciona o pacote à lista
        pacotesPorServico.get(key).push(new ServicoCusto(id, nome, tipo, quantidade, custoTotal));
      }
    }
    
    console.log(`Encontrados pacotes para ${pacotesPorServico.size} serviços diferentes no arquivo Excel`);
    
    // Para cada serviço, ordena os pacotes por quantidade (do menor para o maior)
    pacotesPorServico.forEach((pacotes) => {
      pacotes.sort((a, b) => a.quantidade - b.quantidade);
    });
    
    console.log(`Mapa de custos criado com ${pacotesPorServico.size} serviços diferentes`);
    
    // Define o período de análise
    const dataInicio = new Date('2025-05-01');
    const dataFim = new Date('2025-05-30T23:59:59');
    
    console.log(`Buscando transações no período de ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}...`);
    
    // Busca apenas as transações aprovadas no período especificado usando SQL direto
    const queryTransacoes = `
      SELECT 
        t.id, 
        t.payment_request_id, 
        t.external_id, 
        t.status, 
        t.method, 
        t.amount, 
        t.provider, 
        t.created_at, 
        t.processed_at,
        pr.service_id,
        pr.service_name,
        pr.customer_email,
        pr.customer_name,
        pr.additional_data,
        prl.provider_id,
        prl.service_id as provider_service_id,
        prl.response_data
      FROM 
        transactions t
      LEFT JOIN 
        payment_requests pr ON t.payment_request_id = pr.id
      LEFT JOIN
        provider_response_logs prl ON t.id = prl.transaction_id
      WHERE 
        t.created_at >= $1 AND t.created_at <= $2
        AND t.status = 'approved'
      ORDER BY 
        t.created_at ASC
      LIMIT 50
    `;
    
    // Limitamos a 50 transações para facilitar o diagnóstico
    
    const { rows: transacoes } = await pool.query(queryTransacoes, [dataInicio, dataFim]);
    
    console.log(`Encontradas ${transacoes.length} transações no período`);
    
    // Imprime os IDs dos serviços no arquivo Excel para diagnóstico
    console.log('\nIDs dos serviços no arquivo Excel:');
    for (const [id, pacotes] of pacotesPorServico.entries()) {
      console.log(`ID: ${id}, Nome: ${pacotes[0].nome}, Pacotes: ${pacotes.map(p => p.quantidade).join(', ')}`);
    }
    
    // Função para encontrar o pacote correto para uma transação
    function encontrarPacoteCorreto(serviceId, amount, additionalData, serviceName) {
      console.log(`\nAnalisando transação - ServiceID: ${serviceId || 'N/A'}, Nome: ${serviceName || 'N/A'}, Valor: ${amount}`);
      
      // Verifica se temos pacotes para este serviço
      if (!serviceId) {
        console.log('  - Sem service_id na transação');
        return null;
      }
      
      if (!pacotesPorServico.has(serviceId)) {
        console.log(`  - ID ${serviceId} não encontrado no arquivo Excel`);
        
        // Tenta encontrar por nome similar
        let servicoSimilar = null;
        for (const [id, pacotes] of pacotesPorServico.entries()) {
          const nomePacote = pacotes[0].nome.toLowerCase();
          const nomeServico = (serviceName || '').toLowerCase();
          
          if (nomePacote.includes('seguidores') && nomeServico.includes('seguidores')) {
            console.log(`  - Encontrado serviço similar por nome: ${id} (${pacotes[0].nome})`);
            servicoSimilar = id;
            break;
          }
        }
        
        if (servicoSimilar) {
          return pacotesPorServico.get(servicoSimilar)[0];
        }
        
        return null;
      }
      
      const pacotes = pacotesPorServico.get(serviceId);
      console.log(`  - Encontrados ${pacotes.length} pacotes para o serviço ${serviceId}`);
      
      // Tenta extrair a quantidade do additional_data (se disponível)
      let quantidadeComprada = null;
      if (additionalData) {
        try {
          console.log(`  - Additional data: ${additionalData}`);
          const additionalDataObj = JSON.parse(additionalData);
          quantidadeComprada = additionalDataObj.quantity || additionalDataObj.quantidade;
          console.log(`  - Quantidade extraída: ${quantidadeComprada}`);
        } catch (e) {
          console.log(`  - Erro ao fazer parse do additional_data: ${e.message}`);
        }
      } else {
        console.log('  - Sem additional_data na transação');
      }
      
      // Se conseguimos extrair a quantidade, procura o pacote com essa quantidade exata
      if (quantidadeComprada) {
        const pacoteExato = pacotes.find(p => p.quantidade === parseInt(quantidadeComprada, 10));
        if (pacoteExato) {
          console.log(`  - Pacote encontrado pela quantidade exata: ${pacoteExato.quantidade}`);
          return pacoteExato;
        }
      }
      
      // Se não encontrou por quantidade, tenta encontrar pelo valor mais próximo
      // Ordena os pacotes do mais caro para o mais barato
      const pacotesOrdenados = [...pacotes].sort((a, b) => b.quantidade - a.quantidade);
      
      // Encontra o primeiro pacote com quantidade menor ou igual ao valor da transação
      for (const pacote of pacotesOrdenados) {
        if (pacote.quantidade <= amount) {
          console.log(`  - Pacote encontrado pelo valor: ${pacote.quantidade}`);
          return pacote;
        }
      }
      
      // Se não encontrou nenhum pacote adequado, retorna o menor pacote disponível
      console.log(`  - Usando o menor pacote disponível: ${pacotes[0].quantidade}`);
      return pacotes[0] || null;
    }
    
    // Processa as transações e calcula os custos
    const transacoesComCusto = transacoes.map(transacao => {
      const serviceId = transacao.service_id || null;
      const pacote = encontrarPacoteCorreto(serviceId, transacao.amount, transacao.additional_data, transacao.service_name);
      
      const custoTotal = pacote ? pacote.custoTotal : null;
      const margem = custoTotal !== null ? transacao.amount - custoTotal : null;
      const margemPercentual = custoTotal !== null && transacao.amount > 0 ? ((transacao.amount - custoTotal) / transacao.amount) * 100 : null;
      
      return {
        id: transacao.id,
        payment_request_id: transacao.payment_request_id,
        external_id: transacao.external_id,
        status: transacao.status,
        method: transacao.method,
        amount: transacao.amount,
        provider: transacao.provider,
        created_at: transacao.created_at,
        processed_at: transacao.processed_at,
        service_id: serviceId,
        service_name: transacao.service_name || null,
        customer_email: transacao.customer_email || '',
        customer_name: transacao.customer_name || '',
        pacote_quantidade: pacote ? pacote.quantidade : null,
        pacote_tipo: pacote ? pacote.tipo : null,
        custo: custoTotal,
        margem: margem,
        margem_percentual: margemPercentual
      };
    });
    
    console.log('Gerando relatório Excel...');
    
    // Cria uma nova planilha com os resultados
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(transacoesComCusto);
    
    // Adiciona a planilha ao workbook
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Transações com Custos');
    
    // Define o caminho para o arquivo de saída
    const outputFilePath = path.resolve(process.cwd(), `relatorio_custos_transacoes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    // Salva o arquivo Excel
    XLSX.writeFile(newWorkbook, outputFilePath);
    
    console.log(`Relatório gerado com sucesso: ${outputFilePath}`);
    
    // Calcula estatísticas
    const transacoesComCustoValido = transacoesComCusto.filter(t => t.custo !== null);
    const totalTransacoes = transacoesComCusto.length;
    const totalValorTransacoes = transacoesComCusto.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalCusto = transacoesComCustoValido.reduce((sum, t) => sum + (parseFloat(t.custo) || 0), 0);
    const totalMargem = transacoesComCustoValido.reduce((sum, t) => sum + (parseFloat(t.margem) || 0), 0);
    const margemMediaPercentual = totalValorTransacoes > 0 ? (totalMargem / totalValorTransacoes) * 100 : 0;
    
    console.log('\nEstatísticas:');
    console.log(`Total de transações: ${totalTransacoes}`);
    console.log(`Total valor das transações: R$ ${totalValorTransacoes.toFixed(2)}`);
    console.log(`Total custo: R$ ${totalCusto.toFixed(2)}`);
    console.log(`Total margem: R$ ${totalMargem.toFixed(2)}`);
    console.log(`Margem média: ${margemMediaPercentual.toFixed(2)}%`);
    
    // Gera um resumo por serviço
    console.log('\nGerando resumo por serviço...');
    
    // Agrupa transações por serviço
    const resumoPorServico = new Map();
    
    transacoesComCusto.forEach(transacao => {
      if (!transacao.service_id) return;
      
      const key = transacao.service_id;
      const existingData = resumoPorServico.get(key) || {
        service_id: transacao.service_id,
        service_name: transacao.service_name || 'Desconhecido',
        total_transacoes: 0,
        total_valor: 0,
        total_custo: 0,
        total_margem: 0,
        margem_percentual: 0
      };
      
      existingData.total_transacoes += 1;
      existingData.total_valor += parseFloat(transacao.amount);
      existingData.total_custo += parseFloat(transacao.custo) || 0;
      existingData.total_margem += parseFloat(transacao.margem) || 0;
      
      resumoPorServico.set(key, existingData);
    });
    
    // Calcula a margem percentual para cada serviço
    resumoPorServico.forEach(servico => {
      servico.margem_percentual = servico.total_valor > 0 
        ? (servico.total_margem / servico.total_valor) * 100 
        : 0;
    });
    
    // Converte o mapa para array para exportar para Excel
    const resumoArray = Array.from(resumoPorServico.values());
    
    // Cria uma nova planilha com o resumo por serviço
    const resumoWorksheet = XLSX.utils.json_to_sheet(resumoArray);
    
    // Adiciona a planilha ao workbook existente
    XLSX.utils.book_append_sheet(newWorkbook, resumoWorksheet, 'Resumo por Serviço');
    
    // Salva o arquivo Excel novamente com a nova planilha
    XLSX.writeFile(newWorkbook, outputFilePath);
    
    console.log(`Relatório atualizado com resumo por serviço: ${outputFilePath}`);
    
  } catch (error) {
    console.error('Erro ao processar os dados:', error);
  } finally {
    // Fecha a conexão com o pool
    await pool.end();
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
