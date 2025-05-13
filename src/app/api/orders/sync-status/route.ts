import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

// API do microserviço de orders
const ORDERS_API_URL = process.env.ORDERS_API_URL || 'https://api.viralizamos.com.br/orders/create';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    if (token !== process.env.API_SECRET_KEY) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Obter parâmetros da requisição
    const { daysAgo = 7, forceUpdate = false, limit = 50 } = await request.json();
    
    // Calcular data para filtrar apenas pedidos recentes
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    // Buscar pedidos a serem verificados
    const orders = await prisma.paymentRequest.findMany({
      where: {
        created_at: {
          gte: startDate
        },
        status: {
          notIn: ['unpaid', 'failed', 'cancelled'] // Focar em pedidos que possam ter sido cancelados mas não estão marcados assim
        },
        // Certifique-se de que temos uma transação de pagamento aprovada
        transactions: {
          some: {
            status: 'approved'
          }
        }
      },
      include: {
        transactions: {
          orderBy: {
            created_at: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });
    
    console.log(`[API] Encontrados ${orders.length} pedidos para verificação de status`);
    
    // Resultados da sincronização
    const results = {
      total: orders.length,
      processed: 0,
      updated: 0,
      failed: 0,
      details: [] as any[]
    };
    
    // Processar cada pedido
    for (const order of orders) {
      try {
        results.processed++;
        
        // Extrair provider_id e order_id do additional_data
        let providerName = '';
        let externalOrderId: string | null = null;
        
        if (order.additional_data) {
          try {
            const additionalData = JSON.parse(order.additional_data);
            
            if (additionalData.provider) {
              providerName = additionalData.provider;
            }
            
            if (additionalData.order_id) {
              externalOrderId = additionalData.order_id;
            } else if (additionalData.external_order_id) {
              externalOrderId = additionalData.external_order_id;
            } else if (additionalData.orders_microservice_order_id) {
              externalOrderId = additionalData.orders_microservice_order_id;
            } else if (additionalData.processed_orders && additionalData.processed_orders.length > 0) {
              externalOrderId = additionalData.processed_orders[0];
            }
          } catch (e) {
            console.error(`[API] Erro ao parsear additional_data para ${order.id}:`, e);
          }
        }
        
        // Verificar se há provider_response_logs para este pedido
        if (!externalOrderId) {
          const providerLog = await prisma.providerResponseLog.findFirst({
            where: {
              payment_request_id: order.id
            },
            orderBy: {
              created_at: 'desc'
            }
          });
          
          if (providerLog) {
            externalOrderId = providerLog.order_id;
            providerName = providerLog.provider_id;
          }
        }
        
        // Se não encontramos o ID do pedido no provedor, não podemos verificar o status
        if (!externalOrderId) {
          results.details.push({
            id: order.id,
            status: order.status,
            result: 'skipped',
            reason: 'ID do pedido no provedor não encontrado'
          });
          continue;
        }
        
        // Tentar obter o status do pedido no microserviço orders
        try {
          const ordersApiUrl = `${ORDERS_API_URL.replace(/\/create$/, '/status')}?order_id=${externalOrderId}`;
          const ordersResponse = await axios.get(ordersApiUrl);
          const providerStatus = ordersResponse.data?.status || '';
          
          // Mapear o status do provedor para o nosso sistema
          let newStatus = order.status;
          
          // Verificar especificamente status de cancelamento
          if (providerStatus.toLowerCase().includes('cancel') || 
              providerStatus.toLowerCase() === 'failed' || 
              providerStatus.toLowerCase() === 'rejected') {
            newStatus = 'failed';
          } else if (['completed', 'Complete', 'Completed', 'success', 'Success'].includes(providerStatus)) {
            newStatus = 'completed';
          } else if (['in progress', 'inprogress', 'In progress', 'processing', 'Processing'].includes(providerStatus)) {
            newStatus = 'processing';
          } else if (['partial', 'Partial'].includes(providerStatus)) {
            newStatus = 'partial';
          } else if (['pending', 'Pending'].includes(providerStatus)) {
            newStatus = 'pending';
          }
          
          // Atualizar o status do pedido se houver mudança
          if (newStatus !== order.status) {
            await prisma.paymentRequest.update({
              where: { id: order.id },
              data: { 
                status: newStatus
              }
            });
            
            // Registrar a mudança de status para rastreabilidade
            await prisma.webhookLog.create({
              data: {
                type: 'status_change',
                event: 'batch_sync',
                data: JSON.stringify({
                  payment_request_id: order.id,
                  previous_status: order.status,
                  new_status: newStatus,
                  provider_status: providerStatus,
                  external_order_id: externalOrderId
                }),
                processed: true,
                created_at: new Date()
              }
            });
            
            results.updated++;
            results.details.push({
              id: order.id,
              token: order.token,
              previous_status: order.status,
              new_status: newStatus,
              provider_status: providerStatus,
              result: 'updated'
            });
          } else {
            results.details.push({
              id: order.id,
              token: order.token,
              status: order.status,
              provider_status: providerStatus,
              result: 'unchanged'
            });
          }
        } catch (error) {
          console.error(`[API] Erro ao verificar status do pedido ${order.id}:`, error);
          results.failed++;
          results.details.push({
            id: order.id,
            token: order.token,
            status: order.status,
            result: 'error',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      } catch (orderError) {
        console.error(`[API] Erro ao processar pedido:`, orderError);
        results.failed++;
        results.details.push({
          id: order.id,
          result: 'error',
          error: orderError instanceof Error ? orderError.message : 'Erro desconhecido'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Sincronização concluída. Processados: ${results.processed}, Atualizados: ${results.updated}, Falhas: ${results.failed}`,
      results
    });
  } catch (error) {
    console.error('[API] Erro na sincronização de status:', error);
    return NextResponse.json(
      { error: `Erro ao sincronizar status: ${(error as Error).message}` },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 