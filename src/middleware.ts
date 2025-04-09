import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Definir uma lista de origens permitidas
const allowedOrigins = [
  'https://viralizamos.com',
  'https://www.viralizamos.com',
  'https://admin.viralizamos.com',
  'http://localhost:3000',
  'http://localhost:3001'
];

export function middleware(request: NextRequest) {
  // Extrair a origem da requisição
  const origin = request.headers.get('origin') || '';
  const requestMethod = request.method;
  
  // Verificar se a rota é uma API (todas as APIs começam com /api/)
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  
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
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
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