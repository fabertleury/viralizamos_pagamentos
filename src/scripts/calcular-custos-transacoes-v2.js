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
    console.log('Iniciando cálculo de custos das transações (v2)...');
    
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
    `;
    
    const { rows: transacoes } = await pool.query(queryTransacoes, [dataInicio, dataFim]);
    
    console.log(`Encontradas ${transacoes.length} transações no período`);
    
    // Imprime os IDs dos serviços no arquivo Excel para diagnóstico
    console.log('\nIDs dos serviços no arquivo Excel:');
    for (const [id, pacotes] of pacotesPorServico.entries()) {
      console.log(`ID: ${id}, Nome: ${pacotes[0].nome}, Pacotes: ${pacotes.map(p => p.quantidade).join(', ')}`);
    }
    
    // Função para extrair a quantidade de uma transação
    function extrairQuantidadeTransacao(transacao) {
      if (!transacao.additional_data) {
        return null;
      }
      
      try {
        const additionalData = JSON.parse(transacao.additional_data);
        return additionalData.quantity || additionalData.quantidade || null;
      } catch (e) {
        console.log(`Erro ao fazer parse do additional_data: ${e.message}`);
        return null;
      }
    }
    
    // Função para encontrar o pacote de referência para uma transação
    function encontrarPacoteReferencia(serviceId, serviceName) {
      // Verifica se o ID está no mapeamento de serviços conhecidos
      if (MAPEAMENTO_SERVICOS[serviceId] && MAPEAMENTO_SERVICOS[serviceId].idReferencia) {
        const idReferencia = MAPEAMENTO_SERVICOS[serviceId].idReferencia;
        if (pacotesPorServico.has(idReferencia)) {
          const pacotes = pacotesPorServico.get(idReferencia);
          console.log(`Usando ID de referência ${idReferencia} para o serviço ${serviceId} (${serviceName})`);
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
            console.log(`Encontrado serviço por nome exato: ${pacotes[0].id} (${pacotes[0].nome})`);
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
            console.log(`Encontrado serviço similar por nome: ${pacotes[0].id} (${pacotes[0].nome})`);
            return pacotes[0];
          }
        }
      }
      
      return null;
    }
    
    // Função para calcular o custo de uma transação
    function calcularCustoTransacao(transacao) {
      const serviceId = transacao.service_id;
      const serviceName = transacao.service_name;
      
      console.log(`\nAnalisando transação - ID: ${transacao.id}, ServiceID: ${serviceId || 'N/A'}, Nome: ${serviceName || 'N/A'}, Valor: ${transacao.amount}`);
      
      // Encontra o pacote de referência para o serviço
      const pacoteReferencia = encontrarPacoteReferencia(serviceId, serviceName);
      
      if (!pacoteReferencia) {
        console.log(`  - Não foi possível encontrar um pacote de referência para o serviço ${serviceId} (${serviceName})`);
        return {
          custoCalculado: null,
          pacoteReferencia: null,
          quantidadeTransacao: null,
          custoUnitario: null
        };
      }
      
      // Extrai a quantidade da transação
      const quantidadeTransacao = extrairQuantidadeTransacao(transacao);
      
      if (!quantidadeTransacao) {
        console.log(`  - Não foi possível extrair a quantidade da transação ${transacao.id}`);
        return {
          custoCalculado: null,
          pacoteReferencia: pacoteReferencia,
          quantidadeTransacao: null,
          custoUnitario: pacoteReferencia.custoUnitario
        };
      }
      
      // Calcula o custo proporcional
      const custoUnitario = pacoteReferencia.custoUnitario;
      const custoCalculado = custoUnitario * parseInt(quantidadeTransacao, 10);
      
      console.log(`  - Custo unitário: ${custoUnitario.toFixed(6)} (${pacoteReferencia.custoTotal}/${pacoteReferencia.quantidade})`);
      console.log(`  - Quantidade da transação: ${quantidadeTransacao}`);
      console.log(`  - Custo calculado: ${custoCalculado.toFixed(2)}`);
      
      return {
        custoCalculado,
        pacoteReferencia,
        quantidadeTransacao,
        custoUnitario
      };
    }
    
    // Processa as transações e calcula os custos
    const relatorio = [];
    let totalTransacoes = 0;
    let totalComCusto = 0;
    let valorTotalTransacoes = 0;
    let custoTotalCalculado = 0;
    
    for (const transacao of transacoes) {
      totalTransacoes++;
      valorTotalTransacoes += parseFloat(transacao.amount);
      
      const resultado = calcularCustoTransacao(transacao);
      
      if (resultado.custoCalculado !== null) {
        totalComCusto++;
        custoTotalCalculado += resultado.custoCalculado;
      }
      
      relatorio.push({
        id: transacao.id,
        payment_request_id: transacao.payment_request_id,
        service_id: transacao.service_id,
        service_name: transacao.service_name,
        customer_name: transacao.customer_name,
        customer_email: transacao.customer_email,
        created_at: format(new Date(transacao.created_at), 'dd/MM/yyyy HH:mm:ss'),
        amount: parseFloat(transacao.amount),
        quantidade: resultado.quantidadeTransacao,
        pacote_referencia: resultado.pacoteReferencia ? {
          id: resultado.pacoteReferencia.id,
          nome: resultado.pacoteReferencia.nome,
          quantidade: resultado.pacoteReferencia.quantidade,
          custo_total: resultado.pacoteReferencia.custoTotal
        } : null,
        custo_unitario: resultado.custoUnitario,
        custo_calculado: resultado.custoCalculado,
        lucro: resultado.custoCalculado !== null ? parseFloat(transacao.amount) - resultado.custoCalculado : null,
        margem_lucro: resultado.custoCalculado !== null ? ((parseFloat(transacao.amount) - resultado.custoCalculado) / parseFloat(transacao.amount) * 100).toFixed(2) + '%' : null
      });
    }
    
    // Gera o relatório final
    console.log('\n=== RELATÓRIO DE CUSTOS DE TRANSAÇÕES ===');
    console.log(`Período: ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}`);
    console.log(`Total de transações: ${totalTransacoes}`);
    console.log(`Transações com custo calculado: ${totalComCusto} (${((totalComCusto / totalTransacoes) * 100).toFixed(2)}%)`);
    console.log(`Valor total das transações: R$ ${valorTotalTransacoes.toFixed(2)}`);
    console.log(`Custo total calculado: R$ ${custoTotalCalculado.toFixed(2)}`);
    console.log(`Lucro total: R$ ${(valorTotalTransacoes - custoTotalCalculado).toFixed(2)}`);
    console.log(`Margem de lucro média: ${((valorTotalTransacoes - custoTotalCalculado) / valorTotalTransacoes * 100).toFixed(2)}%`);
    
    // Salva o relatório em um arquivo JSON
    const nomeArquivoRelatorio = `relatorio_custos_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;
    fs.writeFileSync(nomeArquivoRelatorio, JSON.stringify(relatorio, null, 2));
    console.log(`\nRelatório salvo em: ${nomeArquivoRelatorio}`);
    
    // Salva o relatório em um arquivo CSV
    const nomeArquivoCSV = `relatorio_custos_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
    const cabecalhoCSV = 'ID,Payment Request ID,Service ID,Service Name,Customer Name,Customer Email,Created At,Amount,Quantidade,Pacote Referencia ID,Pacote Referencia Nome,Pacote Referencia Quantidade,Pacote Referencia Custo,Custo Unitario,Custo Calculado,Lucro,Margem Lucro\n';
    
    let conteudoCSV = cabecalhoCSV;
    for (const item of relatorio) {
      conteudoCSV += `"${item.id}",`;
      conteudoCSV += `"${item.payment_request_id}",`;
      conteudoCSV += `"${item.service_id || ''}",`;
      conteudoCSV += `"${item.service_name || ''}",`;
      conteudoCSV += `"${item.customer_name || ''}",`;
      conteudoCSV += `"${item.customer_email || ''}",`;
      conteudoCSV += `"${item.created_at}",`;
      conteudoCSV += `${item.amount},`;
      conteudoCSV += `${item.quantidade || ''},`;
      conteudoCSV += `"${item.pacote_referencia ? item.pacote_referencia.id : ''}",`;
      conteudoCSV += `"${item.pacote_referencia ? item.pacote_referencia.nome : ''}",`;
      conteudoCSV += `${item.pacote_referencia ? item.pacote_referencia.quantidade : ''},`;
      conteudoCSV += `${item.pacote_referencia ? item.pacote_referencia.custo_total : ''},`;
      conteudoCSV += `${item.custo_unitario || ''},`;
      conteudoCSV += `${item.custo_calculado || ''},`;
      conteudoCSV += `${item.lucro || ''},`;
      conteudoCSV += `"${item.margem_lucro || ''}"\n`;
    }
    
    fs.writeFileSync(nomeArquivoCSV, conteudoCSV);
    console.log(`Relatório CSV salvo em: ${nomeArquivoCSV}`);
    
    // Salva o relatório em um arquivo Excel (XLSX)
    const nomeArquivoExcel = `relatorio_custos_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
    
    // Prepara os dados para o Excel
    const dadosExcel = relatorio.map(item => ({
      'ID da Transação': item.id,
      'ID do Pagamento': item.payment_request_id,
      'ID do Serviço': item.service_id || '',
      'Nome do Serviço': item.service_name || '',
      'Nome do Cliente': item.customer_name || '',
      'Email do Cliente': item.customer_email || '',
      'Data de Criação': item.created_at,
      'Valor da Transação (R$)': item.amount,
      'Quantidade': item.quantidade || '',
      'ID do Pacote de Referência': item.pacote_referencia ? item.pacote_referencia.id : '',
      'Nome do Pacote de Referência': item.pacote_referencia ? item.pacote_referencia.nome : '',
      'Quantidade do Pacote de Referência': item.pacote_referencia ? item.pacote_referencia.quantidade : '',
      'Custo do Pacote de Referência (R$)': item.pacote_referencia ? item.pacote_referencia.custo_total : '',
      'Custo Unitário (R$)': item.custo_unitario || '',
      'Custo Calculado (R$)': item.custo_calculado || '',
      'Lucro (R$)': item.lucro || '',
      'Margem de Lucro (%)': item.margem_lucro || ''
    }));
    
    // Cria uma nova planilha
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    
    // Adiciona a planilha ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Custos');
    
    // Salva o arquivo Excel
    XLSX.writeFile(wb, nomeArquivoExcel);
    console.log(`Relatório Excel salvo em: ${nomeArquivoExcel}`);
    
    // Exibe apenas o resumo com o valor total gasto com produtos
    console.log('\n=== RESUMO DO PERÍODO DE 02/03/2025 ATÉ 16/05/2025 ===');
    console.log(`Total de transações aprovadas: ${totalTransacoes}`);
    console.log(`Valor total das transações: R$ ${valorTotalTransacoes.toFixed(2)}`);
    console.log(`VALOR TOTAL GASTO COM PRODUTOS: R$ ${custoTotalCalculado.toFixed(2)}`);
    console.log(`Lucro total: R$ ${(valorTotalTransacoes - custoTotalCalculado).toFixed(2)}`);
    console.log(`Margem de lucro média: ${((valorTotalTransacoes - custoTotalCalculado) / valorTotalTransacoes * 100).toFixed(2)}%`);
    
    console.log('\nProcessamento concluído com sucesso!');
    
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
