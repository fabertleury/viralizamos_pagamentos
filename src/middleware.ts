import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lista de origens permitidas
const allowedOrigins = [
  'https://viralizamos.com',
  'https://www.viralizamos.com',
  'https://dev.viralizamos.com',
  'https://homolog.viralizamos.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://pagamentos.viralizamos.com',
  'https://pagamentos.dev.viralizamos.com',
  'https://orders.viralizamos.com',
];

export function middleware(request: NextRequest) {
  // Obter a origem da requisição
  const origin = request.headers.get('origin') || '';
  const requestMethod = request.method;
  const path = request.nextUrl.pathname;
  
  // Processar somente requisições para a API
  if (path.startsWith('/api/')) {
    // Verificar se é uma requisição OPTIONS (preflight)
    if (requestMethod === 'OPTIONS') {
      // Para requisições preflight, verificamos se a origem é permitida
      const isAllowed = allowedOrigins.includes(origin) || origin === '';
      
      // Retornar resposta apropriada para preflight
      return NextResponse.json(
        {},
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Payment-Source',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400', // 24 horas
          },
        }
      );
    }
    
    // Para requisições não-preflight, apenas modificamos a resposta para incluir os cabeçalhos CORS
    const response = NextResponse.next();
    
    // Verificar se a origem é permitida
    const isAllowed = allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development';
    
    // Adicionar cabeçalhos CORS
    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else {
      // Em ambiente de produção, você pode querer restringir mais
      response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
    
    return response;
  }
  
  // Para requisições não-API, apenas prosseguir normalmente
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Aplicar middleware para todas as rotas da API
    '/api/:path*',
  ],
}; 