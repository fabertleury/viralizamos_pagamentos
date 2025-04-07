"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';

// Definir interfaces para os tipos de dados
interface PaymentRequest {
  id: string;
  token: string;
  status: string;
  created_at: string;
  amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  instagram_username: string;
  posts: Post[];
  service_name: string;
  qr_code_image: string;
  pix_code: string;
  pix_key: string;
  expires_at: string;
}

interface Post {
  id: string;
  url: string;
  media_type: string;
  thumbnail_url?: string;
  caption?: string;
  quantity: number;
}

export default function PaymentPage({ params }: { params: { token: string } }) {
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [formattedTime, setFormattedTime] = useState<string>('30:00');
  const [showCopyFeedback, setShowCopyFeedback] = useState<boolean>(false);
  
  // Formatar o tempo restante
  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Copiar código PIX para área de transferência
  const copyPixCode = async () => {
    if (!payment?.pix_code) return;
    
    try {
      await navigator.clipboard.writeText(payment.pix_code);
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 3000);
    } catch (err) {
      console.error('Erro ao copiar código:', err);
    }
  };
  
  // Buscar os dados de pagamento
  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/payment-requests/${params.token}`);
        
        if (!response.ok) {
          throw new Error('Pagamento não encontrado ou já expirado');
        }
        
        const data = await response.json();
        setPayment(data);
        
        // Calcular tempo restante
        if (data.expires_at) {
          const expiryTime = new Date(data.expires_at).getTime();
          const now = new Date().getTime();
          const remainingMs = Math.max(0, expiryTime - now);
          const remainingSecs = Math.floor(remainingMs / 1000);
          
          setTimeRemaining(remainingSecs);
          setFormattedTime(formatTimeRemaining(remainingSecs));
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocorreu um erro ao carregar os dados');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPaymentData();
  }, [params.token]);
  
  // Atualizar o timer a cada segundo
  useEffect(() => {
    if (timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prevTime => {
        const newTime = Math.max(0, prevTime - 1);
        setFormattedTime(formatTimeRemaining(newTime));
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining]);
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-180px)]">
        <div className="bg-white rounded-lg shadow-md p-6 w-full mb-6 text-center">
          <p className="text-gray-600 mb-4">Carregando informações do pagamento...</p>
        </div>
      </div>
    );
  }
  
  if (error || !payment) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-180px)]">
        <div className="bg-white rounded-lg shadow-md p-6 w-full mb-6 text-center">
          <p className="text-red-500">{error || 'Pagamento não encontrado'}</p>
        </div>
      </div>
    );
  }
  
  // Calcular a porcentagem de tempo restante para a barra de progresso
  const timePercentage = Math.min(100, Math.max(0, (timeRemaining / 1800) * 100));
  
  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-180px)]">
      {/* Seção de detalhes do pedido */}
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Pagamento</h1>
        <p className="text-gray-600 mb-4">Complete seu pagamento para confirmar seu pedido</p>
        
        <div className="bg-white rounded-lg shadow-md p-6 w-full mb-6">
          <div className="mb-6">
            <p className="text-xl font-bold text-center mb-2">{formattedTime}</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${timePercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 text-center mt-2">Este QR Code expira em {formattedTime}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 w-full mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Detalhes do Pedido</h2>
          
          <div className="mb-2">
            <strong>Serviço:</strong> {payment.service_name}
          </div>
          
          <div className="mb-4">
            <strong>Instagram:</strong> @{payment.instagram_username}
          </div>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="mb-2">
              <strong>Nome:</strong> {payment.customer_name}
            </div>
            <div className="mb-2">
              <strong>Email:</strong> {payment.customer_email}
            </div>
            {payment.customer_phone && (
              <div className="mb-2">
                <strong>Telefone:</strong> {payment.customer_phone}
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Posts selecionados</h2>
          
          {payment.posts.map((post) => (
            <div key={post.id} className="flex mb-4 border-b pb-4">
              <div className="w-20 h-20 mr-4 bg-gray-100 flex-shrink-0 rounded overflow-hidden">
                {post.thumbnail_url ? (
                  <img src={post.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="4" fill="#E5E7EB"/>
                      <path d="M12 8V16M8 12H16" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-sm font-medium mb-1">
                  {post.caption || 'Post do Instagram'}
                </h3>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                    Ver post original
                  </a>
                  
                  <span>
                    {post.quantity} {post.media_type === 'VIDEO' ? 'visualizações' : 'curtidas'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          <div className="flex justify-between items-center py-2 border-b mb-2">
            <span>Subtotal</span>
            <span>R$ {(payment.amount * 0.9).toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b mb-2">
            <span>Taxa de processamento</span>
            <span>R$ {(payment.amount * 0.1).toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center py-3 font-bold">
            <span>Total</span>
            <span>R$ {payment.amount.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Seção do QR Code do PIX */}
      <div className="w-full">
        <div className="bg-white rounded-lg shadow-md p-6 w-full mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Pague com PIX</h2>
          
          <div className="flex flex-col items-center mb-6">
            <div className="border-2 border-gray-200 p-4 rounded-lg mb-4">
              {payment.qr_code_image && (
                <img 
                  src={payment.qr_code_image} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 mx-auto"
                />
              )}
            </div>
            
            <p className="text-sm text-gray-500 mb-4 text-center">
              Escaneie este QR Code com o app do seu banco ou copie o código PIX abaixo
            </p>
            
            <div className="w-full relative">
              <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 overflow-hidden mb-2">
                <pre className="text-xs text-gray-600 whitespace-normal break-all">{payment.pix_code}</pre>
              </div>
              
              <button
                onClick={copyPixCode}
                className="w-full bg-primary-600 text-white px-4 py-2 rounded font-medium hover:bg-primary-700 transition-colors"
              >
                {showCopyFeedback ? "Código copiado!" : "Copiar código PIX"}
              </button>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 text-center">
              Após o pagamento, o sistema irá processar automaticamente seu pedido.
              Este processo pode levar até 5 minutos. Não feche esta janela.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 