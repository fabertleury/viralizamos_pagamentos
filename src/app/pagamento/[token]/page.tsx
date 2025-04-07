'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

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

interface PaymentRequest {
  id: string;
  token: string;
  amount: number;
  status: string;
  service_name?: string;
  service_id?: string;
  payer_name: string;
  payer_email: string;
  payer_phone?: string;
  created_at: string;
  expires_at?: string;
  profile_username?: string;
  additional_data?: string;
  payment?: {
    method: string;
    pix_code?: string;
    pix_qrcode?: string;
  }
}

export default function PaymentPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  
  // Estados para o timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  
  // Buscar dados da solicitação de pagamento
  const fetchPaymentRequest = async () => {
    try {
      const response = await fetch(`/api/payment-requests/${token}`);
      
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
  
  // Copiar código PIX
  const copyPix = () => {
    if (paymentRequest?.payment?.pix_code) {
      navigator.clipboard.writeText(paymentRequest.payment.pix_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };
  
  // Verificar o status do pagamento periodicamente
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!paymentRequest || paymentRequest.status === 'completed') return;
      
      try {
        const response = await fetch(`/api/payment-requests/${token}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Atualizar o estado somente se o status mudar
          if (data.status !== paymentRequest.status) {
            setPaymentRequest(data);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar status do pagamento:', err);
      }
    };
    
    // Verificar a cada 5 segundos
    const intervalId = setInterval(checkPaymentStatus, 5000);
    
    return () => clearInterval(intervalId);
  }, [paymentRequest, token]);
  
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
  
  // Buscar dados iniciais
  useEffect(() => {
    fetchPaymentRequest();
  }, [token]);
  
  if (loading) {
    return (
      <div className="container d-flex align-items-center justify-content-center vh-100">
        <div className="card p-4 text-center shadow-custom">
          <div className="spinner-border text-primary mx-auto mb-3" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="text-dark">Carregando dados do pagamento...</p>
        </div>
      </div>
    );
  }
  
  if (error || !paymentRequest) {
    return (
      <div className="container d-flex align-items-center justify-content-center vh-100">
        <div className="card p-4 text-center shadow-custom">
          <h2 className="text-danger mb-3">Erro</h2>
          <p className="text-dark mb-4">{error || 'Pagamento não encontrado'}</p>
          <a href="/" className="btn btn-primary">Voltar à página inicial</a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-vh-100 bg-light py-4">
      {/* Cabeçalho com logo */}
      <header className="container mb-4">
        <div className="text-center mb-4">
          <div className="d-inline-block bg-white p-3 rounded-custom shadow-custom">
            <h1 className="h4 m-0 text-pink">Viralizamos</h1>
          </div>
        </div>
      </header>
      
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="card shadow-custom overflow-hidden">
              {/* Cabeçalho */}
              <div className="card-header bg-gradient-pink p-4 text-white">
                <h2 className="h3 mb-2 text-center">Pagamento</h2>
                <p className="mb-0 text-center">
                  {paymentRequest.status === 'completed' 
                    ? 'Pagamento aprovado com sucesso!' 
                    : 'Complete seu pagamento para confirmar seu pedido'}
                </p>
                
                {/* Timer de expiração */}
                {(paymentRequest.status === 'pending' || paymentRequest.status === 'processing') && (
                  <div className="mt-3">
                    <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-clock" viewBox="0 0 16 16">
                        <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                      </svg>
                      <span className="fw-medium">Tempo restante: {formatTimeLeft()}</span>
                    </div>
                    
                    <div className="progress" style={{ height: '4px' }}>
                      <div className="timer-bar w-100"></div>
                    </div>
                    
                    <p className="text-center small mt-2 text-white-50">
                      Este QR Code expira em 30 minutos
                    </p>
                  </div>
                )}
              </div>
              
              <div className="card-body p-0">
                {/* Pagamento Aprovado */}
                {paymentRequest.status === 'completed' && (
                  <div className="text-center p-5">
                    <div className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 p-4 rounded-circle mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-check-lg text-success" viewBox="0 0 16 16">
                        <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
                      </svg>
                    </div>
                    <h2 className="h4 text-success mb-3">Pagamento aprovado!</h2>
                    <p className="text-dark mb-4">Obrigado pela sua compra.</p>
                    <a href="/" className="btn btn-primary px-4 py-2">Continuar</a>
                  </div>
                )}
                
                {/* Pagamento Pendente ou Processando com PIX */}
                {(paymentRequest.status === 'pending' || paymentRequest.status === 'processing') && paymentRequest.payment && paymentRequest.payment.method === 'pix' && (
                  <div className="row g-0">
                    {/* Coluna esquerda: Detalhes do pedido */}
                    <div className="col-md-5 order-2 order-md-1">
                      <div className="p-4 h-100 d-flex flex-column">
                        <h3 className="h5 mb-4 pb-2 border-bottom">Detalhes do Pedido</h3>
                        
                        {/* Serviço */}
                        <div className="mb-4">
                          <p className="small text-muted mb-1">Serviço</p>
                          <p className="fw-medium text-dark">{paymentRequest.service_name || 'Serviço Viralizamos'}</p>
                        </div>
                        
                        {/* Posts selecionados */}
                        {posts && posts.length > 0 && (
                          <div className="mb-4">
                            <p className="small text-muted mb-2">Posts selecionados</p>
                            <div className="d-flex flex-column gap-2">
                              {posts.map((post, index) => (
                                <div key={post.id || index} className="d-flex bg-white p-2 rounded border">
                                  {/* Thumbnail */}
                                  <div className="flex-shrink-0 me-3" style={{ width: '64px', height: '64px' }}>
                                    {(post.image_url || post.thumbnail_url || post.display_url) ? (
                                      <img 
                                        src={post.image_url || post.thumbnail_url || post.display_url} 
                                        alt="Post thumbnail" 
                                        className="img-fluid rounded"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = "https://placehold.co/64x64/e5e7eb/a3a3a3?text=Post";
                                        }}
                                      />
                                    ) : (
                                      <div className="d-flex align-items-center justify-content-center bg-light text-muted rounded" style={{ width: '100%', height: '100%' }}>
                                        {post.is_reel ? 'Reel' : 'Post'}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Detalhes do post */}
                                  <div className="overflow-hidden">
                                    <p className="small fw-medium text-truncate mb-1">
                                      {post.caption ? post.caption.substring(0, 50) + (post.caption.length > 50 ? '...' : '') : 
                                        post.is_reel ? 'Instagram Reel' : 'Instagram Post'}
                                    </p>
                                    <div className="d-flex justify-content-between align-items-center">
                                      <a 
                                        href={post.code ? `https://instagram.com/p/${post.code}` : 
                                              post.shortcode ? `https://instagram.com/p/${post.shortcode}` : 
                                              '#'} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="small text-primary text-decoration-none text-truncate"
                                      >
                                        @{paymentRequest.profile_username || 'instagram'}
                                      </a>
                                      {post.quantity && post.quantity > 0 && (
                                        <span className="badge bg-primary bg-opacity-10 text-primary small">
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
                        
                        {/* Cliente */}
                        <div className="mb-4">
                          <p className="small text-muted mb-1">Cliente</p>
                          <p className="fw-medium text-dark mb-1">{paymentRequest.payer_name}</p>
                          <p className="small text-dark mb-1">{paymentRequest.payer_email}</p>
                          {paymentRequest.payer_phone && <p className="small text-dark mb-0">{paymentRequest.payer_phone}</p>}
                        </div>
                        
                        {/* Valores */}
                        <div className="mt-auto pt-3 border-top">
                          <div className="d-flex justify-content-between mb-2">
                            <span className="text-dark">Subtotal</span>
                            <span className="text-dark">R$ {paymentRequest.amount.toFixed(2).replace('.', ',')}</span>
                          </div>
                          <div className="d-flex justify-content-between fw-bold">
                            <span>Total</span>
                            <span>R$ {paymentRequest.amount.toFixed(2).replace('.', ',')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Coluna direita: QR Code PIX */}
                    <div className="col-md-7 order-1 order-md-2 border-start border-md-start-0 border-bottom border-md-bottom-0">
                      <div className="p-4 text-center">
                        <h3 className="h5 text-primary mb-4">Pague com PIX</h3>
                        
                        {/* QR Code PIX */}
                        <div className="mb-4">
                          {paymentRequest.payment.pix_qrcode ? (
                            <div className="d-inline-block p-2 border rounded bg-white mb-2">
                              <img 
                                src={`data:image/png;base64,${paymentRequest.payment.pix_qrcode}`} 
                                alt="QR Code PIX" 
                                className="img-fluid"
                                style={{ maxWidth: '200px' }}
                              />
                            </div>
                          ) : (
                            <div className="d-inline-flex align-items-center justify-content-center border rounded bg-light mx-auto mb-2" style={{ width: '200px', height: '200px' }}>
                              <p className="text-muted mb-0">QR Code não disponível</p>
                            </div>
                          )}
                          <p className="small text-muted mt-2">Escaneie o QR Code com o app do seu banco</p>
                        </div>
                        
                        {/* Código PIX */}
                        {paymentRequest.payment.pix_code && (
                          <div className="mb-4">
                            <p className="small text-muted mb-2">Ou use o código PIX copia e cola:</p>
                            <div className="bg-light border rounded p-3 mb-2 text-start">
                              <p className="small mb-0 overflow-auto font-monospace" style={{ maxHeight: '80px' }}>
                                {paymentRequest.payment.pix_code}
                              </p>
                            </div>
                            <button 
                              onClick={copyPix}
                              className={`btn ${copied ? 'btn-success' : 'btn-outline-primary'} w-100 d-flex align-items-center justify-content-center gap-2`}
                            >
                              {copied ? (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-check-lg" viewBox="0 0 16 16">
                                    <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
                                  </svg>
                                  Código copiado!
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-clipboard" viewBox="0 0 16 16">
                                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                  </svg>
                                  Copiar código PIX
                                </>
                              )}
                            </button>
                          </div>
                        )}
                        
                        {/* Instruções */}
                        <div className="bg-primary bg-opacity-10 p-3 rounded text-start border border-primary border-opacity-25">
                          <h4 className="h6 text-primary d-flex align-items-center gap-2 mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-info-circle-fill" viewBox="0 0 16 16">
                              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                            </svg>
                            Instruções para pagamento
                          </h4>
                          <ol className="list-unstyled ps-1 small text-dark">
                            <li className="mb-1 d-flex align-items-start gap-2">
                              <span className="badge bg-primary rounded-pill">1</span>
                              Abra o aplicativo do seu banco
                            </li>
                            <li className="mb-1 d-flex align-items-start gap-2">
                              <span className="badge bg-primary rounded-pill">2</span>
                              Escolha pagar com PIX
                            </li>
                            <li className="mb-1 d-flex align-items-start gap-2">
                              <span className="badge bg-primary rounded-pill">3</span>
                              Escaneie o QR code ou cole o código
                            </li>
                            <li className="d-flex align-items-start gap-2">
                              <span className="badge bg-primary rounded-pill">4</span>
                              Confirme as informações e finalize o pagamento
                            </li>
                          </ol>
                          <p className="small text-primary mt-3 mb-0">Após o pagamento, esta página será atualizada automaticamente.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Rodapé */}
              <div className="card-footer text-center p-3">
                <small className="text-muted">
                  Processado por Viralizamos Pagamentos<br/>
                  © {new Date().getFullYear()} Viralizamos
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 