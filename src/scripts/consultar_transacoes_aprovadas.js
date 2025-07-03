const { Client } = require('pg');

// Configuração da conexão com o banco de dados
const connectionString = "postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway";

// Data para consulta
const dataConsulta = '2025-06-01'; // Formato YYYY-MM-DD para SQL

async function consultarTransacoesAprovadas() {
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    console.log('Conectado ao banco de dados com sucesso!');

    // Primeiro, vamos verificar quais tabelas existem no banco
    const tabelasQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tabelasResult = await client.query(tabelasQuery);
    console.log('Tabelas disponíveis no banco de dados:');
    tabelasResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Agora vamos tentar encontrar a tabela de transações
    // Como não sabemos o nome exato da tabela, vamos procurar por tabelas que podem conter transações
    const possiveisTabelasTransacoes = tabelasResult.rows
      .map(row => row.table_name)
      .filter(tableName => 
        tableName.includes('transaction') || 
        tableName.includes('transacao') || 
        tableName.includes('payment') || 
        tableName.includes('pagamento') ||
        tableName.includes('order') ||
        tableName.includes('pedido')
      );

    console.log('\nPossíveis tabelas de transações:');
    console.log(possiveisTabelasTransacoes);

    // Para cada tabela possível, vamos verificar suas colunas
    for (const tabela of possiveisTabelasTransacoes) {
      const colunasQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `;
      
      const colunasResult = await client.query(colunasQuery, [tabela]);
      
      console.log(`\nColunas da tabela ${tabela}:`);
      colunasResult.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type})`);
      });

      // Verificar se a tabela tem colunas relacionadas a status e data
      const temColunaStatus = colunasResult.rows.some(row => 
        row.column_name.toLowerCase().includes('status') || 
        row.column_name.toLowerCase().includes('state')
      );
      
      const temColunaData = colunasResult.rows.some(row => 
        row.column_name.toLowerCase().includes('date') || 
        row.column_name.toLowerCase().includes('data') ||
        row.column_name.toLowerCase().includes('created')
      );
      
      const temColunaValor = colunasResult.rows.some(row => 
        row.column_name.toLowerCase().includes('valor') || 
        row.column_name.toLowerCase().includes('value') ||
        row.column_name.toLowerCase().includes('amount') ||
        row.column_name.toLowerCase().includes('price')
      );

      if (temColunaStatus && temColunaData && temColunaValor) {
        console.log(`\nA tabela ${tabela} parece ser uma tabela de transações!`);
        
        // Obter nomes exatos das colunas
        const colunaStatus = colunasResult.rows.find(row => 
          row.column_name.toLowerCase().includes('status') || 
          row.column_name.toLowerCase().includes('state')
        )?.column_name;
        
        const colunaData = colunasResult.rows.find(row => 
          row.column_name.toLowerCase().includes('date') || 
          row.column_name.toLowerCase().includes('data') ||
          row.column_name.toLowerCase().includes('created')
        )?.column_name;
        
        const colunaValor = colunasResult.rows.find(row => 
          row.column_name.toLowerCase().includes('valor') || 
          row.column_name.toLowerCase().includes('value') ||
          row.column_name.toLowerCase().includes('amount') ||
          row.column_name.toLowerCase().includes('price')
        )?.column_name;

        // Tentar consultar transações aprovadas
        try {
          // Construir query dinâmica com base nas colunas encontradas
          const transacoesQuery = `
            SELECT * FROM ${tabela}
            WHERE 
              (${colunaStatus} = 'approved' OR ${colunaStatus} = 'aprovado' OR ${colunaStatus} = 'aprovada')
              AND DATE(${colunaData}) = $1
          `;
          
          console.log(`\nExecutando consulta: ${transacoesQuery}`);
          
          const transacoesResult = await client.query(transacoesQuery, [dataConsulta]);
          
          console.log(`\nTransações aprovadas em 01/06/2025 na tabela ${tabela}:`);
          console.log(`Total de transações: ${transacoesResult.rows.length}`);
          
          if (transacoesResult.rows.length > 0) {
            // Calcular valor total
            let valorTotal = 0;
            transacoesResult.rows.forEach(row => {
              valorTotal += parseFloat(row[colunaValor]);
              console.log(row);
            });
            
            console.log(`\nValor total de vendas: R$ ${valorTotal.toFixed(2)}`);
          } else {
            console.log('Nenhuma transação encontrada para esta data.');
          }
        } catch (err) {
          console.log(`Erro ao consultar transações na tabela ${tabela}: ${err.message}`);
        }
      }
    }

  } catch (err) {
    console.error('Erro ao conectar ou consultar o banco de dados:', err);
  } finally {
    await client.end();
    console.log('Conexão com o banco de dados encerrada.');
  }
}

consultarTransacoesAprovadas();
