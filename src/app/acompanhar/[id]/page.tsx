'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Check, ChevronRight, Clock, X, AlertTriangle, Share2, Printer, Truck, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TransactionType {
  id: string;
  external_id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_id: string;
  provider: string;
  method: string;
  metadata: any;
  status_provider: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer: CustomerType | null;
}

interface CustomerType {
  name: string;
  email: string;
  phone: string;
}

export default function AcompanharPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-8">
      <Suspense fallback={<div className="flex justify-center p-12"><Spinner size="lg" /></div>}>
        <AcompanharContent />
      </Suspense>
    </div>
  );
}

function AcompanharContent() {
  const params = useParams();
  const id = params.id as string;
  
  const [transaction, setTransaction] = useState<TransactionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTransaction() {
      try {
        setLoading(true);
        const response = await fetch(`/api/transactions/${id}`);
        
        if (!response.ok) {
          throw new Error('Pedido não encontrado');
        }
        
        const data = await response.json();
        setTransaction(data);
      } catch (err) {
        console.error('Erro ao buscar dados do pedido:', err);
        setError('Não foi possível encontrar as informações do pedido.');
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      fetchTransaction();
    }
  }, [id]);

  const renderStatus = () => {
    if (!transaction) return null;
    
    let statusColor = 'bg-gray-200 text-gray-700';
    let icon = <Clock className="mr-2 h-5 w-5" />;
    let label = 'Processando';
    
    switch (transaction.status.toLowerCase()) {
      case 'paid':
      case 'completed':
        statusColor = 'bg-green-100 text-green-800';
        icon = <Check className="mr-2 h-5 w-5" />;
        label = 'Aprovado';
        break;
      case 'failed':
      case 'canceled':
        statusColor = 'bg-red-100 text-red-800';
        icon = <X className="mr-2 h-5 w-5" />;
        label = 'Cancelado';
        break;
      case 'pending':
        statusColor = 'bg-yellow-100 text-yellow-800';
        icon = <Clock className="mr-2 h-5 w-5" />;
        label = 'Pendente';
        break;
      case 'processing':
        statusColor = 'bg-blue-100 text-blue-800';
        icon = <Clock className="mr-2 h-5 w-5" />;
        label = 'Processando';
        break;
      default:
        statusColor = 'bg-gray-200 text-gray-700';
        icon = <AlertTriangle className="mr-2 h-5 w-5" />;
        label = transaction.status;
    }
    
    return (
      <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusColor}`}>
        {icon}
        {label}
      </div>
    );
  };

  const renderTimeline = () => {
    if (!transaction) return null;
    
    const isCompleted = transaction.status.toLowerCase() === 'paid' || transaction.status.toLowerCase() === 'completed';
    const isPending = transaction.status.toLowerCase() === 'pending';
    const isFailed = transaction.status.toLowerCase() === 'failed' || transaction.status.toLowerCase() === 'canceled';
    const isProcessing = transaction.status.toLowerCase() === 'processing';
    
    const steps = [
      {
        title: 'Pedido recebido',
        description: 'Seu pedido foi registrado com sucesso',
        date: new Date(transaction.created_at).toLocaleString('pt-BR'),
        icon: <ShoppingBag size={24} />,
        completed: true
      },
      {
        title: 'Pagamento',
        description: isCompleted ? 'Pagamento aprovado' : isFailed ? 'Pagamento falhou' : 'Aguardando confirmação',
        date: isCompleted ? new Date(transaction.created_at).toLocaleString('pt-BR') : '',
        icon: <Check size={24} />,
        completed: isCompleted,
        failed: isFailed
      },
      {
        title: 'Processando',
        description: 'Preparando seu pedido',
        date: isCompleted ? new Date(transaction.created_at).toLocaleString('pt-BR') : '',
        icon: <Clock size={24} />,
        completed: isProcessing || isCompleted,
        active: isProcessing
      },
      {
        title: 'Concluído',
        description: 'Pedido finalizado',
        date: isCompleted ? new Date(transaction.created_at).toLocaleString('pt-BR') : '',
        icon: <Truck size={24} />,
        completed: isCompleted
      }
    ];

    return (
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Acompanhamento do pedido</h3>
        <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3">
          {steps.map((step, index) => (
            <li className="mb-10 ml-6" key={index}>
              <span className={`absolute flex items-center justify-center w-10 h-10 rounded-full -left-5 ring-4 ring-white
                ${step.completed ? 'bg-green-500 text-white' : step.failed ? 'bg-red-500 text-white' : step.active ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                {step.icon}
              </span>
              <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900">
                {step.title}
                {step.completed && !step.failed && (
                  <span className="bg-green-100 text-green-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded ml-3">
                    Concluído
                  </span>
                )}
                {step.failed && (
                  <span className="bg-red-100 text-red-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded ml-3">
                    Falhou
                  </span>
                )}
              </h3>
              <time className="block mb-2 text-sm font-normal leading-none text-gray-400">{step.date}</time>
              <p className="text-base font-normal text-gray-500">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600">Carregando informações do pedido...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido não encontrado</h2>
        <p className="text-gray-600 mb-6">{error || 'Não foi possível encontrar as informações do pedido solicitado.'}</p>
        <Button variant="default" onClick={() => window.location.href = '/'}>
          Voltar para o início
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl font-bold mb-2">Acompanhamento do Pedido</h1>
        <p className="text-gray-600">
          Pedido #{transaction.external_id || transaction.payment_id || transaction.id.substring(0, 8)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-bold">Detalhes do pedido</CardTitle>
              {renderStatus()}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">ID do Pedido</h3>
                  <p className="text-lg font-semibold">{transaction.external_id || transaction.payment_id || transaction.id.substring(0, 8)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Valor</h3>
                  <p className="text-lg font-semibold">{formatCurrency(transaction.amount)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Data</h3>
                  <p className="text-lg font-semibold">{new Date(transaction.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Método de Pagamento</h3>
                  <p className="text-lg font-semibold capitalize">{transaction.method || 'Não informado'}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.share?.({
                    title: 'Acompanhamento de Pedido',
                    text: `Acompanhamento do Pedido #${transaction.external_id || transaction.id.substring(0, 8)}`,
                    url: window.location.href
                  }).catch(err => console.error('Erro ao compartilhar:', err));
                }}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar
                </Button>
              </div>
            </CardContent>
          </Card>

          {renderTimeline()}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Nome</h3>
                  <p className="text-lg font-semibold">{transaction.customer_name || transaction.customer?.name || 'Não informado'}</p>
                </div>
                {(transaction.customer_email || transaction.customer?.email) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="text-lg font-semibold">{transaction.customer_email || transaction.customer?.email}</p>
                  </div>
                )}
                {(transaction.customer_phone || transaction.customer?.phone) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Telefone</h3>
                    <p className="text-lg font-semibold">{transaction.customer_phone || transaction.customer?.phone}</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <Button className="w-full" onClick={() => window.location.href = '/'}>
                  Voltar para o início
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 