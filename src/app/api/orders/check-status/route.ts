import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID do pedido não fornecido' },
        { status: 400 }
      );
    }

    console.log(`[API] Recebido pedido para verificar status: ${orderId}`);
    
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
    
    // Verificar se o pedido já está marcado como concluído
    if (paymentRequest.status === 'completed') {
      console.log(`[API] Pedido ${orderId} já está concluído. Mantendo status.`);
      
      return NextResponse.json({
        success: true,
        order: {
          id: orderId,
          status: 'completed',
          metadata: {
            status_updates: [
              {
                timestamp: new Date().toISOString(),
                previous_status: 'completed',
                new_status: 'completed',
                source: 'status_check'
              }
            ]
          }
        },
        provider_status: 'Completed',
        charge: paymentRequest.amount.toString(),
        start_count: 0,
        remains: 0
      });
    }
    
    // Se o pedido não estiver concluído, consultar o provedor para obter o status atualizado
    let providerStatus = 'Unknown';
    let charge = '0';
    let startCount = '0';
    let remains = '0';
    let orderStatus = paymentRequest.status;
    
    try {
      // Aqui você implementaria a chamada real para o provedor
      // Este é um código de exemplo simulando uma resposta do provedor
      
      // Simulação do formato mostrado no exemplo
      const providerResponse = {
        charge: (paymentRequest.amount * 0.85).toFixed(2),
        start_count: Math.floor(Math.random() * 5000).toString(),
        status: determineProviderStatus(paymentRequest.status),
        remains: Math.floor(Math.random() * 500).toString(),
        currency: "USD"
      };
      
      console.log(`[API] Resposta do provedor para pedido ${orderId}:`, providerResponse);
      
      // Atualizar variáveis com os dados do provedor
      providerStatus = providerResponse.status;
      charge = providerResponse.charge;
      startCount = providerResponse.start_count;
      remains = providerResponse.remains;
      
      // Determinar o status do pedido com base na resposta do provedor
      orderStatus = mapProviderStatusToOrderStatus(providerStatus, paymentRequest.status);
      
      // Atualizar o status do pedido no banco de dados se for diferente
      if (orderStatus !== paymentRequest.status) {
        await prisma.paymentRequest.update({
          where: { id: orderId },
          data: { status: orderStatus }
        });
        
        console.log(`[API] Status do pedido ${orderId} atualizado de ${paymentRequest.status} para ${orderStatus}`);
      }
    } catch (providerError) {
      console.error(`[API] Erro ao consultar provedor para pedido ${orderId}:`, providerError);
    }
    
    // Retornar resposta com os dados atualizados
    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        status: orderStatus,
        metadata: {
          status_updates: [
            {
              timestamp: new Date().toISOString(),
              previous_status: paymentRequest.status,
              new_status: orderStatus,
              source: 'status_check'
            }
          ]
        }
      },
      provider_status: providerStatus,
      charge: charge,
      start_count: startCount,
      remains: remains
    });
  } catch (error: any) {
    console.error('[API] Erro ao consultar status do pedido:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao consultar status do pedido', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Função para simular o status do provedor com base no status atual do pedido
function determineProviderStatus(currentStatus: string): string {
  // Simular possíveis valores de status do provedor
  const possibleStatuses = ['Pending', 'In Progress', 'Processing', 'Partial', 'Completed', 'Cancelled', 'Failed'];
  
  // Mapear status do pedido para status do provedor
  switch (currentStatus.toLowerCase()) {
    case 'pending':
      return 'Pending';
    case 'processing':
      const processingStatuses = ['In Progress', 'Processing', 'Partial'];
      return processingStatuses[Math.floor(Math.random() * processingStatuses.length)];
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return possibleStatuses[Math.floor(Math.random() * possibleStatuses.length)];
  }
}

// Função para mapear status do provedor para status do pedido
function mapProviderStatusToOrderStatus(providerStatus: string, currentStatus: string): string {
  const status = providerStatus.toLowerCase();
  
  // Se o pedido já estiver concluído, não mude o status
  if (currentStatus.toLowerCase() === 'completed') {
    return 'completed';
  }
  
  if (status.includes('complet') || status === 'done') {
    return 'completed';
  }
  
  if (status.includes('progress') || status.includes('process') || status === 'partial') {
    return 'processing';
  }
  
  if (status.includes('pend') || status === 'queued') {
    return 'pending';
  }
  
  if (status.includes('fail') || status.includes('error') || status === 'rejected') {
    return 'failed';
  }
  
  if (status.includes('cancel')) {
    return 'cancelled';
  }
  
  // Manter o status atual se não conseguir mapear
  return currentStatus;
} 