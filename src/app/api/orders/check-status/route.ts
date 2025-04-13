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

    // Buscar o pedido no banco de dados
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        provider: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se temos provider_response com o número do pedido
    if (!order.provider_response || !order.provider_response['order']) {
      return NextResponse.json(
        { error: 'Número do pedido no provedor não encontrado' },
        { status: 400 }
      );
    }

    // Extrair o número do pedido do provider_response
    const providerOrderId = order.provider_response['order'];

    if (!order.provider || !order.provider.api_url || !order.provider.api_key) {
      return NextResponse.json(
        { error: 'Informações do provedor incompletas' },
        { status: 400 }
      );
    }

    // Preparar payload para consultar o status no provedor
    const payload = {
      key: order.provider.api_key,
      action: 'status',
      order: providerOrderId
    };

    console.log(`Consultando status do pedido ${providerOrderId} no provedor:`, payload);

    // Enviar consulta para o provedor
    const response = await axios.post(order.provider.api_url, payload);

    console.log(`Resposta do provedor:`, response.data);

    if (!response.data) {
      return NextResponse.json(
        { error: 'Resposta vazia do provedor' },
        { status: 500 }
      );
    }

    // Mapear o status do provedor para nosso sistema
    let newStatus = order.status;
    
    if (response.data.status) {
      if (['completed', 'complete', 'done', 'finished'].includes(response.data.status.toLowerCase())) {
        newStatus = 'completed';
      } else if (['failed', 'error', 'cancelled', 'canceled'].includes(response.data.status.toLowerCase())) {
        newStatus = 'failed';
      } else if (['partial'].includes(response.data.status.toLowerCase())) {
        newStatus = 'partial';
      } else if (['pending', 'processing', 'in_progress', 'progress'].includes(response.data.status.toLowerCase())) {
        newStatus = 'processing';
      }
    }

    // Atualizar o pedido com o novo status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        metadata: {
          ...order.metadata,
          status_updates: [
            ...(order.metadata?.status_updates || []),
            {
              timestamp: new Date().toISOString(),
              previous_status: order.status,
              new_status: newStatus,
              provider_response: response.data,
              source: 'status_check'
            }
          ]
        }
      }
    });

    // Criar log do pedido
    await prisma.orderLog.create({
      data: {
        order_id: orderId,
        message: `Status atualizado para ${newStatus} após consulta ao provedor`,
        level: 'info',
        data: { 
          provider_response: response.data,
          previous_status: order.status,
          new_status: newStatus
        }
      }
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      provider_status: response.data.status,
      charge: response.data.charge,
      start_count: response.data.start_count,
      remains: response.data.remains,
      currency: response.data.currency
    });
  } catch (error: any) {
    console.error('Erro ao consultar status do pedido:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao consultar status do pedido', 
        details: error.message 
      },
      { status: 500 }
    );
  }
} 