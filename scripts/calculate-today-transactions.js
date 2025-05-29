const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function calculateTodayTransactions() {
  try {
    // Definir a data de hoje (29/05/2025)
    const today = new Date('2025-05-29');
    const tomorrow = new Date('2025-05-30');

    console.log('=== CÁLCULO DE TRANSACTIONS APROVADAS PARA HOJE (29/05/2025) ===\n');

    // Buscar todas as transações aprovadas do dia
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'approved',
        created_at: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        payment_request: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    // Calcular o valor total
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Formatar a saída
    console.log(`Total de transações aprovadas: ${transactions.length}`);
    console.log(`Valor total: R$ ${totalAmount.toFixed(2)}`);
    console.log('\nDetalhes das transações:');
    console.log('----------------------');

    transactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. Transação ID: ${tx.id}`);
      console.log(`   Valor: R$ ${tx.amount.toFixed(2)}`);
      console.log(`   Método: ${tx.method}`);
      console.log(`   Provider: ${tx.provider}`);
      console.log(`   Cliente: ${tx.payment_request.customer_name}`);
      console.log(`   Email: ${tx.payment_request.customer_email}`);
      console.log(`   Serviço: ${tx.payment_request.service_name}`);
      console.log(`   Horário: ${tx.created_at.toLocaleString()}`);
    });

  } catch (error) {
    console.error('Erro ao calcular transações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

calculateTodayTransactions(); 