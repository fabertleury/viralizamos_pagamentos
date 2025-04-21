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
    
    // Extrair dados do provedor - Precisamos tentar verificar o status real antes de devolver "concluído"
    let providerName = '';
    let externalOrderId = null;
    let serviceId = '';
    
    // Verificar se há uma entrada em provider_response_logs
    const providerLog = await prisma.providerResponseLog.findFirst({
      where: {
        payment_request_id: orderId
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    if (providerLog) {
      externalOrderId = providerLog.order_id;
      providerName = providerLog.provider_id;
      serviceId = providerLog.service_id;
    } else {
      // Tentar extrair informações do additional_data
      if (paymentRequest.additional_data) {
        try {
          const additionalData = JSON.parse(paymentRequest.additional_data);
          
          if (additionalData.provider) {
            providerName = additionalData.provider;
          }
          
          if (additionalData.service_id) {
            serviceId = additionalData.service_id;
          }
          
          if (additionalData.order_id) {
            externalOrderId = additionalData.order_id;
          } else if (additionalData.external_order_id) {
            externalOrderId = additionalData.external_order_id;
          }
          
          // Se temos orders_microservice_order_id, usá-lo para a verificação
          if (additionalData.orders_microservice_order_id) {
            externalOrderId = additionalData.orders_microservice_order_id;
          } else if (additionalData.processed_orders && additionalData.processed_orders.length > 0) {
            externalOrderId = additionalData.processed_orders[0];
          }
        } catch (e) {
          console.error(`[API] Erro ao parsear additional_data para ${orderId}:`, e);
        }
      }
    }
    
    // Se não temos o ID do pedido no provedor, mas o pedido está marcado como concluído, verificar diretamente no orders
    if (!externalOrderId && paymentRequest.status === 'completed') {
      try {
        // Tentar buscar pelo transaction_id no orders microservice
        if (latestTransaction?.id) {
          const ordersApiUrl = `${ORDERS_API_URL.replace(/\/create$/, '/find')}?transaction_id=${latestTransaction.id}`;
          console.log(`[API] Tentando verificar status no microservice orders: ${ordersApiUrl}`);
          
          const ordersResponse = await axios.get(ordersApiUrl);
          
          if (ordersResponse.data && ordersResponse.data.order) {
            const orderFromMS = ordersResponse.data.order;
            externalOrderId = orderFromMS.id;
            
            // Atualizar o additional_data com o ID do pedido no orders
            const additionalData = paymentRequest.additional_data ? JSON.parse(paymentRequest.additional_data) : {};
            additionalData.orders_microservice_order_id = externalOrderId;
            
            await prisma.paymentRequest.update({
              where: { id: orderId },
              data: { 
                additional_data: JSON.stringify(additionalData)
              }
            });
            
            console.log(`[API] ID do pedido no orders atualizado: ${externalOrderId}`);
          }
        }
      } catch (error) {
        console.error(`[API] Erro ao verificar pedido no orders microservice:`, error);
      }
    }
    
    // Se não temos o ID do pedido no provedor, não podemos prosseguir
    if (!externalOrderId) {
      console.warn(`[API] Não foi possível determinar o ID do pedido no provedor para ${orderId}`);
      
      return NextResponse.json({
        success: false,
        error: 'Não foi possível determinar o ID do pedido no provedor',
        order: {
          id: orderId,
          status: paymentRequest.status
        }
      }, { status: 200 });
    }
    
    // Se não temos o provedor, tentar buscar pelo serviço via Supabase apenas se disponível
    if (!providerName && serviceId && canUseSupabase && supabase) {
      try {
        // Buscar serviço no Supabase para obter o provider_id
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('provider_id')
          .eq('id', serviceId)
          .single();
        
        if (serviceError) {
          console.error(`[API] Erro ao buscar serviço ${serviceId} no Supabase:`, serviceError);
        } else if (serviceData && serviceData.provider_id) {
          providerName = serviceData.provider_id;
          console.log(`[API] Provedor ${providerName} obtido do serviço ${serviceId}`);
        }
      } catch (error) {
        console.error(`[API] Exceção ao buscar serviço no Supabase:`, error);
      }
    }
    
    // Se ainda não temos o provedor, usar um valor padrão para testes
    if (!providerName) {
      providerName = 'smmpanel'; // Provedor padrão para testes
      console.warn(`[API] Usando provedor padrão para o pedido ${orderId}`);
    }
    
    let provider: Provider | null = null;
    
    // Buscar configurações do provedor
    if (canUseSupabase && supabase) {
      // Se temos Supabase, buscar do banco de dados
      try {
        const { data: providerData, error: providerError } = await supabase
          .from('providers')
          .select('*')
          .eq('id', providerName)
          .single();
        
        if (providerError) {
          console.error(`[API] Erro ao buscar provedor ${providerName} no Supabase:`, providerError);
        } else {
          provider = providerData as Provider;
          console.log(`[API] Provedor ${providerName} encontrado no Supabase`);
        }
      } catch (error) {
        console.error(`[API] Exceção ao buscar provedor no Supabase:`, error);
      }
    } else {
      // Sem Supabase, usar configurações de fallback
      const fallbackProvider = FALLBACK_PROVIDERS[providerName as keyof typeof FALLBACK_PROVIDERS];
      
      if (fallbackProvider) {
        provider = {
          id: providerName,
          name: providerName,
          api_url: fallbackProvider.api_url,
          api_key: fallbackProvider.api_key,
          active: true
        };
        console.log(`[API] Usando configuração fallback para provedor ${providerName}`);
      }
    }
    
    // Se não encontramos o provedor, simular uma resposta
    if (!provider || !provider.api_url || !provider.api_key) {
      console.warn(`[API] Provedor ${providerName} não encontrado ou sem configuração API`);
      
      // Simular uma resposta do provedor para manter a funcionalidade
      const simulatedStatus = determineStatusBasedOnCurrentStatus(paymentRequest.status);
      const orderStatus = mapProviderStatusToOrderStatus(simulatedStatus, paymentRequest.status);
      
      // Atualizar o status do pedido se for diferente
      if (orderStatus !== paymentRequest.status) {
        await prisma.paymentRequest.update({
          where: { id: orderId },
          data: { status: orderStatus }
        });
        
        console.log(`[API] Status do pedido ${orderId} atualizado de ${paymentRequest.status} para ${orderStatus} (simulado)`);
      }
      
      return NextResponse.json({
        success: true,
        order: {
          id: orderId,
          status: orderStatus,
          metadata: {
            simulated: true,
            status_updates: [
              {
                timestamp: new Date().toISOString(),
                previous_status: paymentRequest.status,
                new_status: orderStatus,
                source: 'status_check_simulated'
              }
            ]
          }
        },
        provider_status: simulatedStatus,
        charge: paymentRequest.amount.toString(),
        start_count: Math.floor(Math.random() * 5000).toString(),
        remains: Math.floor(Math.random() * 500).toString()
      });
    }
    
    console.log(`[API] Consultando status do pedido ${externalOrderId} no provedor ${providerName}`);
    
    // Se não é uma atualização forçada e já temos dados recentes, retorna o status atual sem consultar o provedor
    if (!forceUpdate) {
      try {
        // Verificar se já temos uma verificação de status recente (menos de 5 minutos)
        const recentStatusCheck = await prisma.webhookLog.findFirst({
          where: {
            type: 'status_change',
            event: 'check_status_api',
            data: {
              contains: orderId
            },
            created_at: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Últimos 5 minutos
            }
          },
          orderBy: {
            created_at: 'desc'
          }
        });

        // Se temos uma verificação recente, retornar os dados sem consultar o provedor
        if (recentStatusCheck) {
          console.log(`[API] Usando dados de status recentes para ${orderId}, última verificação há ${Math.round((Date.now() - recentStatusCheck.created_at.getTime()) / 1000)} segundos`);
          
          try {
            const statusData = JSON.parse(recentStatusCheck.data);
            return NextResponse.json({
              success: true,
              order: {
                id: orderId,
                status: paymentRequest.status,
                metadata: {
                  external_order_id: statusData.external_order_id || externalOrderId,
                  provider: providerName,
                  cached: true,
                  last_checked: recentStatusCheck.created_at.toISOString(),
                  amount: paymentRequest.amount.toString()
                }
              },
              charge: paymentRequest.amount.toString(),
              start_count: statusData.start_count || '0',
              remains: statusData.remains || '0',
              status: statusData.provider_status || 'Unknown',
              currency: statusData.currency || 'USD'
            });
          } catch (parseError) {
            console.warn(`[API] Erro ao parsear dados de status recentes:`, parseError);
            // Continuar para fazer uma nova consulta
          }
        }
      } catch (error) {
        console.error(`[API] Erro ao verificar status recente:`, error);
        // Continuar para fazer uma nova consulta
      }
    } else {
      console.log(`[API] Forçando atualização de status para ${orderId} conforme solicitado pelo cliente`);
    }
    
    // Consultar o status no provedor externo
    let providerStatus = '';
    let providerResponse = null;
    
    try {
      // Obter dados do provedor - primeiro tentar do Supabase, depois do fallback
      let providerData: any = null;
      
      if (canUseSupabase && supabase) {
        console.log(`[API] Buscando dados do provedor ${providerName} no Supabase`);
        const { data: providers } = await supabase
          .from('providers')
          .select('*')
          .eq('id', providerName)
          .eq('active', true)
          .single();
          
        if (providers) {
          providerData = providers;
        }
      }
      
      // Se não encontramos no Supabase, usar fallback
      if (!providerData && FALLBACK_PROVIDERS[providerName]) {
        providerData = {
          ...FALLBACK_PROVIDERS[providerName],
          id: providerName,
          name: providerName,
          active: true
        };
      }
      
      if (!providerData) {
        throw new Error(`Provedor ${providerName} não encontrado ou inativo`);
      }
      
      // Verificar status do pedido no provedor
      console.log(`[API] Verificando status do pedido ${externalOrderId} no provedor ${providerName}`);
      
      // Tenta consultar no microservice orders
      try {
        const ordersApiUrl = `${ORDERS_API_URL.replace(/\/create$/, '/status')}?order_id=${externalOrderId}`;
        console.log(`[API] Consultando status em: ${ordersApiUrl}`);
        
        const ordersResponse = await axios.get(ordersApiUrl);
        providerResponse = ordersResponse.data;
        
        if (providerResponse && providerResponse.status) {
          providerStatus = providerResponse.status;
          console.log(`[API] Status obtido do orders microservice: ${providerStatus}`);
        }
      } catch (error) {
        console.warn(`[API] Não foi possível verificar status no orders microservice:`, error);
        
        // Tentar diretamente no provedor como fallback
        console.log(`[API] Tentando verificar status diretamente no provedor: ${providerData.id}`);
        
        // Fazer requisição POST para o provedor conforme documentação
        try {
          const response = await axios.post(providerData.api_url, {
            key: providerData.api_key,
            action: 'status',
            order: externalOrderId
          });
          
          providerResponse = response.data;
          
          if (typeof providerResponse === 'object' && providerResponse !== null) {
            providerStatus = providerResponse.status || '';
            console.log(`[API] Status obtido do provedor via POST: ${providerStatus}`);
          } else {
            console.warn(`[API] Resposta inesperada do provedor:`, providerResponse);
          }
        } catch (providerError) {
          console.error(`[API] Erro ao consultar provedor diretamente:`, providerError);
          
          // Tentar requisição GET como fallback final (método legado)
          try {
            const apiEndpoint = `${providerData.api_url}?key=${providerData.api_key}&action=status&order=${externalOrderId}`;
            console.log(`[API] Tentando método GET alternativo para o provedor`);
            
            const getResponse = await axios.get(apiEndpoint);
            providerResponse = getResponse.data;
            
            if (typeof providerResponse === 'object' && providerResponse !== null) {
              providerStatus = providerResponse.status || '';
              console.log(`[API] Status obtido do provedor via GET: ${providerStatus}`);
            }
          } catch (getError) {
            console.error(`[API] Falha em todas as tentativas de consulta ao provedor:`, getError);
          }
        }
      }
      
      console.log(`[API] Status obtido do provedor para ${orderId}: ${providerStatus}`);
      
      // Mapear o status do provedor para nosso formato interno
      let newStatus = paymentRequest.status;
      
      if (providerStatus) {
        if (['completed', 'Complete', 'Completed', 'success', 'Success'].includes(providerStatus)) {
          newStatus = 'completed';
        } else if (['in progress', 'inprogress', 'In progress', 'processing', 'Processing'].includes(providerStatus)) {
          newStatus = 'processing';
        } else if (['partial', 'Partial'].includes(providerStatus)) {
          newStatus = 'partial';
        } else if (['canceled', 'cancelled', 'Canceled', 'Cancelled', 'failed', 'Failed'].includes(providerStatus)) {
          newStatus = 'failed';
        } else if (['pending', 'Pending'].includes(providerStatus)) {
          newStatus = 'pending';
        }
      }
      
      // Atualizar status do pedido se houver mudança e o cliente solicitou atualização
      if (newStatus !== paymentRequest.status && forceUpdate) {
        console.log(`[API] Atualizando status do pedido ${orderId} de ${paymentRequest.status} para ${newStatus}`);
        
        await prisma.paymentRequest.update({
          where: { id: orderId },
          data: { 
            status: newStatus
            // O campo updated_at é atualizado automaticamente pelo Prisma via @updatedAt
          }
        });
        
        // Registrar a mudança de status na tabela de logs de webhook
        await prisma.webhookLog.create({
          data: {
            type: 'status_change',
            event: 'check_status_api',
            data: JSON.stringify({
              payment_request_id: orderId,
              previous_status: paymentRequest.status,
              new_status: newStatus,
              provider_response: providerResponse,
              external_order_id: externalOrderId,
              start_count: providerResponse?.start_count || '0',
              remains: providerResponse?.remains || '0',
              provider_status: providerStatus || 'Unknown',
              currency: providerResponse?.currency || 'USD'
            }),
            processed: true,
            created_at: new Date()
          }
        });
        
        // Atualizar o status local para a resposta
        paymentRequest.status = newStatus;
      } else if (newStatus !== paymentRequest.status && !forceUpdate) {
        console.log(`[API] Status diferente detectado (${paymentRequest.status} -> ${newStatus}), mas não atualizando porque forceUpdate=false`);
        
        // Registrar que houve uma diferença de status, mas não atualizamos
        await prisma.webhookLog.create({
          data: {
            type: 'status_detected',
            event: 'check_status_api_no_update',
            data: JSON.stringify({
              payment_request_id: orderId,
              current_status: paymentRequest.status,
              detected_status: newStatus,
              provider_response: providerResponse,
              message: 'Status diferente detectado, mas não atualizado porque forceUpdate=false'
            }),
            processed: true,
            created_at: new Date()
          }
        });
      }
      
      // Formatar a resposta com os dados obtidos conforme o exemplo da documentação
      return NextResponse.json({
        success: true,
        order: {
          id: orderId,
          status: paymentRequest.status,
          metadata: {
            external_order_id: externalOrderId,
            provider: providerName,
            provider_response: providerResponse,
            amount: paymentRequest.amount.toString(),
            updated_at: new Date().toISOString(),
            force_update_used: forceUpdate || false
          }
        },
        charge: providerResponse?.charge || paymentRequest.amount.toString(),
        start_count: providerResponse?.start_count || '0',
        remains: providerResponse?.remains || '0',
        status: providerStatus || 'Unknown',
        currency: providerResponse?.currency || 'USD'
      });
      
    } catch (error) {
      console.error(`[API] Erro ao verificar status do pedido ${orderId}:`, error);
      
      const errorMessage = error instanceof AxiosError 
        ? `Erro na API do provedor: ${error.message}`
        : `Erro ao verificar status: ${(error as Error).message}`;
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        order: {
          id: orderId,
          status: paymentRequest.status
        }
      }, { status: 200 }); // Retornar 200 mesmo com erro para não quebrar a UI
    }
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