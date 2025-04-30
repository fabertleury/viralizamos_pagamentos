import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Configuração do banco de orders
const ordersPool = new Pool({
  connectionString: process.env.ORDERS_DATABASE_URL || ''
});

// Configuração do banco de pagamentos
const db = new PrismaClient();

async function analyzeDatabases() {
  try {
    console.log('=== ANÁLISE DE BANCOS DE DADOS ===\n');

    // 1. Análise do banco de pagamentos
    console.log('=== BANCO DE PAGAMENTOS ===');
    
    // Listar todas as tabelas do banco de pagamentos
    const paymentTables = await db.$queryRaw<{table_name: string}[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log('\nTabelas encontradas no banco de pagamentos:');
    for (const table of paymentTables) {
      console.log(`\nTabela: ${table.table_name}`);
      
      // Listar colunas de cada tabela
      const columns = await db.$queryRaw<{column_name: string, data_type: string, is_nullable: string}[]>`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${table.table_name}
        ORDER BY ordinal_position;
      `;

      for (const column of columns) {
        console.log(`  - ${column.column_name} (${column.data_type}) ${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      }
    }

    // 2. Análise do banco de orders
    console.log('\n=== BANCO DE ORDERS ===');
    
    // Listar todas as tabelas do banco de orders
    const orderTables = await ordersPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\nTabelas encontradas no banco de orders:');
    for (const table of orderTables.rows) {
      console.log(`\nTabela: ${table.table_name}`);
      
      // Listar colunas de cada tabela
      const columns = await ordersPool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        ORDER BY ordinal_position;
      `, [table.table_name]);

      for (const column of columns.rows) {
        console.log(`  - ${column.column_name} (${column.data_type}) ${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      }
    }

    // 3. Análise de relacionamentos
    console.log('\n=== RELACIONAMENTOS ENTRE BANCOS ===');
    
    // Analisar relacionamentos entre transações e pedidos
    const orders = await ordersPool.query(`
      SELECT id, transaction_id, user_id, customer_email
      FROM orders
      LIMIT 5
    `);

    console.log('\nExemplo de pedidos com seus relacionamentos:');
    for (const order of orders.rows) {
      console.log(`\nPedido ID: ${order.id}`);
      console.log(`  - Transaction ID: ${order.transaction_id}`);
      console.log(`  - User ID: ${order.user_id}`);
      console.log(`  - Customer Email: ${order.customer_email}`);
    }

    // Analisar transações do banco de pagamentos
    const transactions = await db.transaction.findMany({
      select: {
        id: true,
        payment_request: {
          select: {
            customer_email: true,
            customer_name: true
          }
        },
        metadata: true
      },
      take: 5
    });

    console.log('\nExemplo de transações com seus dados:');
    for (const transaction of transactions) {
      console.log(`\nTransação ID: ${transaction.id}`);
      console.log(`  - Customer Email: ${transaction.payment_request.customer_email}`);
      console.log(`  - Customer Name: ${transaction.payment_request.customer_name}`);
      console.log(`  - Metadata: ${JSON.stringify(transaction.metadata, null, 2)}`);
    }

  } catch (error) {
    console.error('Erro na análise dos bancos:', error);
  } finally {
    await db.$disconnect();
    await ordersPool.end();
  }
}

// Executar o script
analyzeDatabases(); 