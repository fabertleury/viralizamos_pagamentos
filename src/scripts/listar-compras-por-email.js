/**
 * Script para listar compras de usuários específicos por email
 * e mostrar os usuários do Instagram relacionados
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Inicializar o cliente Prisma
const prisma = new PrismaClient();

// Lista de emails para buscar (será substituída pelos emails fornecidos)
const emailsParaBuscar = [
  // Adicione os emails aqui ou forneça via arquivo
  // 'exemplo@email.com',
  // 'outro@email.com'
];

// Função para carregar emails de um arquivo
function carregarEmailsDeArquivo(caminhoArquivo) {
  try {
    const conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
    return conteudo
      .split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));
  } catch (erro) {
    console.error(`Erro ao ler arquivo de emails: ${erro.message}`);
    return [];
  }
}

// Função principal para buscar compras por email
async function buscarComprasPorEmail(emails) {
  try {
    console.log(`Buscando compras para ${emails.length} emails...`);
    
    const resultados = [];
    
    for (const email of emails) {
      console.log(`Processando email: ${email}`);
      
      // Buscar solicitações de pagamento pelo email do cliente
      const paymentRequests = await prisma.paymentRequest.findMany({
        where: {
          customer_email: {
            equals: email,
            mode: 'insensitive' // Busca case-insensitive
          }
        },
        include: {
          transactions: {
            where: {
              status: 'approved' // Apenas transações aprovadas
            }
          }
        }
      });
      
      if (paymentRequests.length === 0) {
        console.log(`Nenhuma compra encontrada para o email: ${email}`);
        continue;
      }
      
      // Processar cada solicitação de pagamento
      for (const request of paymentRequests) {
        // Extrair informações adicionais se disponíveis
        let additionalInfo = {};
        if (request.additional_data) {
          try {
            additionalInfo = JSON.parse(request.additional_data);
          } catch (e) {
            console.warn(`Erro ao analisar dados adicionais para ${request.id}: ${e.message}`);
          }
        }
        
        // Extrair informações de transações
        const transacoesAprovadas = request.transactions.filter(t => t.status === 'approved');
        
        // Extrair informações de metadata das transações se disponíveis
        let metadataInfo = {};
        if (transacoesAprovadas.length > 0 && transacoesAprovadas[0].metadata) {
          try {
            metadataInfo = JSON.parse(transacoesAprovadas[0].metadata);
          } catch (e) {
            console.warn(`Erro ao analisar metadata para transação ${transacoesAprovadas[0].id}: ${e.message}`);
          }
        }
        
        // Verificar se há logs de resposta do provedor para esta solicitação
        const providerLogs = await prisma.providerResponseLog.findMany({
          where: {
            payment_request_id: request.id
          }
        });
        
        // Extrair informações de posts dos logs do provedor
        let postsInfo = [];
        for (const log of providerLogs) {
          try {
            const responseData = JSON.parse(log.response_data);
            if (responseData.posts) {
              postsInfo = responseData.posts;
            }
          } catch (e) {
            console.warn(`Erro ao analisar logs do provedor para ${log.id}: ${e.message}`);
          }
        }
        
        // Adicionar resultado
        resultados.push({
          email: email,
          nome_cliente: request.customer_name,
          telefone: request.customer_phone || 'Não informado',
          instagram_username: request.profile_username || 
                             (additionalInfo.username || 
                              additionalInfo.target || 
                              metadataInfo.profile || 
                              'Não informado'),
          valor: request.amount,
          status: request.status,
          data_criacao: request.created_at,
          data_processamento: request.processed_at || 'Não processado',
          id_pedido: request.id,
          token: request.token,
          servico: request.service_name || 'Serviço Instagram',
          transacoes_aprovadas: transacoesAprovadas.length,
          posts: postsInfo.length > 0 ? postsInfo : 'Não disponível'
        });
      }
    }
    
    return resultados;
  } catch (erro) {
    console.error(`Erro ao buscar compras: ${erro.message}`);
    console.error(erro.stack);
    return [];
  }
}

// Função para salvar resultados em um arquivo JSON
function salvarResultados(resultados, nomeArquivo = 'resultados_compras.json') {
  try {
    const caminhoArquivo = path.join(process.cwd(), nomeArquivo);
    fs.writeFileSync(
      caminhoArquivo,
      JSON.stringify(resultados, null, 2),
      'utf8'
    );
    console.log(`Resultados salvos em: ${caminhoArquivo}`);
    
    // Gerar também um relatório em formato CSV
    const csvLinhas = [
      'Email,Nome,Telefone,Instagram,Valor,Status,Data,Serviço,ID Pedido'
    ];
    
    resultados.forEach(r => {
      csvLinhas.push(
        `"${r.email}","${r.nome_cliente}","${r.telefone}","${r.instagram_username}",${r.valor},"${r.status}","${r.data_criacao}","${r.servico}","${r.id_pedido}"`
      );
    });
    
    const csvCaminhoArquivo = path.join(process.cwd(), 'resultados_compras.csv');
    fs.writeFileSync(csvCaminhoArquivo, csvLinhas.join('\n'), 'utf8');
    console.log(`Relatório CSV salvo em: ${csvCaminhoArquivo}`);
    
  } catch (erro) {
    console.error(`Erro ao salvar resultados: ${erro.message}`);
  }
}

// Função para exibir um resumo dos resultados no console
function exibirResumo(resultados) {
  console.log('\n===== RESUMO DOS RESULTADOS =====');
  console.log(`Total de compras encontradas: ${resultados.length}`);
  
  // Agrupar por email
  const porEmail = {};
  resultados.forEach(r => {
    if (!porEmail[r.email]) {
      porEmail[r.email] = [];
    }
    porEmail[r.email].push(r);
  });
  
  // Agrupar por Instagram
  const porInstagram = {};
  resultados.forEach(r => {
    const instagram = r.instagram_username;
    if (!porInstagram[instagram]) {
      porInstagram[instagram] = [];
    }
    porInstagram[instagram].push(r);
  });
  
  console.log(`\nCompras por email:`);
  Object.keys(porEmail).forEach(email => {
    console.log(`- ${email}: ${porEmail[email].length} compras, valor total: R$ ${porEmail[email].reduce((total, r) => total + r.valor, 0).toFixed(2)}`);
  });
  
  console.log(`\nCompras por Instagram:`);
  Object.keys(porInstagram).forEach(instagram => {
    if (instagram !== 'Não informado') {
      console.log(`- @${instagram}: ${porInstagram[instagram].length} compras, valor total: R$ ${porInstagram[instagram].reduce((total, r) => total + r.valor, 0).toFixed(2)}`);
    }
  });
}

// Função principal
async function main() {
  try {
    console.log('Iniciando busca de compras por email...');
    
    // Verificar se foi fornecido um arquivo com emails
    let emails = emailsParaBuscar;
    const arquivoEmails = process.argv[2];
    
    if (arquivoEmails) {
      console.log(`Carregando emails do arquivo: ${arquivoEmails}`);
      const emailsDoArquivo = carregarEmailsDeArquivo(arquivoEmails);
      
      if (emailsDoArquivo.length > 0) {
        emails = emailsDoArquivo;
        console.log(`${emails.length} emails carregados do arquivo.`);
      }
    }
    
    // Se não houver emails para buscar, solicitar ao usuário
    if (emails.length === 0) {
      console.log('Nenhum email fornecido. Por favor, adicione emails ao arquivo ou diretamente no script.');
      process.exit(1);
    }
    
    // Buscar compras para os emails fornecidos
    const resultados = await buscarComprasPorEmail(emails);
    
    // Exibir resumo
    exibirResumo(resultados);
    
    // Salvar resultados
    salvarResultados(resultados);
    
  } catch (erro) {
    console.error(`Erro na execução do script: ${erro.message}`);
    console.error(erro.stack);
  } finally {
    // Fechar conexão com o banco de dados
    await prisma.$disconnect();
  }
}

// Executar o script
main();
 