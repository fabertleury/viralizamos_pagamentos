import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import { createClient } from '@supabase/supabase-js';

// Constante para a URL da API de Orders
const ORDERS_API_URL = process.env.ORDERS_API_URL || 'https://api.viralizamos.com.br/orders/create';

// Definindo o tipo para fallback providers
type ProviderConfig = {
  api_url: string;
  api_key: string;
};

type FallbackProviders = {
  [key: string]: ProviderConfig;
};

// Definindo os providers de fallback com tipagem correta
const FALLBACK_PROVIDERS: FallbackProviders = {
  followerzz: { 
    api_url: 'https://followerzz.com/api/v2',
    api_key: process.env.FOLLOWERZZ_API_KEY || ''
  },
  smmpanel: {
    api_url: 'https://smmpanel.com/api/v2',
    api_key: process.env.SMMPANEL_API_KEY || ''
  }
};

const prisma = new PrismaClient();

// Inicializar cliente Supabase apenas se as variáveis de ambiente estiverem disponíveis
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Verificar se podemos usar o Supabase
const canUseSupabase = !!(supabaseUrl && supabaseServiceKey);
const supabase = canUseSupabase 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Definir a interface para os provedores
interface Provider {
  id: string;
  name: string;
  api_url: string;
  api_key: string;
  active: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, forceUpdate } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID do pedido não fornecido' },
        { status: 400 }
      );
    }

    console.log(`[API] Recebido pedido para verificar status: ${orderId}, forceUpdate: ${forceUpdate}`);
    
    // Buscar o pedido no banco de dados
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: orderId },
      include: {
        transactions: {
          orderBy: {
            created_at: 'desc'
          },
          take: 1
        }
      }
    });
    
    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar o status de pagamento diretamente na tabela de transações
    // Buscamos a transação mais recente para o pedido
    const latestTransaction = await prisma.transaction.findFirst({
      where: {
        payment_request_id: orderId
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    // Verificar se o pagamento foi aprovado
    const isPaymentApproved = latestTransaction && latestTransaction.status === 'approved';
    
    if (!isPaymentApproved) {
      console.log(`[API] Pedido ${orderId} com pagamento não aprovado ou inexistente.`);
      
      // Atualizar o status do pedido para "não pago" se ainda não estiver
      if (paymentRequest.status !== 'unpaid') {
        await prisma.paymentRequest.update({
          where: { id: orderId },
          data: { status: 'unpaid' }
        });
        console.log(`[API] Status do pedido ${orderId} atualizado para "não pago"`);
      }
      
      // Retornar status sem verificar o provedor
      return NextResponse.json({
        success: true,
        order: {
          id: orderId,
          status: 'unpaid',
          metadata: {
            payment_status: latestTransaction?.status || 'pending',
            message: 'Pagamento não foi aprovado ainda. É necessário realizar o pagamento para prosseguir.'
          }
        },
        provider_status: 'Payment not approved',
        charge: '0',
        start_count: '0',
        remains: '0'
      });
    }
    
    // Se chegou aqui, o pagamento foi aprovado
    
    // Verificar se o pedido ainda está com status "não pago" e atualizar para "pendente" 
    // para começar o processamento no provedor
    if (paymentRequest.status === 'unpaid') {
      await prisma.paymentRequest.update({
        where: { id: orderId },
        data: { status: 'pending' }
      });
      console.log(`[API] Pagamento aprovado: Status do pedido ${orderId} atualizado de "não pago" para "pendente"`);
      paymentRequest.status = 'pending'; // Atualizar o objeto local também
    }
    
    // Verificar se já notificamos o serviço de orders sobre este pagamento
    const notificationLog = await prisma.paymentNotificationLog.findFirst({
      where: {
        transaction_id: latestTransaction.id,
        type: 'orders_service',
        status: 'success'
      }
    });
    
    // Se ainda não notificamos, tentar notificar agora
    if (!notificationLog && latestTransaction) {
      try {
        console.log(`[API] Tentando notificar serviço de orders sobre pagamento aprovado para ${orderId}`);
        const notificationResult = await notifyOrdersService(latestTransaction.id);
        console.log(`[API] Notificação para orders: ${notificationResult ? 'Sucesso' : 'Falha'}`);
      } catch (notifyError) {
        console.error(`[API] Erro ao notificar orders:`, notifyError);
      }
    }
    
    // Retornar o status do pagamento sem tentar buscar informações do serviço de orders
    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        status: paymentRequest.status,
        metadata: {
          payment_status: latestTransaction?.status || 'pending',
          payment_id: latestTransaction?.id,
          transaction_id: latestTransaction?.id,
          message: 'Pagamento aprovado. O pedido está sendo processado.',
          notified_orders: notificationLog ? true : false
        }
      },
      provider_status: 'Processing',
      charge: paymentRequest.amount.toString(),
      start_count: '0',
      remains: '0'
    });
  } catch (error) {
    console.error('[API] Erro ao verificar status do pedido:', error);
    
    return NextResponse.json(
      { error: `Erro ao verificar status: ${(error as Error).message}` },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Função para determinar o status simulado com base no status atual
function determineStatusBasedOnCurrentStatus(currentStatus: string): string {
  const status = currentStatus.toLowerCase();
  
  if (status === 'completed') {
    return 'Completed';
  }
  
  if (status === 'processing') {
    // Para pedidos em processamento, simular diferentes estágios
    const processingStatuses = ['In Progress', 'Processing', 'Partial'];
    return processingStatuses[Math.floor(Math.random() * processingStatuses.length)];
  }
  
  if (status === 'pending') {
    // Para pedidos pendentes, maior chance de se mover para processamento
    const pendingOutcomes = ['Pending', 'Pending', 'In Progress', 'Processing'];
    return pendingOutcomes[Math.floor(Math.random() * pendingOutcomes.length)];
  }
  
  if (status === 'failed') {
    return 'Failed';
  }
  
  if (status === 'cancelled') {
    return 'Cancelled';
  }
  
  return 'Unknown';
}

// Função para mapear status do provedor para status do pedido
function mapProviderStatusToOrderStatus(providerStatus: string, currentStatus: string): string {
  if (!providerStatus) return currentStatus;
  
  const status = providerStatus.toLowerCase();
  
  // Se o pedido já estiver concluído, não mude o status
  if (currentStatus.toLowerCase() === 'completed') {
    // Mas se o status do provedor for explicitamente de falha/cancelamento, priorize-o
    if (['canceled', 'cancelled', 'cancel', 'refunded', 'failed', 'error', 'rejected'].includes(status) ||
         status.includes('cancel') || status.includes('fail') || status.includes('error')) {
      console.log(`[API] Detectado cancelamento/falha (${providerStatus}) para pedido marcado como concluído - atualizando para failed`);
      return 'failed';
    }
    return 'completed';
  }
  
  // Verificar status de concluído
  if (['completed', 'complete', 'done', 'success'].includes(status)) {
    return 'completed';
  }
  
  // Verificar status de processamento
  if (['in progress', 'inprogress', 'processing', 'active', 'running'].includes(status)) {
    return 'processing';
  }
  
  // Verificar status parcial (alguns serviços entregues)
  if (['partial', 'partially completed'].includes(status)) {
    return 'partial';
  }
  
  // Verificar status de falha/cancelamento - expandir para detectar mais variações
  if (['canceled', 'cancelled', 'cancel', 'refunded', 'failed', 'error', 'rejected',
       'refund', 'failure', 'not available', 'unavailable'].includes(status)) {
    return 'failed';
  }
  
  // Verificar status pendente
  if (['pending', 'queued', 'waiting', 'not started'].includes(status)) {
    return 'pending';
  }
  
  // Verificar se o texto contém alguma dessas palavras
  if (status.includes('cancel') || status.includes('refund') || 
      status.includes('fail') || status.includes('error') || 
      status.includes('reject') || status.includes('declin')) {
    return 'failed';
  }
  
  if (status.includes('complet') || status.includes('success')) {
    return 'completed';
  }
  
  if (status.includes('progress') || status.includes('process')) {
    return 'processing';
  }
  
  if (status.includes('pend') || status.includes('queue')) {
    return 'pending';
  }
  
  // Para outros casos, verificar se há algum código de erro numérico
  if (/\berror\s*\d+\b/i.test(status) || /\bcode\s*:\s*\d+\b/i.test(status)) {
    console.log(`[API] Detectado possível código de erro no status: "${providerStatus}"`);
    return 'failed';
  }
  
  // Manter o status atual se não conseguir mapear
  console.log(`[API] Status não mapeado: "${providerStatus}". Mantendo status atual: ${currentStatus}`);
  return currentStatus;
} 