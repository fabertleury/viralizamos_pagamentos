const { Pool } = require('pg');
const { format } = require('date-fns');

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway'
});

async function main() {
  try {
    // Define o período de análise
    const dataInicio = new Date('2025-03-02');
    const dataFim = new Date('2025-05-16T23:59:59');
    
    console.log(`Verificando pedidos no período de ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}...`);
    
    // Verifica se a tabela orders existe
    const queryVerificarTabela = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
      );
    `;
    
    const { rows: resultadoTabela } = await pool.query(queryVerificarTabela);
    const tabelaExiste = resultadoTabela[0].exists;
    
    if (!tabelaExiste) {
      console.log('A tabela "orders" não existe no banco de dados.');
      return;
    }
    
    // Conta o número de pedidos no período
    const queryContarPedidos = `
      SELECT COUNT(*) as total FROM orders 
      WHERE created_at >= $1 AND created_at <= $2
    `;
    
    const { rows: resultadoContagem } = await pool.query(queryContarPedidos, [dataInicio, dataFim]);
    const totalPedidos = parseInt(resultadoContagem[0].total);
    
    console.log(`Total de pedidos no período: ${totalPedidos}`);
    
    // Conta o número de transações aprovadas no período
    const queryContarTransacoes = `
      SELECT COUNT(*) as total FROM transactions 
      WHERE created_at >= $1 AND created_at <= $2 
      AND status = 'approved'
    `;
    
    const { rows: resultadoTransacoes } = await pool.query(queryContarTransacoes, [dataInicio, dataFim]);
    const totalTransacoes = parseInt(resultadoTransacoes[0].total);
    
    console.log(`Total de transações aprovadas no período: ${totalTransacoes}`);
    
    // Verifica a estrutura da tabela orders
    const queryEstrutura = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
    `;
    
    const { rows: colunas } = await pool.query(queryEstrutura);
    console.log('\nEstrutura da tabela orders:');
    colunas.forEach(coluna => {
      console.log(`- ${coluna.column_name}: ${coluna.data_type}`);
    });
    
    // Se existirem pedidos, mostra alguns exemplos
    if (totalPedidos > 0) {
      const queryExemplos = `
        SELECT * FROM orders 
        WHERE created_at >= $1 AND created_at <= $2 
        LIMIT 5
      `;
      
      const { rows: exemplos } = await pool.query(queryExemplos, [dataInicio, dataFim]);
      console.log('\nExemplos de pedidos:');
      exemplos.forEach((pedido, index) => {
        console.log(`\nPedido #${index + 1}:`);
        Object.entries(pedido).forEach(([chave, valor]) => {
          console.log(`  ${chave}: ${valor}`);
        });
      });
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
