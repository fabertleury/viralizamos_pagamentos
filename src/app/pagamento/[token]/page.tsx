'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

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
  payment?: {
    id: string;
    status: string;
    method: string;
    pix_code?: string;
    pix_qrcode?: string;
    amount: number;
  }
}

export default function PaymentPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentCreating, setPaymentCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Buscar dados da solicitação de pagamento
  const fetchPaymentRequest = async () => {
    try {
      const response = await fetch(`/api/payment-requests/${token}`);
      
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
  
  // Criar um pagamento PIX
  const createPixPayment = async () => {
    if (!paymentRequest) return;
    
    setPaymentCreating(true);
    
    try {
      const response = await fetch('/api/payments/pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_request_id: paymentRequest.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Falha ao criar o pagamento PIX');
      }
      
      const data = await response.json();
      
      // Atualizar os dados com o novo pagamento
      setPaymentRequest(prev => {
        if (!prev) return null;
        return {
          ...prev,
          payment: data
        };
      });
      
    } catch (err) {
      console.error('Erro ao criar pagamento PIX:', err);
      setError('Não foi possível criar o pagamento PIX. Tente novamente.');
    } finally {
      setPaymentCreating(false);
    }
  };
  
  // Copiar código PIX para a área de transferência
  const copyPixCode = () => {
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
  
  // Verificar status periodicamente
  useEffect(() => {
    if (!paymentRequest) return;
    
    // Se o pagamento já foi aprovado, não precisa verificar
    if (paymentRequest.status === 'completed') return;
    
    const interval = setInterval(fetchPaymentRequest, 5000);
    
    return () => clearInterval(interval);
  }, [paymentRequest]);
  
  // Criar o pagamento PIX se necessário (quando carregou e não tem pagamento)
  useEffect(() => {
    if (paymentRequest && !paymentRequest.payment && !paymentCreating && paymentRequest.status === 'pending') {
      createPixPayment();
    }
  }, [paymentRequest]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600">
        <div className="p-8 max-w-md w-full bg-white rounded-xl shadow-lg flex flex-col items-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-6 text-gray-700 font-medium">Carregando dados do pagamento...</p>
        </div>
      </div>
    );
  }
  
  if (error || !paymentRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600">
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
    <div className="min-h-screen bg-gradient-to-r from-purple-600 to-indigo-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-2 rounded-md">
              {/* Logo da empresa (será substituído por uma imagem real) */}
              <div className="text-indigo-600 font-bold text-xl">Viralizamos</div>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-center">Pagamento</h1>
          <p className="text-center mt-2 text-white/90">
            {paymentRequest.status === 'completed' 
              ? 'Pagamento aprovado com sucesso!' 
              : 'Complete seu pagamento para confirmar seu pedido'}
          </p>
        </div>
        
        {/* Conteúdo principal */}
        <div className="p-6 md:p-8">
          {/* Pagamento Aprovado */}
          {paymentRequest.status === 'completed' && (
            <div className="text-center py-10">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-3">Pagamento aprovado!</h2>
              <p className="text-gray-600 mb-6 text-lg">Obrigado pela sua compra.</p>
              {paymentRequest.payment?.method === 'pix' && (
                <p className="text-gray-600 mb-6">Recebemos seu pagamento via PIX.</p>
              )}
              <Link href="/" className="inline-block px-6 py-3 text-white font-medium bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                Voltar à página inicial
              </Link>
            </div>
          )}
          
          {/* Pagamento Expirado, Cancelado ou Falhou */}
          {(paymentRequest.status === 'expired' || paymentRequest.status === 'cancelled' || paymentRequest.status === 'failed') && (
            <div className="text-center py-10">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-3">
                {paymentRequest.status === 'expired' ? 'Pagamento expirado!' : 
                 paymentRequest.status === 'cancelled' ? 'Pagamento cancelado!' : 
                 'Pagamento falhou!'}
              </h2>
              <p className="text-gray-600 mb-6">
                {paymentRequest.status === 'expired' ? 'O tempo para realizar este pagamento expirou.' : 
                 paymentRequest.status === 'cancelled' ? 'Este pagamento foi cancelado.' : 
                 'Houve um problema ao processar este pagamento.'}
              </p>
              <Link href="/" className="inline-block px-6 py-3 text-white font-medium bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                Voltar à página inicial
              </Link>
            </div>
          )}
          
          {/* Pagamento Pendente ou Processando com PIX */}
          {(paymentRequest.status === 'pending' || paymentRequest.status === 'processing') && paymentRequest.payment && paymentRequest.payment.method === 'pix' && (
            <div className="grid md:grid-cols-12 gap-8">
              {/* Coluna esquerda: Detalhes do pedido */}
              <div className="md:col-span-5 order-2 md:order-1">
                <div className="bg-gray-50 rounded-xl p-5 h-full">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Detalhes do Pedido</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Descrição</p>
                      <p className="font-medium">{paymentRequest.description}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Cliente</p>
                      <p className="font-medium">{paymentRequest.payer_name}</p>
                      <p className="text-sm">{paymentRequest.payer_email}</p>
                      {paymentRequest.payer_phone && <p className="text-sm">{paymentRequest.payer_phone}</p>}
                    </div>
                    
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between text-gray-500">
                        <span>Subtotal</span>
                        <span>R$ {paymentRequest.amount.toFixed(2).replace('.', ',')}</span>
                      </div>
                      
                      <div className="flex justify-between font-bold mt-2 text-lg">
                        <span>Total</span>
                        <span>R$ {paymentRequest.amount.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Coluna direita: QR Code PIX */}
              <div className="md:col-span-7 order-1 md:order-2">
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                  <h3 className="text-lg font-semibold mb-4">Pague com PIX</h3>
                  
                  {/* Verificar se está criando pagamento */}
                  {paymentCreating ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                      <p className="mt-4 text-gray-600">Gerando código PIX...</p>
                    </div>
                  ) : (
                    <>
                      {/* QR Code PIX */}
                      <div className="mb-6">
                        {paymentRequest.payment.pix_qrcode ? (
                          <div className="flex justify-center">
                            <img
                              src={paymentRequest.payment.pix_qrcode}
                              alt="QR Code PIX"
                              className="w-48 h-48 object-contain"
                            />
                          </div>
                        ) : paymentRequest.payment.pix_code ? (
                          <div className="flex justify-center">
                            <QRCodeSVG
                              value={paymentRequest.payment.pix_code}
                              size={192}
                              bgColor={"#ffffff"}
                              fgColor={"#000000"}
                              level={"L"}
                              includeMargin={false}
                            />
                          </div>
                        ) : (
                          <div className="bg-gray-100 w-48 h-48 mx-auto flex items-center justify-center rounded">
                            <p className="text-gray-500">QR Code não disponível</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Código PIX */}
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Ou use o código PIX copia e cola:</p>
                        <div className="relative">
                          <div className="bg-gray-50 border border-gray-200 rounded py-3 px-4 text-gray-700 text-sm overflow-hidden break-all mb-2">
                            {paymentRequest.payment.pix_code || 'Código PIX não disponível'}
                          </div>
                          <button
                            onClick={copyPixCode}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-md hover:from-indigo-700 hover:to-purple-700 transition duration-300"
                            disabled={!paymentRequest.payment.pix_code}
                          >
                            {copied ? 'Copiado!' : 'Copiar código PIX'}
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-6 bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                        <p>Após o pagamento, esta tela será atualizada automaticamente.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Pagamento Pendente sem PIX ainda */}
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