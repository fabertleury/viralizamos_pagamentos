'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TransactionType {
  id: string;
  external_id?: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_id?: string;
  metadata?: any;
  payment_id?: string;
  provider_response?: any;
  external_order_id?: string;
  status_provider?: string;
  payment_link?: string;
  payment_method?: string;
  description?: string;
  method?: string;
  provider?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export default function AcompanharPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-[#C43582] border-t-transparent rounded-full"></div></div>}>
      <AcompanharContent />
    </Suspense>
  );
}

function AcompanharContent() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<TransactionType | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        } catch (apiError) {
          console.error('Erro ao buscar da API:', apiError);
          setError('Transação não encontrada ou não pode ser processada');
          setLoading(false);
          return;
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

  // Renderizar o status da transação
  const renderStatus = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
      case 'paid':
        return (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Aprovado</span>
          </div>
        );
      case 'pending':
      case 'processing':
      case 'waiting_payment':
        return (
          <div className="flex items-center space-x-2 text-amber-500">
            <Clock className="h-5 w-5" />
            <span>Pendente</span>
          </div>
        );
      case 'failed':
      case 'error':
      case 'declined':
        return (
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span>Falhou</span>
          </div>
        );
      case 'refunded':
        return (
          <div className="flex items-center space-x-2 text-blue-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Reembolsado</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2 text-gray-500">
            <Clock className="h-5 w-5" />
            <span>{status}</span>
          </div>
        );
    }
  };

  const renderTimeline = (transaction: TransactionType) => {
    const steps = [
      {
        title: 'Pedido Recebido',
        description: 'Seu pedido foi recebido com sucesso',
        date: new Date(transaction.created_at).toLocaleString('pt-BR'),
        completed: true,
      },
      {
        title: 'Pagamento',
        description: transaction.status === 'completed' || transaction.status === 'approved' || transaction.status === 'paid' 
          ? 'Pagamento confirmado' 
          : transaction.status === 'pending' || transaction.status === 'processing' || transaction.status === 'waiting_payment'
            ? 'Aguardando confirmação do pagamento'
            : transaction.status === 'failed' || transaction.status === 'error' || transaction.status === 'declined'
              ? 'Pagamento não aprovado'
              : transaction.status === 'refunded'
                ? 'Pagamento reembolsado'
                : 'Status do pagamento: ' + transaction.status,
        date: transaction.updated_at ? new Date(transaction.updated_at).toLocaleString('pt-BR') : undefined,
        completed: transaction.status === 'completed' || transaction.status === 'approved' || transaction.status === 'paid',
        pending: transaction.status === 'pending' || transaction.status === 'processing' || transaction.status === 'waiting_payment',
        failed: transaction.status === 'failed' || transaction.status === 'error' || transaction.status === 'declined' || transaction.status === 'refunded',
      },
      {
        title: 'Processamento',
        description: 'Seu pedido está sendo processado',
        completed: transaction.status === 'completed' || transaction.status === 'approved' || transaction.status === 'paid',
        pending: transaction.status === 'pending' || transaction.status === 'processing' || transaction.status === 'waiting_payment',
      },
      {
        title: 'Finalizado',
        description: 'Seu pedido foi finalizado com sucesso',
        completed: transaction.status === 'completed' || transaction.status === 'approved' || transaction.status === 'paid',
      }
    ];

    return (
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Status do Pedido</h3>
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={index} className="relative flex items-start">
              {/* Conectores */}
              {index < steps.length - 1 && (
                <div className="absolute left-4 top-6 h-full w-0.5 bg-gray-200"></div>
              )}
              
              {/* Status circle */}
              <div className={`flex-shrink-0 h-8 w-8 rounded-full border-2 flex items-center justify-center z-10 ${
                step.completed 
                  ? 'bg-green-100 border-green-500 text-green-500' 
                  : step.failed
                    ? 'bg-red-100 border-red-500 text-red-500'
                    : step.pending
                      ? 'bg-amber-100 border-amber-500 text-amber-500'
                      : 'bg-gray-100 border-gray-300 text-gray-300'
              }`}>
                {step.completed ? (
                  <CheckCircle className="h-5 w-5" />
                ) : step.failed ? (
                  <XCircle className="h-5 w-5" />
                ) : step.pending ? (
                  <Clock className="h-5 w-5" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                )}
              </div>
              
              {/* Content */}
              <div className="ml-4 min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900">{step.title}</div>
                <p className="mt-1 text-sm text-gray-500">{step.description}</p>
                {step.date && (
                  <p className="mt-1 text-xs text-gray-400">{step.date}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="animate-spin h-12 w-12 border-4 border-[#C43582] border-t-transparent rounded-full mb-4"></div>
        <h1 className="text-2xl font-bold text-center">Carregando informações do pedido...</h1>
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

  if (!transaction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Atenção! </strong>
          <span className="block sm:inline">Não foi possível encontrar informações deste pedido.</span>
        </div>
        <Link href="/" className="text-[#C43582] hover:underline">
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header com logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image 
              src="/images/viralizamos-color.png" 
              alt="Viralizamos" 
              width={200} 
              height={60} 
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Acompanhamento do Pedido</h1>
          <p className="mt-2 text-gray-600">
            Acompanhe o status e detalhes do seu pedido
          </p>
        </div>
        
        {/* Card principal */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header do card */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                Pedido #{transaction.payment_id || transaction.external_id || transaction.id.substring(0, 8)}
              </h2>
              <p className="text-sm text-gray-500">
                {new Date(transaction.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div>
              {renderStatus(transaction.status)}
            </div>
          </div>
          
          {/* Conteúdo do card */}
          <div className="px-6 py-4">
            {/* Detalhes do pedido */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Detalhes do Pedido</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  {transaction.description && (
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-600 font-medium">Descrição:</span>
                      <span className="font-medium">{transaction.description}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600 font-medium">Valor:</span>
                    <span className="font-medium">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600 font-medium">Método de Pagamento:</span>
                    <span className="font-medium">
                      {transaction.method || transaction.payment_method || 'Não especificado'}
                    </span>
                  </div>
                  {transaction.status_provider && (
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-600 font-medium">Status no Provedor:</span>
                      <span className="font-medium">
                        {transaction.status_provider}
                      </span>
                    </div>
                  )}
                  {transaction.external_order_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">ID do Pedido Externo:</span>
                      <span className="font-medium">{transaction.external_order_id}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Detalhes do cliente */}
            {(transaction.customer_name || transaction.customer?.name) && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Informações do Cliente</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {(transaction.customer_name || transaction.customer?.name) && (
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-600 font-medium">Nome:</span>
                        <span className="font-medium">{transaction.customer_name || transaction.customer?.name}</span>
                      </div>
                    )}
                    {(transaction.customer_email || transaction.customer?.email) && (
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-600 font-medium">Email:</span>
                        <span className="font-medium">{transaction.customer_email || transaction.customer?.email}</span>
                      </div>
                    )}
                    {(transaction.customer_phone || transaction.customer?.phone) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">Telefone:</span>
                        <span className="font-medium">{transaction.customer_phone || transaction.customer?.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Timeline de status */}
            {renderTimeline(transaction)}
            
            {/* Botões de ação */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <a 
                href="https://viralizamos.com" 
                className="flex-1 bg-[#C43582] hover:bg-[#a62c6c] text-white text-center py-3 px-6 rounded-md font-medium transition-colors duration-300 shadow-sm"
              >
                Voltar para a página inicial
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 