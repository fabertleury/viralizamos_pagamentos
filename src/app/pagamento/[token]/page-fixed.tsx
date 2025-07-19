'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
// Corrigindo o import para Heroicons v2
import { ClipboardIcon, CheckIcon, ClockIcon } from '@heroicons/react/24/outline';

// Tipo para dados do pagamento
interface PaymentRequest {
  id: string;
  token: string;
  amount: number;
  description: string;
  status: string;
  payer_name: string;
  payer_email: string;
  payer_phone?: string;
  expires_at?: string;
  created_at: string;
  return_url?: string;
  service_name?: string;
  service_id?: string;
  profile_username?: string;
  additional_data?: string;
  payment?: {
    id: string;
    status: string;
    method: string;
    pix_code?: string;
    pix_qrcode?: string;
    amount: number;
    pix_url?: string; // Added pix_url
  }
}

// Tipo para posts
interface Post {
  id: string;
  code?: string;
  shortcode?: string;
  image_url?: string;
  thumbnail_url?: string;
  display_url?: string;
  is_reel?: boolean;
  caption?: string;
  quantity?: number;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentCreating, setPaymentCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  
  // Estados para o timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  
  // Buscar dados da solicitação de pagamento
  const fetchPaymentRequest = async () => {
    try {
      const response = await fetch(`/api/payment-request/${token}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados do pagamento: ${response.status}`);
      }
      
      const data = await response.json();
      setPaymentRequest(data);
      
      // Extrair posts do additional_data se existir
      if (data.additional_data) {
        try {
          const additionalData = typeof data.additional_data === 'string' 
            ? JSON.parse(data.additional_data) 
            : data.additional_data;
          
          if (additionalData.posts && Array.isArray(additionalData.posts)) {
            setPosts(additionalData.posts);
          } else if (additionalData.additional_data && additionalData.additional_data.posts) {
            setPosts(additionalData.additional_data.posts);
          }
        } catch (err) {
          console.error('Erro ao processar additional_data:', err);
        }
      }
      
      // Configurar data de expiração e timer
      if (data.expires_at) {
        const expires = new Date(data.expires_at);
        setExpiryDate(expires);
        
        // Calcular tempo restante em segundos
        const now = new Date();
        const diff = Math.floor((expires.getTime() - now.getTime()) / 1000);
        setTimeLeft(diff > 0 ? diff : 0);
      } else {
        // Se não houver data de expiração, definir um prazo de 30 minutos a partir de agora
        const thirtyMinutesFromNow = new Date();
        thirtyMinutesFromNow.setMinutes(thirtyMinutesFromNow.getMinutes() + 30);
        setExpiryDate(thirtyMinutesFromNow);
        setTimeLeft(30 * 60); // 30 minutos em segundos
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar pagamento:', err);
      setError('Não foi possível carregar os dados do pagamento.');
      setLoading(false);
    }
  };
  
  // Manipulador para copiar o código PIX
  const handleCopyPix = useCallback(() => {
    if (paymentRequest?.payment?.pix_code) {
      navigator.clipboard.writeText(paymentRequest.payment.pix_code)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        })
        .catch(err => {
          console.error('Erro ao copiar código PIX:', err);
        });
    }
  }, [paymentRequest?.payment?.pix_code]);
  
  // Verificar o status do pagamento periodicamente
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!paymentRequest || paymentRequest.status === 'completed') return;
      
      try {
        const response = await fetch(`/api/payment-request/${token}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Atualizar o estado somente se o status mudar
          if (data.status !== paymentRequest.status) {
            setPaymentRequest(data);
            
            // Se o pagamento for aprovado, redirecionar após alguns segundos
            if (data.status === 'completed') {
              setTimeout(() => {
                if (paymentRequest.return_url) {
                  window.location.href = paymentRequest.return_url;
                }
              }, 5000);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao verificar status do pagamento:', err);
      }
    };
    
    // Verificar a cada 5 segundos
    const intervalId = setInterval(checkPaymentStatus, 5000);
    
    return () => clearInterval(intervalId);
  }, [paymentRequest, token, router]);
  
  // Timer de contagem regressiva
  useEffect(() => {
    if (timeLeft === null) return;
    
    const intervalId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [timeLeft]);
  
  // Formatar tempo restante
  const formatTimeLeft = () => {
    if (timeLeft === null) return '--:--';
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Calcular a porcentagem de tempo restante (para a barra de progresso)
  const calculateTimePercentage = () => {
    if (timeLeft === null) return 0;
    const totalTime = 30 * 60; // 30 minutos em segundos
    return (timeLeft / totalTime) * 100;
  };
  
  // Buscar dados do pagamento ao carregar
  useEffect(() => {
    fetchPaymentRequest();
  }, [token]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-800 to-indigo-900">
        <div className="p-8 max-w-md w-full bg-white rounded-xl shadow-lg flex flex-col items-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="mt-6 text-gray-700 font-medium">Carregando dados do pagamento...</p>
        </div>
      </div>
    );
  }
  
  if (error || !paymentRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-800 to-indigo-900">
        <div className="p-8 max-w-md w-full bg-white rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-700 mb-6">{error || 'Pagamento não encontrado'}</p>
          <Link href="/" className="inline-block px-6 py-3 text-white font-medium bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
            Voltar à página inicial
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-800 to-indigo-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-2 rounded-md">
              {/* Logo da empresa */}
              <div className="text-indigo-600 font-bold text-xl">Viralizamos</div>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-center">Pagamento</h1>
          <p className="text-center mt-2 text-white/90">
            {paymentRequest.status === 'completed' 
              ? 'Pagamento aprovado com sucesso!' 
              : 'Complete seu pagamento para confirmar seu pedido'}
          </p>
          
          {/* Timer de expiração */}
          {(paymentRequest.status === 'pending' || paymentRequest.status === 'processing') && (
            <div className="mt-4 max-w-sm mx-auto">
              <div className="flex items-center justify-center gap-2 text-white mb-2">
                <ClockIcon className="h-5 w-5" />
                <span className="font-medium">Tempo restante: {formatTimeLeft()}</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-green-500 h-2.5 rounded-full transition-all duration-1000 ease-linear" 
                  style={{ width: `${calculateTimePercentage()}%` }}
                ></div>
              </div>
              
              <p className="text-center text-sm text-white/80 mt-2">
                Este QR Code expira em 30 minutos
              </p>
            </div>
          )}
        </div>
        
        <div className="p-6">
          {/* Pagamento Aprovado */}
          {paymentRequest.status === 'completed' && (
            <div className="text-center py-10">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-3">Pagamento aprovado!</h2>
              <p className="text-gray-700 mb-6 text-lg">Obrigado pela sua compra.</p>
              {paymentRequest.payment?.method === 'pix' && (
                <p className="text-gray-600 mb-6">Recebemos seu pagamento via PIX.</p>
              )}
              <Link href={paymentRequest.return_url || "/"} className="inline-block px-6 py-3 text-white font-medium bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                Continuar
              </Link>
            </div>
          )}
          
          {/* Pagamento Expirado */}
          {paymentRequest.status === 'expired' && (
            <div className="text-center py-10">
              <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-yellow-600 mb-3">Pagamento expirado</h2>
              <p className="text-gray-600 mb-6">O tempo para realizar o pagamento expirou.</p>
              <button 
                onClick={fetchPaymentRequest}
                className="inline-block px-6 py-3 text-white font-medium bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          )}
          
          {/* Pagamento Cancelado ou Falhou */}
          {(paymentRequest.status === 'cancelled' || paymentRequest.status === 'failed') && (
            <div className="text-center py-10">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-3">
                {paymentRequest.status === 'cancelled' ? 'Pagamento cancelado' : 'Pagamento falhou'}
              </h2>
              <p className="text-gray-600 mb-6">Não foi possível processar o pagamento.</p>
              <button 
                onClick={fetchPaymentRequest}
                className="inline-block px-6 py-3 text-white font-medium bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          )}
          
          {/* Aguardando pagamento PIX */}
          {(paymentRequest.status === 'pending' || paymentRequest.status === 'processing') && paymentRequest.payment && paymentRequest.payment.method === 'pix' && (
            <div className="grid md:grid-cols-12 gap-8">
              {/* Coluna esquerda: Detalhes do pedido */}
              <div className="md:col-span-5 order-2 md:order-1">
                <div className="bg-gray-50 rounded-xl p-5 h-full">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Detalhes do Pedido</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Serviço</p>
                      <p className="font-medium text-gray-800">{paymentRequest.service_name || 'Serviço Viralizamos'}</p>
                    </div>
                    
                    {/* Posts selecionados */}
                    {posts && posts.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Posts selecionados</p>
                        <div className="space-y-3">
                          {posts.map((post, index) => (
                            <div key={post.id || index} className="flex items-center bg-white p-2 rounded-lg border border-gray-200">
                              {/* Thumbnail */}
                              <div className="w-16 h-16 flex-shrink-0 mr-3 bg-gray-100 rounded overflow-hidden">
                                {(post.image_url || post.thumbnail_url || post.display_url) ? (
                                  <img 
                                    src={post.image_url || post.thumbnail_url || post.display_url} 
                                    alt="Post thumbnail" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = "https://placehold.co/64x64/e5e7eb/a3a3a3?text=Post";
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                    {post.is_reel ? 'Reel' : 'Post'}
                                  </div>
                                )}
                              </div>
                              
                              {/* Detalhes do post */}
                              <div className="flex-grow min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">
                                  {post.caption ? post.caption.substring(0, 50) + (post.caption.length > 50 ? '...' : '') : 
                                    post.is_reel ? 'Instagram Reel' : 'Instagram Post'}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <a 
                                    href={post.code ? `https://instagram.com/p/${post.code}` : 
                                          post.shortcode ? `https://instagram.com/p/${post.shortcode}` : 
                                          '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-indigo-600 hover:underline truncate"
                                  >
                                    @{paymentRequest.profile_username || 'instagram'}
                                  </a>
                                  {post.quantity && post.quantity > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                      {post.quantity} {post.quantity === 1 ? 'unidade' : 'unidades'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-gray-500">Cliente</p>
                      <p className="font-medium text-gray-800">{paymentRequest.payer_name}</p>
                      <p className="text-sm text-gray-700">{paymentRequest.payer_email}</p>
                      {paymentRequest.payer_phone && <p className="text-sm text-gray-700">{paymentRequest.payer_phone}</p>}
                    </div>
                    
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>R$ {paymentRequest.amount.toFixed(2).replace('.', ',')}</span>
                      </div>
                      
                      <div className="flex justify-between font-bold mt-2 text-lg text-gray-800">
                        <span>Total</span>
                        <span>R$ {paymentRequest.amount.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Coluna direita: QR Code PIX */}
              <div className="md:col-span-7 order-1 md:order-2">
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-md">
                  <h3 className="text-lg font-semibold mb-4 text-indigo-700">Pague com PIX</h3>
                  
                  {/* Verificar se está criando pagamento */}
                  {paymentCreating ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                      <p className="mt-4 text-gray-600">Gerando código PIX...</p>
                    </div>
                  ) : (
                    <>
                      {/* QR Code PIX */}
                      <div className="mb-6 flex flex-col items-center">
                        {paymentRequest.payment.pix_qrcode ? (
                          <img 
                            src={paymentRequest.payment.pix_qrcode.startsWith('data:') 
                  ? paymentRequest.payment.pix_qrcode 
                  : `data:image/png;base64,${paymentRequest.payment.pix_qrcode}`} 
                            alt="QR Code PIX" 
                            className="w-48 h-48 border p-2 rounded-lg mb-2"
                          />
                        ) : paymentRequest.payment.pix_code ? (
                          <div className="p-3 bg-white border border-gray-300 rounded-lg">
                            <QRCodeSVG 
                              value={paymentRequest.payment.pix_code} 
                              size={200}
                              includeMargin
                              bgColor="#FFFFFF"
                              fgColor="#000000"
                              level="M"
                            />
                          </div>
                        ) : (
                          <p className="text-gray-600">QR Code não disponível</p>
                        )}
                        
                        <p className="text-sm text-gray-500 mt-2">Escaneie o QR Code com o app do seu banco</p>
                      </div>
                      
                      {/* Código PIX */}
                      {paymentRequest.payment.pix_code && (
                        <div className="mb-6">
                          <p className="text-sm text-gray-600 mb-2">Ou use o código PIX copia e cola:</p>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-300 mb-2 text-left break-all relative">
                            <p className="pr-8 text-sm text-gray-800 font-mono">{paymentRequest.payment.pix_code}</p>
                          </div>
                          
                          <button
                            onClick={handleCopyPix}
                            className={`w-full flex items-center justify-center py-3 px-4 rounded-lg font-medium ${
                              copied 
                                ? 'bg-green-100 text-green-700 border border-green-300' 
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-300 hover:bg-indigo-100'
                            } transition-colors`}
                          >
                            {copied ? (
                              <>
                                <CheckIcon className="h-5 w-5 mr-2" />
                                Código copiado!
                              </>
                            ) : (
                              <>
                                <ClipboardIcon className="h-5 w-5 mr-2" />
                                Copiar código PIX
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      
                      <div className="space-y-3 text-left bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-700 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                          </svg>
                          Instruções para pagamento
                        </h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 pl-1">
                          <li>Abra o aplicativo do seu banco</li>
                          <li>Escolha pagar com PIX</li>
                          <li>Escaneie o QR code ou cole o código</li>
                          <li>Confirme as informações e finalize o pagamento</li>
                        </ol>
                        <p className="text-sm text-blue-700">Após o pagamento, esta página será atualizada automaticamente.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Aguardando geração do pagamento */}
          {(paymentRequest.status === 'pending' || paymentRequest.status === 'processing') && !paymentRequest.payment && (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-indigo-500 mx-auto mb-6"></div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Preparando seu pagamento</h2>
              <p className="text-gray-600 mb-6">Estamos gerando as opções de pagamento, aguarde um momento...</p>
            </div>
          )}
        </div>
        
        {/* Rodapé */}
        <div className="p-4 text-center text-gray-500 text-xs border-t">
          <p>Processado por Viralizamos Pagamentos</p>
          <p className="mt-1">© {new Date().getFullYear()} Viralizamos</p>
        </div>
      </div>
    </div>
  );
} 