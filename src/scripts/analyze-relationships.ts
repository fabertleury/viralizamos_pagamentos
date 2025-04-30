import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Configuração do banco de orders
const ordersPool = new Pool({
  connectionString: process.env.ORDERS_DATABASE_URL
});

// Configuração do banco de pagamentos
const db = new PrismaClient();

async function analyzeRelationships() {
  try {
    console.log('=== ANÁLISE DE RELACIONAMENTOS ===\n');

    // 1. Análise de transações sem usuários vinculados
    console.log('=== TRANSAÇÕES SEM USUÁRIOS VINCULADOS ===');
    
    const transactionsWithoutUsers = await db.transaction.findMany({
      where: {
        metadata: {
          not: null
        }
      },
      include: {
        payment_request: true
      },
      take: 10
    });

    console.log(`\nEncontradas ${transactionsWithoutUsers.length} transações para análise:`);
    for (const transaction of transactionsWithoutUsers) {
      const metadata = JSON.parse(transaction.metadata || '{}');
      console.log(`\nTransação ID: ${transaction.id}`);
      console.log(`  - Customer Email: ${transaction.payment_request.customer_email}`);
      console.log(`  - Customer Name: ${transaction.payment_request.customer_name}`);
      console.log(`  - Metadata: ${JSON.stringify(metadata, null, 2)}`);
    }

    // 2. Análise de pedidos sem usuários vinculados
    console.log('\n=== PEDIDOS SEM USUÁRIOS VINCULADOS ===');
    
    const ordersWithoutUsers = await ordersPool.query(`
      SELECT id, transaction_id, customer_email, customer_name
      FROM orders
      WHERE user_id IS NULL
      LIMIT 10
    `);

    console.log(`\nEncontrados ${ordersWithoutUsers.rows.length} pedidos sem usuários:`);
    for (const order of ordersWithoutUsers.rows) {
      console.log(`\nPedido ID: ${order.id}`);
      console.log(`  - Transaction ID: ${order.transaction_id}`);
      console.log(`  - Customer Email: ${order.customer_email}`);
      console.log(`  - Customer Name: ${order.customer_name}`);
    }

    // 3. Análise de usuários duplicados
    console.log('\n=== USUÁRIOS DUPLICADOS ===');
    
    const duplicateUsers = await ordersPool.query(`
      SELECT email, COUNT(*) as count
      FROM users
      GROUP BY email
      HAVING COUNT(*) > 1
    `);

    console.log(`\nEncontrados ${duplicateUsers.rows.length} emails duplicados:`);
    for (const user of duplicateUsers.rows) {
      console.log(`  - Email: ${user.email} (${user.count} ocorrências)`);
    }

    // 4. Análise de transações com pedidos correspondentes
    console.log('\n=== TRANSAÇÕES COM PEDIDOS ===');
    
    const transactionsWithOrders = await db.transaction.findMany({
      where: {
        metadata: {
          not: null
        }
      },
      include: {
        payment_request: true
      },
      take: 10
    });

    for (const transaction of transactionsWithOrders) {
      const orders = await ordersPool.query(`
        SELECT id, status, customer_email
        FROM orders
        WHERE transaction_id = $1
      `, [transaction.id]);

      console.log(`\nTransação ID: ${transaction.id}`);
      console.log(`  - Customer Email: ${transaction.payment_request.customer_email}`);
      console.log(`  - Pedidos associados: ${orders.rows.length}`);
      for (const order of orders.rows) {
        console.log(`    - Pedido ID: ${order.id}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Customer Email: ${order.customer_email}`);
      }
    }

  } catch (error) {
    console.error('Erro na análise de relacionamentos:', error);
  } finally {
    await db.$disconnect();
    await ordersPool.end();
  }
}

// Executar o script
analyzeRelationships(); 