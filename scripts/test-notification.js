/**
 * Script para testar a notificação entre microserviços de pagamentos e orders
 * 
 * Este script vai:
 * 1. Buscar uma transação "approved" no banco de dados, ou
 * 2. Criar uma transação fake se não encontrar nenhuma
 * 3. Chamar a função notifyOrdersService diretamente
 * 
 * Para executar:
 * node scripts/test-notification.js
 */

// Importar módulos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ordersService = require('../src/lib/orders-service');

// Função principal de teste
async function testNotification() {
  console.log('=== TESTE DE NOTIFICAÇÃO PARA O SERVIÇO DE ORDERS ===');
  
  try {
    // 1. Buscar uma transação aprovada no banco
    console.log('Buscando uma transação aprovada no banco...');
    const transaction = await prisma.transaction.findFirst({
      where: {
        status: 'approved',
      },
      include: {
        payment_request: true
      }
    });
    
    if (transaction) {
      console.log(`Transação encontrada: ${transaction.id}`);
      console.log('Detalhes:', {
        external_id: transaction.external_id,
        provider: transaction.provider,
        method: transaction.method,
        amount: transaction.amount,
        payment_request_id: transaction.payment_request_id,
        profile_username: transaction.payment_request.profile_username,
      });
      
      // Chamar a função de notificação com a transação encontrada
      console.log(`\nTestando notificação para a transação ${transaction.id}...`);
      const result = await ordersService.notifyOrdersService(transaction.id);
      
      console.log(`\nResultado da notificação: ${result ? 'SUCESSO' : 'FALHA'}`);
      
      return { success: true, transactionId: transaction.id, result };
    } else {
      console.log('Nenhuma transação aprovada encontrada.');
      console.log('Buscando qualquer transação para usar como teste...');
      
      // Buscar qualquer transação para modificar temporariamente
      const anyTransaction = await prisma.transaction.findFirst({
        include: {
          payment_request: true
        }
      });
      
      if (!anyTransaction) {
        console.error('Nenhuma transação encontrada no banco de dados.');
        return { success: false, error: 'Nenhuma transação encontrada' };
      }
      
      console.log(`Transação encontrada: ${anyTransaction.id} (Status atual: ${anyTransaction.status})`);
      console.log('Atualizando temporariamente para "approved"...');
      
      // Guardar status original
      const originalStatus = anyTransaction.status;
      
      // Atualizar temporariamente para approved
      await prisma.transaction.update({
        where: { id: anyTransaction.id },
        data: { status: 'approved' }
      });
      
      console.log(`\nTestando notificação para a transação ${anyTransaction.id}...`);
      try {
        const result = await ordersService.notifyOrdersService(anyTransaction.id);
        console.log(`\nResultado da notificação: ${result ? 'SUCESSO' : 'FALHA'}`);
        
        // Restaurar status original
        await prisma.transaction.update({
          where: { id: anyTransaction.id },
          data: { status: originalStatus }
        });
        console.log(`\nStatus da transação restaurado para "${originalStatus}"`);
        
        return { success: true, transactionId: anyTransaction.id, result, isTemporary: true };
      } catch (error) {
        // Restaurar status original mesmo em caso de erro
        await prisma.transaction.update({
          where: { id: anyTransaction.id },
          data: { status: originalStatus }
        });
        console.log(`\nStatus da transação restaurado para "${originalStatus}"`);
        
        throw error;
      }
    }
  } catch (error) {
    console.error('Erro durante o teste:', error);
    return { success: false, error: error.message };
  }
}

// Executar e depois fechar a conexão com o banco
testNotification()
  .then(result => {
    console.log('\n=== RESUMO DO TESTE ===');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('Erro ao executar teste:', error);
  })
  .finally(() => {
    console.log('\nFechando conexões...');
    prisma.$disconnect();
  }); 