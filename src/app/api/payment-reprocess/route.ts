import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import axios, { AxiosError } from 'axios';

// URL do microserviço de orders
// Ajuste para garantir que não haja duplicação de /api/ no caminho
const ORDERS_API_URL = (process.env.ORDERS_API_URL?.endsWith('/api') 
  ? process.env.ORDERS_API_URL 
  : (process.env.ORDERS_API_URL || 'http://localhost:3001/api')).replace(/;$/, '');

const ORDERS_API_KEY = process.env.ORDERS_API_KEY || 'default-key';

console.log(`[CONFIG] ORDERS_API_URL definido como: ${ORDERS_API_URL}`);

// Interfaces para tipagem
interface ReposicaoOrders {
  id: string;
  status: string;
  data_solicitacao: string;
  data_processamento: string | null;
  tentativas: number;
  motivo: string;
  observacoes: string;
  resposta: string | null;
}

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
        console.log(`[API] Buscando pedido no orders com transaction_id: ${latestTransaction.id}`);
        
        // Primeiro, tentar sincronizar o pedido para garantir que ele existe no orders
        try {
          // Extrair informações do pedido para sincronização
          const syncData = {
            transaction_id: latestTransaction.id,
            target_username: '', // Preenchido abaixo
            external_service_id: null, // Preenchido abaixo
            status: 'completed' // Presumimos que está completo para permitir reposição
          };
          
          // Extrair username e external_service_id do pedido
          if (paymentRequest.additional_data) {
            try {
              const additionalData = JSON.parse(paymentRequest.additional_data);
              
              // Extrair username/target
              if (additionalData.username) {
                syncData.target_username = additionalData.username;
              } else if (additionalData.target) {
                syncData.target_username = additionalData.target;
              } else if (additionalData.link) {
                // Tentar extrair username do link (ex: instagram.com/username)
                const matches = additionalData.link.match(/instagram\.com\/([^\/\?]+)/);
                if (matches && matches[1]) {
                  syncData.target_username = matches[1];
                } else {
                  syncData.target_username = additionalData.link;
                }
              }
              
              // Extrair external_service_id
              if (additionalData.external_service_id) {
                syncData.external_service_id = additionalData.external_service_id;
              } else if (additionalData.metadata && additionalData.metadata.external_service_id) {
                syncData.external_service_id = additionalData.metadata.external_service_id;
              } else if (additionalData.service_id) {
                syncData.external_service_id = additionalData.service_id;
              }
            } catch (parseError) {
              console.error('[API] Erro ao processar additional_data:', parseError);
            }
          }
          
          // Se não conseguiu extrair um username, usar um valor padrão
          if (!syncData.target_username) {
            syncData.target_username = `user_${latestTransaction.id}`;
          }
          
          console.log(`[API] Sincronizando pedido com orders:`, syncData);
          
          // Enviar dados para o endpoint de sincronização
          const syncResponse = await axios.post(`${ORDERS_API_URL}/orders/sync`, syncData, {
            headers: {
              'Authorization': `Bearer ${ORDERS_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`[API] Resposta da sincronização: ${syncResponse.status}`);
          console.log(`[API] Ação: ${syncResponse.data.action}, Pedido: ${syncResponse.data.order.id}`);
          
          // Atualizar metadados com informação da sincronização
          await db.processingQueue.update({
            where: { id: processingQueue.id },
            data: {
              metadata: JSON.stringify({
                ...JSON.parse(processingQueue.metadata || '{}'),
                syncResult: {
                  action: syncResponse.data.action,
                  orderId: syncResponse.data.order.id,
                  timestamp: new Date().toISOString()
                }
              })
            }
          });
          
          // Se chegou aqui, a sincronização foi bem-sucedida, então agora podemos buscar o pedido
        } catch (error) {
          const syncError = error as AxiosError;
          console.error('[API] Erro ao sincronizar pedido com orders:', syncError);
          
          // Registrar o erro de sincronização, mas continuar com a tentativa normal
          if (syncError.response) {
            console.error(`[API] Status: ${syncError.response.status}`);
            console.error(`[API] Dados: ${JSON.stringify(syncError.response.data)}`);
          }
        }
        
        // Continuar com a busca normal do pedido
        const ordersEndpoint = `${ORDERS_API_URL}/orders/find`;
        console.log(`[API] Fazendo requisição para: ${ordersEndpoint}`);
        
        const ordersResponse = await axios.get(ordersEndpoint, {
          params: {
            transaction_id: latestTransaction.id
          },
          headers: {
            'Authorization': `Bearer ${ORDERS_API_KEY}`
          }
        });
        
        console.log(`[API] Resposta do orders: ${ordersResponse.status}`);
        console.log(`[API] Resposta do orders: ${JSON.stringify(ordersResponse.data)}`);
        
        if (ordersResponse.data && ordersResponse.data.order) {
          const order = ordersResponse.data.order;
          console.log(`[API] Pedido encontrado no microserviço de orders: ${order.id}`);
          
          // Verificar se o pedido tem external_service_id
          if (!order.external_service_id) {
            console.warn(`[API] Aviso: Pedido ${order.id} não possui external_service_id para reposição`);
            
            // Tentar extrair external_service_id do paymentRequest.additional_data
            let externalServiceId = null;
            
            if (paymentRequest.additional_data) {
              try {
                const additionalData = JSON.parse(paymentRequest.additional_data);
                
                // Verificar várias possíveis localizações do external_service_id
                if (additionalData.external_service_id) {
                  externalServiceId = additionalData.external_service_id;
                  console.log(`[API] Encontrado external_service_id em additional_data: ${externalServiceId}`);
                } 
                else if (additionalData.metadata && additionalData.metadata.external_service_id) {
                  externalServiceId = additionalData.metadata.external_service_id;
                  console.log(`[API] Encontrado external_service_id em metadata: ${externalServiceId}`);
                }
                else if (additionalData.service_id) {
                  externalServiceId = additionalData.service_id;
                  console.log(`[API] Usando service_id como external_service_id: ${externalServiceId}`);
                }
              } catch (parseError) {
                console.error('[API] Erro ao processar additional_data:', parseError);
              }
            }
            
            // Se encontramos um external_service_id, atualizar o pedido no orders
            if (externalServiceId) {
              try {
                await axios.patch(`${ORDERS_API_URL}/orders/${order.id}`, {
                  external_service_id: externalServiceId
                }, {
                  headers: {
                    'Authorization': `Bearer ${ORDERS_API_KEY}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                console.log(`[API] Atualizado external_service_id do pedido ${order.id} para: ${externalServiceId}`);
                
                // Atualizar o objeto order com o novo external_service_id
                order.external_service_id = externalServiceId;
              } catch (updateError) {
                console.error('[API] Erro ao atualizar external_service_id no orders:', updateError);
              }
            }
          }
          
          // Criar a solicitação de reposição no microserviço de orders
          console.log(`[API] Criando reposição no microserviço de orders para o pedido: ${order.id}`);
          
          const reposicaoResponse = await axios.post(`${ORDERS_API_URL}/reposicoes`, {
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
        } else {
          console.error(`[API] Pedido não encontrado no microserviço de orders para transaction_id: ${latestTransaction.id}`);
          
          // Verificar se o pedido existe no banco de dados local
          const existingPayments = await db.paymentRequest.findMany({
            where: {
              transactions: {
                some: {
                  id: latestTransaction.id
                }
              }
            },
            include: {
              transactions: true
            }
          });
          
          if (existingPayments.length > 0) {
            console.log(`[API] Pedido encontrado localmente para a transação: ${latestTransaction.id}`);
            
            // Extrair external_service_id do pagamento
            let externalServiceId = null;
            if (paymentRequest.additional_data) {
              try {
                const additionalData = JSON.parse(paymentRequest.additional_data);
                
                if (additionalData.external_service_id) {
                  externalServiceId = additionalData.external_service_id;
                  console.log(`[API] Encontrado external_service_id em additional_data: ${externalServiceId}`);
                } else if (additionalData.metadata && additionalData.metadata.external_service_id) {
                  externalServiceId = additionalData.metadata.external_service_id;
                  console.log(`[API] Encontrado external_service_id em metadata: ${externalServiceId}`);
                } else if (additionalData.service_id) {
                  externalServiceId = additionalData.service_id;
                  console.log(`[API] Usando service_id como external_service_id: ${externalServiceId}`);
                }
              } catch (parseError) {
                console.error('[API] Erro ao processar additional_data:', parseError);
              }
            }
            
            // Tentar a criação da reposição diretamente, sem o order_id
            try {
              const reposicaoResponse = await axios.post(`${ORDERS_API_URL}/reposicoes/create-by-transaction`, {
                transaction_id: latestTransaction.id,
                motivo: reason || 'Solicitação manual do cliente',
                observacoes: `Solicitação via API de pagamentos. PaymentRequestID: ${paymentRequestId}`,
                external_service_id: externalServiceId // Adicionar external_service_id ao payload
              }, {
                headers: {
                  'Authorization': `Bearer ${ORDERS_API_KEY}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (reposicaoResponse.data && reposicaoResponse.data.success) {
                console.log(`[API] Reposição criada no microserviço de orders via transaction_id: ${reposicaoResponse.data.reposicao.id}`);
                
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
            } catch (alternativeError: unknown) {
              console.error('[API] Erro ao criar reposição pelo endpoint alternativo:');
              
              // Verificar o tipo do erro para tratamento adequado
              if (alternativeError && typeof alternativeError === 'object' && 'response' in alternativeError) {
                const errorResponse = (alternativeError as any).response;
                console.error(`[API] Status: ${errorResponse?.status || 'desconhecido'}`);
                console.error(`[API] Dados: ${JSON.stringify(errorResponse?.data || {})}`);
                
                // Registrar o erro nos metadados
                await db.processingQueue.update({
                  where: { id: processingQueue.id },
                  data: {
                    metadata: JSON.stringify({
                      ...JSON.parse(processingQueue.metadata || '{}'),
                      alternative_endpoint_error: errorResponse?.data?.error || "Erro na resposta da API",
                      error_status: errorResponse?.status,
                      error_timestamp: new Date().toISOString()
                    })
                  }
                });
              } else if (alternativeError instanceof Error) {
                console.error(`[API] Mensagem: ${alternativeError.message}`);
                
                // Registrar o erro nos metadados
                await db.processingQueue.update({
                  where: { id: processingQueue.id },
                  data: {
                    metadata: JSON.stringify({
                      ...JSON.parse(processingQueue.metadata || '{}'),
                      alternative_endpoint_error: alternativeError.message,
                      error_timestamp: new Date().toISOString()
                    })
                  }
                });
              } else {
                console.error('[API] Erro desconhecido ao usar endpoint alternativo');
                
                // Registrar erro genérico
                await db.processingQueue.update({
                  where: { id: processingQueue.id },
                  data: {
                    metadata: JSON.stringify({
                      ...JSON.parse(processingQueue.metadata || '{}'),
                      alternative_endpoint_error: "Erro desconhecido",
                      error_timestamp: new Date().toISOString()
                    })
                  }
                });
              }
            }
          }
        }
      } else {
        console.warn(`[API] Nenhuma transação encontrada para o pedido: ${paymentRequestId}`);
      }
    } catch (ordersError: unknown) {
      // Melhorar o tratamento de erro com tipagem adequada
      console.error('[API] Erro ao criar reposição no microserviço de orders:');
      
      // Verificar se é um erro de resposta do Axios
      if (ordersError && typeof ordersError === 'object' && 'response' in ordersError) {
        const errorResponse = (ordersError as any).response;
        console.error(`[API] Status: ${errorResponse?.status || 'desconhecido'}`);
        console.error(`[API] Dados: ${JSON.stringify(errorResponse?.data || {})}`);
        
        // Registrar a causa específica do erro para debugging
        if (errorResponse?.data?.error === "Pedido não encontrado") {
          console.error('[API] Problema específico: O pedido não foi encontrado no microserviço de orders');
          
          // Fazer o registro do erro específico nos metadados da fila
          await db.processingQueue.update({
            where: { id: processingQueue.id },
            data: {
              metadata: JSON.stringify({
                ...JSON.parse(processingQueue.metadata || '{}'),
                orders_error: "Pedido não encontrado no microserviço de orders",
                error_timestamp: new Date().toISOString()
              })
            }
          });
        }
      } else if (ordersError instanceof Error) {
        // Se for um erro padrão do JavaScript
        console.error(`[API] Mensagem de erro: ${ordersError.message}`);
        
        // Fazer o registro do erro nos metadados da fila
        await db.processingQueue.update({
          where: { id: processingQueue.id },
          data: {
            metadata: JSON.stringify({
              ...JSON.parse(processingQueue.metadata || '{}'),
              orders_error: ordersError.message,
              error_timestamp: new Date().toISOString()
            })
          }
        });
      } else {
        // Se for algum outro tipo de erro
        console.error(`[API] Erro desconhecido:`, ordersError);
        
        // Fazer o registro do erro genérico nos metadados da fila
        await db.processingQueue.update({
          where: { id: processingQueue.id },
          data: {
            metadata: JSON.stringify({
              ...JSON.parse(processingQueue.metadata || '{}'),
              orders_error: "Erro desconhecido ao comunicar com o microserviço de orders",
              error_timestamp: new Date().toISOString()
            })
          }
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Solicitação de reposição criada com sucesso',
      reprocessRequestId: processingQueue.id
    });
    
  } catch (error: unknown) {
    console.error('[API] Erro ao processar solicitação de reposição:');
    
    let errorMessage = 'Erro interno do servidor';
    let errorDetails = 'Não foi possível processar a solicitação de reposição';
    
    if (error instanceof Error) {
      console.error(`[API] Mensagem: ${error.message}`);
      console.error(`[API] Stack: ${error.stack}`);
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      console.error('[API] Objeto de erro:', error);
      errorMessage = 'Erro ao processar solicitação';
    } else {
      console.error('[API] Erro desconhecido:', error);
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails
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
        console.log(`[API] Buscando pedido no orders com transaction_id: ${latestTransaction.id}`);
        
        const ordersResponse = await axios.get(`${ORDERS_API_URL}/orders/find`, {
          params: {
            transaction_id: latestTransaction.id
          },
          headers: {
            'Authorization': `Bearer ${ORDERS_API_KEY}`
          }
        });
        
        if (ordersResponse.data && ordersResponse.data.order) {
          const orderId = ordersResponse.data.order.id;
          console.log(`[API] Pedido encontrado no microserviço de orders: ${orderId}`);
          
          // Buscar reposições no microserviço de orders
          console.log(`[API] Buscando reposições para o pedido: ${orderId}`);
          
          const reposicoesResponse = await axios.get(`${ORDERS_API_URL}/reposicoes`, {
            params: {
              orderId
            },
            headers: {
              'Authorization': `Bearer ${ORDERS_API_KEY}`
            }
          });
          
          if (reposicoesResponse.data && reposicoesResponse.data.reposicoes) {
            console.log(`[API] Encontradas ${reposicoesResponse.data.reposicoes.length} reposições no microserviço de orders`);
            
            // Mapear as reposições do microserviço de orders para o mesmo formato
            ordersReposicoes = reposicoesResponse.data.reposicoes.map((reposicao: ReposicaoOrders) => ({
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
        } else {
          console.warn(`[API] Pedido não encontrado no microserviço de orders para transaction_id: ${latestTransaction.id}`);
        }
      }
    } catch (ordersError: unknown) {
      // Melhorar o tratamento de erro com tipagem adequada
      console.error('[API] Erro ao buscar reposições no microserviço de orders:');
      
      // Verificar se é um erro de resposta do Axios
      if (ordersError && typeof ordersError === 'object' && 'response' in ordersError) {
        const errorResponse = (ordersError as any).response;
        console.error(`[API] Status: ${errorResponse?.status || 'desconhecido'}`);
        console.error(`[API] Dados: ${JSON.stringify(errorResponse?.data || {})}`);
        
        // Registrar mensagens específicas para debugging
        if (errorResponse?.data?.error === "Pedido não encontrado") {
          console.error('[API] O pedido não foi encontrado no microserviço de orders');
        }
      } else if (ordersError instanceof Error) {
        // Se for um erro padrão do JavaScript
        console.error(`[API] Mensagem de erro: ${ordersError.message}`);
      } else {
        // Se for algum outro tipo de erro
        console.error(`[API] Erro desconhecido:`, ordersError);
      }
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
    
  } catch (error: unknown) {
    console.error('[API] Erro ao buscar status de reposições:');
    
    let errorMessage = 'Erro interno do servidor';
    
    if (error instanceof Error) {
      console.error(`[API] Mensagem: ${error.message}`);
      console.error(`[API] Stack: ${error.stack}`);
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      console.error('[API] Objeto de erro:', error);
      errorMessage = 'Erro ao buscar status de reposições';
    } else {
      console.error('[API] Erro desconhecido:', error);
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: 'Não foi possível buscar o status das reposições'
      },
      { status: 500 }
    );
  }
} 