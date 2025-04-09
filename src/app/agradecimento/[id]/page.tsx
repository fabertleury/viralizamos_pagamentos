'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import Confetti from 'react-confetti';
import Image from 'next/image';

interface TransactionType {
  id: string;
  external_id?: string;
  amount: number;
  status: string;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_id?: string;
  metadata?: any;
  payment_id?: string;
  provider_response?: any;
  external_order_id?: string;
  status_provider?: string;
}

interface CustomerType {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

export default function AgradecimentoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <AgradecimentoContent />
    </Suspense>
  );
}

function AgradecimentoContent() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<TransactionType | null>(null);
  const [customer, setCustomer] = useState<CustomerType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(true);

  // Configurar as dimensões da janela para o confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Definir dimensões iniciais
    handleResize();
    
    // Adicionar event listener
    window.addEventListener('resize', handleResize);
    
    // Configurar tempo para esconder confetti
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 10000); // 10 segundos
    
    // Limpar
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const fetchTransactionAndCustomer = async () => {
      try {
        setLoading(true);
        
        // Obter ID da transação dos parâmetros da rota
        const transactionId = params.id;
        
        if (!transactionId) {
          setError('ID da transação não encontrado');
          setLoading(false);
          return;
        }
        
        // Converter para string se for um array (handle string | string[])
        const transactionIdString = Array.isArray(transactionId) ? transactionId[0] : transactionId;
        
        // Verificar se o ID é um UUID válido
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionIdString);
        
        // Buscar dados da transação via API
        let transactionData;
        try {
          // Fazer requisição para API interna - usar endpoint diferente dependendo do formato do ID
          const apiUrl = isUuid 
            ? `/api/transactions/${transactionIdString}` 
            : `/api/transactions/token/${transactionIdString}`;
          
          console.log(`Buscando transação usando: ${apiUrl}`);
          const response = await fetch(apiUrl);
          
          if (!response.ok) {
            throw new Error(`Erro ao buscar transação: ${response.status}`);
          }
          
          transactionData = await response.json();
          setTransaction(transactionData);
          
          // Se tiver dados do cliente, definir o cliente
          if (transactionData.customer) {
            setCustomer(transactionData.customer);
          }
          
        } catch (apiError) {
          console.error('Erro ao buscar da API:', apiError);
          setError('Transação não encontrada ou não pode ser processada');
          setLoading(false);
          return;
        }
        
        // Rastrear evento com analytics
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Purchase', {
            value: transactionData?.amount,
            currency: 'BRL',
          });
        }
      } catch (err) {
        console.error('Erro:', err);
        setError('Ocorreu um erro ao processar sua solicitação');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionAndCustomer();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#C43582] mb-4" />
        <h1 className="text-2xl font-bold text-center">Carregando...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        <Link href="/" className="text-[#C43582] hover:underline">
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-white to-gray-100">
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={true}
          numberOfPieces={200}
          gravity={0.15}
          colors={['#FF92CD', '#C43582', '#00CCFF', '#33FF99', '#FFFF00', '#FF9933']}
        />
      )}
      
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image 
              src="/images/viralizamos-color.png" 
              alt="Viralizamos" 
              width={200} 
              height={60} 
              priority
            />
          </div>
          
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Pagamento Aprovado!
          </h1>
          
          <p className="text-center text-gray-600 mb-6">
            Seu pedido foi confirmado e está sendo processado.
          </p>
          
          {transaction && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalhes do Pedido</h2>
              <div className="space-y-3">
                {customer && customer.name && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600 font-medium">Cliente:</span>
                    <span className="font-medium">{customer.name}</span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600 font-medium">ID da Transação:</span>
                  <span className="font-medium">{transaction.payment_id || transaction.external_id || transaction.id}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600 font-medium">Valor:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(transaction.amount)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600 font-medium">Data:</span>
                  <span className="font-medium">
                    {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Status:</span>
                  <span className="font-medium text-green-600">Aprovado</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Botões de ação */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <a 
              href="https://viralizamos.com" 
              className="flex-1 bg-[#C43582] hover:bg-[#a62c6c] text-white text-center py-3 px-6 rounded-md font-medium transition-colors duration-300 shadow-sm"
            >
              Voltar para a página inicial
            </a>
            
            <Link 
              href={`/acompanhar/${transaction?.id || params.id}`}
              className="flex-1 border border-[#C43582] text-[#C43582] hover:bg-[#fce7f3] text-center py-3 px-6 rounded-md font-medium transition-colors duration-300"
            >
              Acompanhar pedido
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 