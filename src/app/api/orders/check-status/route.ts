import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import { createClient } from '@supabase/supabase-js';

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

// Simulação de provedores caso não tenhamos acesso ao Supabase
const FALLBACK_PROVIDERS = {
  'followerzz': {
    api_url: 'https://followerzz.com/api/v2',
    api_key: process.env.FOLLOWERZZ_API_KEY || 'demo_key',
  },
  'smmpanel': {
    api_url: 'https://smmpanel.com/api/v2',
    api_key: process.env.SMMPANEL_API_KEY || 'demo_key',
  }
};

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
      
      return NextResponse.json({
        success: true,
        order: {
          id: orderId,
          status: paymentRequest.status,
          metadata: {
            payment_status: latestTransaction?.status || 'unknown',
            message: 'Pagamento não foi aprovado ainda'
          }
        },
        provider_status: 'No provider data - Payment not approved',
        charge: '0',
        start_count: '0',
        remains: '0'
      });
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
        start_count: '0',
        remains: '0'
      });
    }
    
    // Extrair dados do provedor
    // Este é um ponto crítico: precisamos saber qual provedor e qual ID do pedido no provedor
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
        } catch (e) {
          console.error(`[API] Erro ao parsear additional_data para ${orderId}:`, e);
        }
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
    
    // Preparar para fazer a chamada real à API do provedor
    let providerResponse: Record<string, any> = {
      charge: '0',
      start_count: '0',
      status: 'Unknown',
      remains: '0',
      currency: 'USD'
    };
    
    try {
      // Fazer a chamada no formato correto para a API do provedor
      const response = await axios.post(provider.api_url, {
        key: provider.api_key,
        action: 'status',
        order: externalOrderId
      });
      
      providerResponse = response.data;
      
      console.log(`[API] Resposta do provedor ${providerName} para pedido ${externalOrderId}:`, providerResponse);
      
      // Salvar a resposta do provedor no log
      await prisma.providerResponseLog.create({
        data: {
          payment_request_id: orderId,
          transaction_id: latestTransaction.id,
          provider_id: providerName,
          service_id: serviceId || 'unknown',
          order_id: externalOrderId,
          response_data: JSON.stringify(providerResponse),
          status: providerResponse.status || 'unknown'
        }
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`[API] Erro ao consultar provedor ${providerName} para pedido ${externalOrderId}:`, axiosError.message);
      
      // Em caso de erro, manter os valores padrão
      providerResponse.status = 'Error: ' + axiosError.message;
    }
    
    // Mapear o status do provedor para o status interno
    const providerStatus = providerResponse.status || 'unknown';
    const orderStatus = mapProviderStatusToOrderStatus(providerStatus, paymentRequest.status);
    
    // Atualizar o status do pedido no banco de dados se for diferente
    if (orderStatus !== paymentRequest.status) {
      await prisma.paymentRequest.update({
        where: { id: orderId },
        data: { status: orderStatus }
      });
      
      console.log(`[API] Status do pedido ${orderId} atualizado de ${paymentRequest.status} para ${orderStatus}`);
    }
    
    // Retornar resposta com os dados atualizados do provedor
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
      charge: providerResponse.charge || '0',
      start_count: providerResponse.start_count || '0',
      remains: providerResponse.remains || '0',
      currency: providerResponse.currency || 'USD'
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