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

// Componente do Header
function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b transition-all duration-300 z-[9999] relative">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="flex items-center">
            <Image 
              src="/images/viralizamos-color.png" 
              alt="Viralizamos" 
              width={150} 
              height={50} 
              priority
            />
          </Link>
          
          <button 
            className="block md:hidden p-2 z-50"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu">
              <line x1="4" x2="20" y1="12" y2="12"></line>
              <line x1="4" x2="20" y1="6" y2="6"></line>
              <line x1="4" x2="20" y1="18" y2="18"></line>
            </svg>
          </button>
          
          <nav className={`${menuOpen ? 'flex flex-col absolute top-full left-0 right-0 bg-white p-4 shadow-lg' : 'hidden'} md:flex md:items-center md:static md:shadow-none md:flex-row gap-6`}>
            <Link href="/" className="text-gray-700 hover:text-primary py-2 md:py-0">Início</Link>
            <Link href="/instagram" className="text-gray-700 hover:text-gray-900 py-2 md:py-0">Serviços para Instagram</Link>
            <Link href="/faq" className="text-gray-700 hover:text-primary py-2 md:py-0">FAQ</Link>
            <Link
              href="/analisar-perfil" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 px-4 py-2 font-medium bg-[#C43582] text-white hover:bg-[#a62c6c]"
            >
              Analisar Perfil
            </Link>
            <Link 
              href="/acompanhar" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 px-4 py-2 font-medium bg-[#C43582] text-white hover:bg-[#a62c6c]"
            >
              Acompanhar Pedido
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
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
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#C43582] mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Carregando...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Erro! </strong>
              <span className="block sm:inline">{error}</span>
            </div>
            <Link href="/" className="text-[#C43582] hover:underline">
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
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
      
      <div className="flex-grow bg-gradient-to-b from-white to-gray-100 py-12">
        <div className="container mx-auto px-4 flex justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 sm:p-8">
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
                    {customer && customer.email && (
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-600 font-medium">Email:</span>
                        <span className="font-medium">{customer.email}</span>
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
                  href={customer && customer.email ? `/acompanhar?email=${encodeURIComponent(customer.email)}` : "/acompanhar"}
                  className="flex-1 border border-[#C43582] text-[#C43582] hover:bg-[#fce7f3] text-center py-3 px-6 rounded-md font-medium transition-colors duration-300"
                >
                  Acompanhar pedido
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 