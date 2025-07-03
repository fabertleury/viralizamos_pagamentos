import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { format } from 'date-fns';
import { Pool } from 'pg';

// Configuração da conexão direta com o PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway'
});

// Interface para os dados de custo do serviço
interface ServicoCusto {
  id: string;
  nome: string;
  preco: number;
  custo: number;
  margem: number;
}

// Interface para os dados da transação com custo
interface TransacaoComCusto {
  id: string;
  payment_request_id: string;
  external_id: string | null;
  status: string;
  method: string;
  amount: number;
  provider: string;
  created_at: Date;
  processed_at: Date | null;
  service_id: string | null;
  service_name: string | null;
  customer_email: string;
  customer_name: string;
  custo: number | null;
  margem: number | null;
  margem_percentual: number | null;
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
    
    // Converte os dados do Excel para JSON
    const servicosCusto: any[] = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Encontrados ${servicosCusto.length} serviços no arquivo Excel`);
    
    // Cria um mapa de ID do serviço para custo
    const custoPorServico = new Map<string, ServicoCusto>();
    
    // Processa os dados do Excel e cria o mapa
    servicosCusto.forEach((servico: any) => {
      // Adapte estas propriedades de acordo com as colunas reais do seu arquivo Excel
      const id = servico.id?.toString() || servico.ID?.toString() || servico.Id?.toString();
      const nome = servico.nome || servico.NOME || servico.Nome || servico.name || servico.NAME || servico.Name;
      const preco = parseFloat(servico.preco || servico.PRECO || servico.Preco || servico.price || servico.PRICE || servico.Price);
      const custo = parseFloat(servico.custo || servico.CUSTO || servico.Custo || servico.cost || servico.COST || servico.Cost);
      const margem = preco - custo;
      
      if (id && !isNaN(custo)) {
        custoPorServico.set(id, {
          id,
          nome,
          preco,
          custo,
          margem
        });
      }
    });
    
    console.log(`Mapa de custos criado para ${custoPorServico.size} serviços`);
    
    // Define o período de análise
    const dataInicio = new Date('2025-05-01');
    const dataFim = new Date('2025-05-30T23:59:59');
    
    console.log(`Buscando transações no período de ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}...`);
    
    // Busca todas as transações no período especificado usando SQL direto
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
        pr.customer_name
      FROM 
        transactions t
      LEFT JOIN 
        payment_requests pr ON t.payment_request_id = pr.id
      WHERE 
        t.created_at >= $1 AND t.created_at <= $2
      ORDER BY 
        t.created_at ASC
    `;
    
    const { rows: transacoes } = await pool.query(queryTransacoes, [dataInicio, dataFim]);
    
    console.log(`Encontradas ${transacoes.length} transações no período`);
    
    // Processa as transações e calcula os custos
    const transacoesComCusto: TransacaoComCusto[] = transacoes.map(transacao => {
      const serviceId = transacao.payment_request?.service_id || null;
      const servicoCusto = serviceId ? custoPorServico.get(serviceId) : null;
      
      const custo = servicoCusto?.custo || null;
      const margem = servicoCusto && custo !== null ? transacao.amount - custo : null;
      const margemPercentual = custo !== null && transacao.amount > 0 ? ((transacao.amount - custo) / transacao.amount) * 100 : null;
      
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
        service_name: transacao.payment_request?.service_name || null,
        customer_email: transacao.payment_request?.customer_email || '',
        customer_name: transacao.payment_request?.customer_name || '',
        custo,
        margem,
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
    const totalValorTransacoes = transacoesComCusto.reduce((sum, t) => sum + t.amount, 0);
    const totalCusto = transacoesComCustoValido.reduce((sum, t) => sum + (t.custo || 0), 0);
    const totalMargem = transacoesComCustoValido.reduce((sum, t) => sum + (t.margem || 0), 0);
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
    const resumoPorServico = new Map<string, {
      service_id: string;
      service_name: string;
      total_transacoes: number;
      total_valor: number;
      total_custo: number;
      total_margem: number;
      margem_percentual: number;
    }>();
    
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
      existingData.total_valor += transacao.amount;
      existingData.total_custo += transacao.custo || 0;
      existingData.total_margem += transacao.margem || 0;
      
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
