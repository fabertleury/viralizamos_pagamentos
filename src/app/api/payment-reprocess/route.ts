import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import axios from 'axios';

// URL do microserviço de orders
const ORDERS_API_URL = process.env.ORDERS_API_URL || 'http://localhost:3001';
const ORDERS_API_KEY = process.env.ORDERS_API_KEY || 'default-key';

/**
 * Endpoint para solicitar reprocessamento/reposição de um pedido
 * Este endpoint cria uma entrada na fila de processamento para ser tratada posteriormente
 * e também envia a solicitação para o microserviço de orders
 */
export async function POST(request: NextRequest) {
  try {
    // Obter dados da requisição
    const { paymentRequestId, reason } = await request.json();
    
    if (!paymentRequestId) {
      return NextResponse.json(
        { error: 'ID do pedido não fornecido' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Recebida solicitação de reposição para o pedido: ${paymentRequestId}`);
    
    // Verificar se o pedido existe
    const paymentRequest = await db.paymentRequest.findUnique({
      where: { id: paymentRequestId },
      include: {
        transactions: true // Incluir dados das transações
      }
    });
    
    if (!paymentRequest) {
      console.error(`[API] Pedido não encontrado: ${paymentRequestId}`);
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se já existe uma solicitação de reprocessamento pendente
    const existingQueue = await db.processingQueue.findFirst({
      where: {
        payment_request_id: paymentRequestId,
        type: 'reprocess',
        status: 'pending'
      }
    });
    
    if (existingQueue) {
      console.log(`[API] Já existe uma solicitação de reposição pendente para o pedido: ${paymentRequestId}`);
      return NextResponse.json({
        success: true,
        message: 'Já existe uma solicitação de reposição pendente para este pedido',
        reprocessRequestId: existingQueue.id
      });
    }
    
    // Criar entrada na fila de processamento
    const processingQueue = await db.processingQueue.create({
      data: {
        payment_request_id: paymentRequestId,
        type: 'reprocess',
        status: 'pending',
        priority: 1, // Alta prioridade para solicitações de reposição
        metadata: JSON.stringify({
          reason: reason || 'Solicitação manual do cliente',
          requested_at: new Date().toISOString()
        })
      }
    });
    
    console.log(`[API] Solicitação de reposição criada com sucesso: ${processingQueue.id}`);
    
    // Buscar o order_id no microserviço de orders usando o transaction_id
    try {
      // Buscar a transação mais recente (se houver)
      const latestTransaction = paymentRequest.transactions[0];
      
      if (latestTransaction?.id) {
        const ordersResponse = await axios.get(`${ORDERS_API_URL}/api/orders/find`, {
          params: {
            transaction_id: latestTransaction.id
          },
          headers: {
            'Authorization': `Bearer ${ORDERS_API_KEY}`
          }
        });
        
        if (ordersResponse.data && ordersResponse.data.order) {
          const order = ordersResponse.data.order;
          
          // Criar a solicitação de reposição no microserviço de orders
          const reposicaoResponse = await axios.post(`${ORDERS_API_URL}/api/reposicoes`, {
            order_id: order.id,
            motivo: reason || 'Solicitação manual do cliente',
            observacoes: `Solicitação via API de pagamentos. PaymentRequestID: ${paymentRequestId}`
          }, {
            headers: {
              'Authorization': `Bearer ${ORDERS_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (reposicaoResponse.data && reposicaoResponse.data.success) {
            console.log(`[API] Reposição também criada no microserviço de orders: ${reposicaoResponse.data.reposicao.id}`);
            
            // Atualizar os metadados da fila de processamento com o ID da reposição no orders
            await db.processingQueue.update({
              where: { id: processingQueue.id },
              data: {
                metadata: JSON.stringify({
                  ...JSON.parse(processingQueue.metadata || '{}'),
                  orders_reposicao_id: reposicaoResponse.data.reposicao.id
                })
              }
            });
          }
        }
      }
    } catch (ordersError) {
      // Apenas logar o erro, mas não falhar a requisição principal
      console.error('[API] Erro ao criar reposição no microserviço de orders:', ordersError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Solicitação de reposição criada com sucesso',
      reprocessRequestId: processingQueue.id
    });
    
  } catch (error) {
    console.error('[API] Erro ao processar solicitação de reposição:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        details: 'Não foi possível processar a solicitação de reposição'
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint para verificar status das reposições de um pedido
 */
export async function GET(request: NextRequest) {
  try {
    // Obter o ID do pedido da query string
    const { searchParams } = new URL(request.url);
    const paymentRequestId = searchParams.get('paymentRequestId');
    
    if (!paymentRequestId) {
      return NextResponse.json(
        { error: 'ID do pedido não fornecido' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Verificando status de reposições para o pedido: ${paymentRequestId}`);
    
    // Buscar o pedido para obter o transaction_id
    const paymentRequest = await db.paymentRequest.findUnique({
      where: { id: paymentRequestId },
      include: {
        transactions: true
      }
    });
    
    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }
    
    // Buscar todas as solicitações de reposição para o pedido
    const reprocessRequests = await db.processingQueue.findMany({
      where: {
        payment_request_id: paymentRequestId,
        type: 'reprocess'
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    // Transformar os dados para um formato mais amigável
    const formattedRequests = reprocessRequests.map(request => ({
      id: request.id,
      status: request.status,
      created_at: request.created_at,
      processed_at: request.processed_at,
      attempts: request.attempts,
      metadata: request.metadata ? JSON.parse(request.metadata) : {}
    }));
    
    // Se tiver transaction_id, buscar também as reposições no microserviço de orders
    let ordersReposicoes = [];
    try {
      const latestTransaction = paymentRequest.transactions[0];
      
      if (latestTransaction?.id) {
        const ordersResponse = await axios.get(`${ORDERS_API_URL}/api/orders/find`, {
          params: {
            transaction_id: latestTransaction.id
          },
          headers: {
            'Authorization': `Bearer ${ORDERS_API_KEY}`
          }
        });
        
        if (ordersResponse.data && ordersResponse.data.order) {
          const orderId = ordersResponse.data.order.id;
          
          // Buscar reposições no microserviço de orders
          const reposicoesResponse = await axios.get(`${ORDERS_API_URL}/api/reposicoes`, {
            params: {
              orderId
            },
            headers: {
              'Authorization': `Bearer ${ORDERS_API_KEY}`
            }
          });
          
          if (reposicoesResponse.data && reposicoesResponse.data.reposicoes) {
            // Mapear as reposições do microserviço de orders para o mesmo formato
            ordersReposicoes = reposicoesResponse.data.reposicoes.map(reposicao => ({
              id: reposicao.id,
              status: reposicao.status,
              created_at: reposicao.data_solicitacao,
              processed_at: reposicao.data_processamento,
              attempts: reposicao.tentativas,
              metadata: {
                orders_reposicao: true,
                motivo: reposicao.motivo,
                observacoes: reposicao.observacoes,
                resposta: reposicao.resposta
              }
            }));
          }
        }
      }
    } catch (ordersError) {
      // Apenas logar o erro, mas não falhar a requisição principal
      console.error('[API] Erro ao buscar reposições no microserviço de orders:', ordersError);
    }
    
    // Combinar as reposições dos dois sistemas
    const allRequests = [...formattedRequests, ...ordersReposicoes];
    
    // Ordenar por data de criação (mais recentes primeiro)
    allRequests.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
    
    return NextResponse.json({
      success: true,
      reprocessRequests: allRequests
    });
    
  } catch (error) {
    console.error('[API] Erro ao buscar status de reposições:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        details: 'Não foi possível buscar o status das reposições'
      },
      { status: 500 }
    );
  }
} 