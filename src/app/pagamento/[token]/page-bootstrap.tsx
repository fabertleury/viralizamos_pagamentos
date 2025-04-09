'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface PaymentRequest {
  id: string;
  token: string;
  amount: number;
  status: string;
  payer_name: string;
  payer_email: string;
  created_at: string;
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
  
  // Buscar dados da solicitação de pagamento
  const fetchPaymentRequest = async () => {
    try {
      const response = await fetch(`/api/payment-request/${token}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados do pagamento: ${response.status}`);
      }
      
      const data = await response.json();
      setPaymentRequest(data);
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
  
  // Buscar dados iniciais
  useEffect(() => {
    fetchPaymentRequest();
  }, [token]);
  
  if (loading) {
    return (
      <div className="container d-flex align-items-center justify-content-center vh-100">
        <div className="card p-4 text-center">
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
        <div className="card p-4 text-center">
          <h2 className="text-danger mb-3">Erro</h2>
          <p className="text-dark mb-4">{error || 'Pagamento não encontrado'}</p>
          <a href="/" className="btn btn-primary">Voltar à página inicial</a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
            {/* Cabeçalho */}
            <div className="card-header bg-primary text-white text-center py-4">
              <h1 className="h3 mb-0">Pagamento</h1>
              <p className="mb-0">
                {paymentRequest.status === 'completed' 
                  ? 'Pagamento aprovado com sucesso!' 
                  : 'Complete seu pagamento para confirmar seu pedido'}
              </p>
            </div>
            
            <div className="card-body p-4">
              {/* Pagamento Aprovado */}
              {paymentRequest.status === 'completed' && (
                <div className="text-center py-4">
                  <div className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 p-3 rounded-circle mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-check-lg text-success" viewBox="0 0 16 16">
                      <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
                    </svg>
                  </div>
                  <h2 className="h4 text-success mb-3">Pagamento aprovado!</h2>
                  <p className="text-dark mb-4">Obrigado pela sua compra.</p>
                  <a href="/" className="btn btn-primary">Continuar</a>
                </div>
              )}
              
              {/* Pagamento Pendente ou Processando com PIX */}
              {(paymentRequest.status === 'pending' || paymentRequest.status === 'processing') && paymentRequest.payment && paymentRequest.payment.method === 'pix' && (
                <div className="row">
                  {/* Coluna esquerda: QR Code PIX */}
                  <div className="col-md-7 mb-4 mb-md-0 order-md-1 order-2">
                    <div className="card h-100">
                      <div className="card-body text-center">
                        <h3 className="h5 text-primary mb-4">Pague com PIX</h3>
                        
                        {/* QR Code PIX */}
                        <div className="mb-4">
                          {paymentRequest.payment.pix_qrcode ? (
                            <img 
                              src={`data:image/png;base64,${paymentRequest.payment.pix_qrcode}`} 
                              alt="QR Code PIX" 
                              className="img-fluid border p-2 rounded"
                              style={{ maxWidth: '200px' }}
                            />
                          ) : (
                            <div className="border rounded p-3 bg-light mx-auto" style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <p className="text-muted mb-0">QR Code não disponível</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Código PIX */}
                        {paymentRequest.payment.pix_code && (
                          <div className="mb-4">
                            <p className="text-dark small mb-2">Ou use o código PIX copia e cola:</p>
                            <div className="bg-light border rounded p-3 mb-2 text-start">
                              <p className="text-dark small mb-0 overflow-auto" style={{ maxHeight: '80px' }}>
                                {paymentRequest.payment.pix_code}
                              </p>
                            </div>
                            <button 
                              onClick={copyPix}
                              className={`btn btn-${copied ? 'success' : 'outline-primary'} w-100`}
                            >
                              {copied ? 'Código copiado!' : 'Copiar código PIX'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Coluna direita: Detalhes do pedido */}
                  <div className="col-md-5 order-md-2 order-1">
                    <div className="card h-100 bg-light">
                      <div className="card-body">
                        <h3 className="h5 mb-3">Detalhes do Pedido</h3>
                        
                        <div className="mb-4">
                          <p className="small text-muted mb-1">Cliente</p>
                          <p className="fw-medium text-dark mb-1">{paymentRequest.payer_name}</p>
                          <p className="small text-dark mb-0">{paymentRequest.payer_email}</p>
                        </div>
                        
                        <hr className="my-3" />
                        
                        <div className="d-flex justify-content-between text-dark mb-2">
                          <span>Subtotal</span>
                          <span>R$ {paymentRequest.amount.toFixed(2).replace('.', ',')}</span>
                        </div>
                        
                        <div className="d-flex justify-content-between fw-bold mb-0">
                          <span>Total</span>
                          <span>R$ {paymentRequest.amount.toFixed(2).replace('.', ',')}</span>
                        </div>
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
  );
} 