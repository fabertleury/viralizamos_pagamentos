import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { PaymentResponse } from '@/types/payment';

// Buscar solicitação de pagamento por token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token) {
    console.error('[API] Token não fornecido na requisição');
    return NextResponse.json(
      { error: 'Token não fornecido' },
      { status: 400 }
    );
  }

  try {
    console.log(`[API] Buscando detalhes do pedido com token: ${token}`);

    // Verificar a conexão com o banco de dados
    try {
      await db.$queryRaw`SELECT 1`;
      console.log('[API] Conexão com o banco de dados OK');
    } catch (dbError) {
      console.error('[API] Erro na conexão com o banco de dados:', dbError);
      return NextResponse.json(
        { error: 'Erro de conexão com o banco de dados' },
        { status: 500 }
      );
    }

    // Verificar se o token tem formato válido
    if (token.length < 8 || token.length > 64) {
      console.warn(`[API] Token com formato inválido: ${token}`);
    }

    console.log(`[API] Executando consulta para token: ${token}`);

    // Buscar o pedido pelo token
    const paymentRequest = await db.paymentRequest.findUnique({
      where: { token },
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
      console.log(`[API] Pedido com token ${token} não encontrado`);
      
      // Vamos verificar se há algum pedido no banco para diagnosticar problemas
      const totalPaymentRequests = await db.paymentRequest.count();
      console.log(`[API] Total de pedidos no banco: ${totalPaymentRequests}`);
      
      // Buscar alguns tokens para depuração
      if (totalPaymentRequests > 0) {
        const sampleRequests = await db.paymentRequest.findMany({
          select: { token: true },
          take: 5
        });
        console.log('[API] Exemplos de tokens existentes:', sampleRequests.map(r => r.token));
      }
      
      return NextResponse.json(
        { 
          error: 'Pedido não encontrado',
          details: 'O token fornecido não corresponde a nenhum pedido no sistema.'
        },
        { status: 404 }
      );
    }

    console.log(`[API] Pedido encontrado: ${paymentRequest.id}`);

    // Formatar a resposta
    const transaction = paymentRequest.transactions.length > 0 
      ? paymentRequest.transactions[0]
      : null;

    // Se o pedido estiver com pagamento aprovado, fazer uma verificação no provedor
    // apenas para obter o status atual, sem modificá-lo no banco de dados
    if (transaction && transaction.status === 'approved' && paymentRequest.status !== 'unpaid') {
      try {
        // Chamar a API de verificação de status, mas sem forçar atualização
        const response = await fetch(`${process.env.API_BASE_URL || ''}/api/orders/check-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: paymentRequest.id,
            forceUpdate: false // Não forçar atualização no banco
          }),
        });

        if (response.ok) {
          const statusData = await response.json();
          // Usar o status retornado apenas para exibição, não alteramos no banco
          if (statusData.success && statusData.order && statusData.order.status) {
            // Apenas logar a informação, mas não alterar o estado real no banco
            console.log(`[API] Status atual no provedor: ${statusData.order.status}, status no banco: ${paymentRequest.status}`);
          }
        }
      } catch (error) {
        console.error('[API] Erro ao verificar status atualizado:', error);
        // Não falhar o request principal se isso falhar
      }
    }

    // Processar additional_data para transformar o JSON em algo legível
    let formattedDescription = '';
    let formattedPosts = [];
    
    if (paymentRequest.additional_data) {
      try {
        // Tentar fazer parse do JSON
        const additionalData = JSON.parse(paymentRequest.additional_data);
        
        // Se temos posts, formatar de maneira amigável
        if (additionalData.posts && Array.isArray(additionalData.posts)) {
          formattedDescription = `${additionalData.posts.length} item(s):\n`;
          
          // Calcular o total de visualizações e distribuir igualmente
          let totalQuantity = 0;
          additionalData.posts.forEach((post: { quantity?: number }) => {
            totalQuantity += post.quantity || 0;
          });
          
          // Arredondar para inteiro
          const totalIntQuantity = Math.floor(totalQuantity);
          
          // Distribuir as visualizações entre os posts
          const itemCount = additionalData.posts.length;
          const baseQuantityPerItem = Math.floor(totalIntQuantity / itemCount);
          let remainingQuantity = totalIntQuantity - (baseQuantityPerItem * itemCount);
          
          // Preparar array formatado para display visual na UI
          formattedPosts = additionalData.posts.map((post: { 
            is_reel?: boolean; 
            quantity?: number; 
            code?: string; 
            post_code?: string;
            display_url?: string;
          }, index: number) => {
            const postType = post.is_reel ? 'Reel' : 'Post';
            const postCode = post.code || post.post_code || 'Sem código';
            
            // Distribuir a quantidade com o restante para os primeiros itens
            let quantity = baseQuantityPerItem;
            if (remainingQuantity > 0) {
              quantity += 1;
              remainingQuantity--;
            }
            
            // Construir URL da imagem do Instagram
            const imageUrl = post.display_url || 
              `https://instagram.com/p/${postCode}/media/?size=t`;
              
            // Linha de texto para display
            const textDescription = `${index + 1}. ${postType} do Instagram - ${quantity} ${postType === 'Reel' ? 'visualizações' : 'curtidas'}`;
            
            return {
              index: index + 1,
              type: postType,
              code: postCode,
              quantity: quantity,
              imageUrl: imageUrl,
              textDescription: textDescription
            };
          });
          
          // Manter compatibilidade com display de texto
          let remainingForText = remainingQuantity;
          additionalData.posts.forEach((post: { is_reel?: boolean; quantity?: number; code?: string; post_code?: string }, index: number) => {
            const postType = post.is_reel ? 'Reel' : 'Post';
            
            // Distribuir a quantidade com o restante para os primeiros itens
            let quantity = baseQuantityPerItem;
            if (remainingForText > 0) {
              quantity += 1;
              remainingForText--;
            }
            
            formattedDescription += `${index + 1}. ${postType} do Instagram - ${quantity} ${postType === 'Reel' ? 'visualizações' : 'curtidas'}\n`;
          });
        } else if (typeof additionalData === 'object') {
          // Se for um objeto mas não tiver posts, criar uma descrição formatada com chave: valor
          formattedDescription = Object.entries(additionalData)
            .map(([key, value]) => {
              // Ignorar propriedades vazias ou nulas
              if (value === null || value === undefined || value === '') return null;
              
              // Formatar chaves para exibição amigável
              const formattedKey = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
              
              // Tratar arrays e objetos
              let formattedValue = value;
              if (Array.isArray(value)) {
                formattedValue = value.join(', ');
              } else if (typeof value === 'object') {
                formattedValue = JSON.stringify(value, null, 2);
              }
              
              return `${formattedKey}: ${formattedValue}`;
            })
            .filter(Boolean) // Remover itens nulos
            .join('\n');
        } else {
          // Caso não seja um objeto, mostrar a versão string do valor
          formattedDescription = String(additionalData);
        }
      } catch (err) {
        // Se não for um JSON válido, usar como texto simples
        // Tentar detectar se é um código JSON bruto
        if (paymentRequest.additional_data.includes('{') && paymentRequest.additional_data.includes('}')) {
          formattedDescription = 'Os dados adicionais estão em formato JSON, mas não puderam ser processados corretamente.';
        } else {
          formattedDescription = paymentRequest.additional_data;
        }
      }
    }

    const formattedPaymentRequest = {
      id: paymentRequest.id,
      token: paymentRequest.token,
      status: paymentRequest.status,
      service_name: paymentRequest.service_name || 'Serviço não especificado',
      profile_username: paymentRequest.profile_username || '',
      amount: paymentRequest.amount,
      description: formattedDescription || '',
      formatted_posts: formattedPosts,
      created_at: paymentRequest.created_at,
      updated_at: paymentRequest.created_at,
      customer_name: paymentRequest.customer_name,
      customer_email: paymentRequest.customer_email,
      transaction: transaction ? {
        id: transaction.id,
        status: transaction.status,
        method: transaction.method,
        provider: transaction.provider,
        external_id: transaction.external_id || '',
        amount: transaction.amount,
        created_at: transaction.created_at,
        processed_at: transaction.processed_at
      } : null
    };

    return NextResponse.json({
      paymentRequest: formattedPaymentRequest
    });

  } catch (error) {
    console.error('[API] Erro ao buscar detalhes do pedido:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 