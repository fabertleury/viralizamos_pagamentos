import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { blockedEmails, isEmailBlocked } from './lib/blocked-emails';

// Definir uma lista de origens permitidas
const allowedOrigins = [
  'https://viralizamos.com',
  'https://www.viralizamos.com',
  'https://admin.viralizamos.com',
  'https://orders.viralizamos.com',
  'https://painel.viralizamos.com',
  'https://pagamentos.viralizamos.com',
  'https://dev.viralizamos.com',
  'http://dev.viralizamos.com',
  'https://checkout.viralizamos.com',
  'http://localhost:3000',
  'http://localhost:3001'
];

export async function middleware(request: NextRequest) {
  // Extrair a origem da requisição
  const origin = request.headers.get('origin') || '';
  const requestMethod = request.method;
  
  // Verificar se a rota é uma API (todas as APIs começam com /api/)
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  
  // Verificar se é uma rota de pagamento
  const isPaymentRoute = 
    request.nextUrl.pathname.startsWith('/api/payment-request') ||
    request.nextUrl.pathname.startsWith('/api/payment-requests');
  
  // Verificar se é uma requisição POST para pagamento
  if (isPaymentRoute && requestMethod === 'POST') {
    try {
      // Clonar a requisição para poder ler o corpo
      const clonedRequest = request.clone();
      const body = await clonedRequest.json();
      
      // Extrair o email do corpo da requisição
      const email = body.customer_email || body.email;
      
      // Se o email estiver bloqueado, retornar erro 403
      if (email && isEmailBlocked(email)) {
        console.log(`[BLOQUEIO] Tentativa de pagamento bloqueada para email: ${email}`);
        
        return NextResponse.json(
          {
            error: 'Email bloqueado',
            message: 'Este email está impedido de realizar compras no sistema.',
            code: 'EMAIL_BLOCKED'
          },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('[BLOQUEIO] Erro ao processar requisição:', error);
      // Em caso de erro, permitir a requisição continuar
    }
  }
  
  // Opções de resposta padrão para CORS
  const responseHeaders = new Headers(request.headers);
  
  // Se a rota for uma API, aplicar CORS
  if (isApiRoute) {
    // Verificar se a origem está na lista de permitidas
    const isAllowedOrigin = allowedOrigins.includes(origin);
    
    // Configurar cabeçalhos CORS
    if (isAllowedOrigin) {
      responseHeaders.set('Access-Control-Allow-Origin', origin);
    } else {
      // Permitir origens não listadas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        responseHeaders.set('Access-Control-Allow-Origin', origin);
      } else {
        // Em produção, usar a lista de origens permitidas
        responseHeaders.set('Access-Control-Allow-Origin', allowedOrigins[0]);
      }
    }
    
    // Configurações CORS adicionais
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Payment-Source');
    
    // Responder à solicitação OPTIONS (pre-flight)
    if (requestMethod === 'OPTIONS') {
      return NextResponse.json({}, { headers: responseHeaders, status: 200 });
    }
  }
  
  // Continuar com a requisição normal com os cabeçalhos CORS configurados
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    }
  });
  
  // Aplicar os cabeçalhos CORS à resposta
  if (isApiRoute) {
    Object.entries(Object.fromEntries(responseHeaders.entries())).forEach(([key, value]) => {
      if (key.toLowerCase().startsWith('access-control-')) {
        response.headers.set(key, value);
      }
    });
  }
  
  return response;
}

// Configurar em quais caminhos o middleware deve ser executado
export const config = {
  matcher: [
    // Aplicar a todas as rotas da API e da página
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 