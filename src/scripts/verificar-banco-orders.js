const { Pool } = require('pg');

// Configuração da conexão com o banco de dados de orders
const pool = new Pool({
  connectionString: 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway'
});

async function main() {
  try {
    console.log('Verificando conexão com o banco de dados de orders...');
    
    // Testa a conexão
    const { rows: result } = await pool.query('SELECT NOW()');
    console.log(`Conexão estabelecida. Hora do servidor: ${result[0].now}`);
    
    // Lista as tabelas
    const { rows: tables } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\nTabelas encontradas:');
    tables.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    // Se existir a tabela orders, verifica sua estrutura
    if (tables.some(t => t.table_name === 'orders')) {
      const { rows: columns } = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'orders'
      `);
      
      console.log('\nColunas da tabela orders:');
      columns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type}`);
      });
      
      // Conta o número de registros
      const { rows: count } = await pool.query('SELECT COUNT(*) FROM orders');
      console.log(`\nTotal de registros na tabela orders: ${count[0].count}`);
      
      // Busca alguns exemplos
      if (parseInt(count[0].count) > 0) {
        const { rows: samples } = await pool.query('SELECT * FROM orders LIMIT 2');
        
        console.log('\nExemplos de registros:');
        samples.forEach((record, index) => {
          console.log(`\nRegistro #${index + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        });
      }
    } else {
      console.log('\nA tabela "orders" não foi encontrada no banco de dados.');
    }
    
  } catch (error) {
    console.error('Erro ao conectar ou consultar o banco de dados:', error);
  } finally {
    await pool.end();
    console.log('\nConexão encerrada.');
  }
}

main();
