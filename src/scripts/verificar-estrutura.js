const { Pool } = require('pg');

// Configuração da conexão com o banco de dados de pagamentos
const pool = new Pool({
  connectionString: 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway'
});

async function main() {
  try {
    console.log('Verificando estrutura das tabelas...');
    
    // Verifica a estrutura da tabela provider_response_logs
    const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'provider_response_logs'
    `;
    
    const { rows } = await pool.query(query);
    
    console.log('\nEstrutura da tabela provider_response_logs:');
    rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });
    
    // Busca alguns exemplos de registros
    const queryExemplos = `
      SELECT * FROM provider_response_logs LIMIT 5
    `;
    
    const { rows: exemplos } = await pool.query(queryExemplos);
    
    console.log('\nExemplos de registros:');
    exemplos.forEach((registro, index) => {
      console.log(`\nRegistro #${index + 1}:`);
      Object.entries(registro).forEach(([chave, valor]) => {
        console.log(`  ${chave}: ${valor}`);
      });
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
