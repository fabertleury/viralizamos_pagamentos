'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Definir interface para o tipo Order
interface Order {
  id: string;
  external_order_id?: string;
  status: string;
  service?: {
    name?: string;
  };
  target_username?: string;
  quantity?: number;
  amount?: number;
  created_at: string;
}

export default function AcompanharPedidoPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Função para mapear o status do pagamento para o status do pedido
  const mapPaymentStatusToOrderStatus = (paymentStatus: string): string => {
    switch (paymentStatus?.toLowerCase()) {
      case 'approved':
        return 'processing';
      case 'pending':
        return 'awaiting_payment';
      case 'rejected':
      case 'cancelled':
      case 'refunded':
        return 'cancelled';
      default:
        return paymentStatus?.toLowerCase() || 'unknown';
    }
  };

  // Função para obter a cor do badge de status
  const getStatusColor = (status = 'pending') => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'pending':
      case 'processing':
      case 'in progress':
        return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
      case 'failed':
      case 'rejected':
      case 'canceled':
        return 'bg-red-50 text-red-700 ring-red-600/20';
      case 'partial':
        return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      default:
        return 'bg-gray-50 text-gray-700 ring-gray-600/20';
    }
  };

  // Função para obter o texto do badge de status
  const getOrderStatusBadge = (status = 'pending') => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'Concluído';
      case 'pending':
        return 'Pendente';
      case 'processing':
      case 'in progress':
        return 'Processando';
      case 'failed':
        return 'Falhou';
      case 'rejected':
        return 'Rejeitado';
      case 'canceled':
        return 'Cancelado';
      case 'partial':
        return 'Parcial';
      default:
        return status || 'Desconhecido';
    }
  };

  // Função para formatar a data
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSearchOrders = async (e: React.FormEvent | null = null) => {
    if (e) e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Por favor, informe seu e-mail para buscar os pedidos.');
      return;
    }
    
    setIsSubmitting(true);
    setOrders([]);
    setSearched(true);
    
    try {
      // Aqui você fará a chamada à API para buscar os pedidos
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.orders && Array.isArray(data.orders)) {
          setOrders(data.orders);
          
          if (data.orders.length === 0) {
            toast.info('Nenhum pedido encontrado para este e-mail.');
          } else {
            toast.success(`${data.orders.length} pedidos encontrados.`);
          }
        }
      } else {
        toast.error('Erro ao buscar pedidos. Por favor, tente novamente mais tarde.');
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast.error('Erro ao buscar pedidos. Por favor, tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Acompanhar Pedido</h1>
            
            <form onSubmit={handleSearchOrders} className="bg-white shadow-sm rounded-lg p-6 mb-8">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="flex">
                    <input
                      id="email"
                      type="email"
                      placeholder="Digite seu email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex-1 p-3 border border-gray-200 rounded text-base"
                    />
                    <button 
                      type="submit" 
                      className="ml-2 bg-primary-600 text-white px-4 py-3 rounded font-medium hover:bg-primary-700 transition-colors"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                          <span>Buscando...</span>
                        </div>
                      ) : (
                        'Buscar'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
            
            {searched && orders.length > 0 && (
              <div className="mt-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Seus Pedidos</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Lista de todos os seus pedidos realizados
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar pedidos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Todos os status</option>
                      <option value="pending">Pendente</option>
                      <option value="processing">Processando</option>
                      <option value="completed">Concluído</option>
                      <option value="partial">Parcial</option>
                      <option value="failed">Falhou</option>
                      <option value="canceled">Cancelado</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {orders
                    .filter(order => {
                      // Filtrar por status
                      if (filterStatus !== 'all' && order.status?.toLowerCase() !== filterStatus) {
                        return false;
                      }
                      
                      // Filtrar por termo de busca
                      if (searchTerm) {
                        const searchLower = searchTerm.toLowerCase();
                        return (
                          order.service?.name?.toLowerCase().includes(searchLower) ||
                          (order.external_order_id || order.id).toLowerCase().includes(searchLower) ||
                          order.target_username?.toLowerCase().includes(searchLower)
                        );
                      }
                      
                      return true;
                    })
                    .map((order) => (
                      <div 
                        key={order.id} 
                        className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300"
                      >
                        <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="text-xs font-medium text-gray-500 mr-2">Status do pedido:</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(order.status || 'pending')}`}>
                              {getOrderStatusBadge(order.status || 'pending')}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(order.created_at)}
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <div className="mb-3">
                            <span className="text-sm font-semibold text-gray-700">ID do Pedido:</span>
                            <span className="ml-2 text-sm text-gray-900">{order.external_order_id || order.id}</span>
                          </div>
                          
                          <div className="mb-3">
                            <span className="text-sm font-semibold text-gray-700">Serviço:</span>
                            <span className="ml-2 text-sm text-gray-900">{order.service?.name || 'Não especificado'}</span>
                          </div>
                          
                          {order.target_username && (
                            <div className="mb-3">
                              <span className="text-sm font-semibold text-gray-700">Usuário:</span>
                              <span className="ml-2 text-sm text-gray-900">@{order.target_username}</span>
                            </div>
                          )}
                          
                          <div className="mb-3">
                            <span className="text-sm font-semibold text-gray-700">Quantidade:</span>
                            <span className="ml-2 text-sm text-gray-900">{order.quantity || 'Não especificado'}</span>
                          </div>
                          
                          {order.amount && (
                            <div className="mb-3">
                              <span className="text-sm font-semibold text-gray-700">Valor:</span>
                              <span className="ml-2 text-sm text-gray-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.amount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            {searched && orders.length === 0 && !isSubmitting && (
              <div className="bg-white shadow-sm rounded-lg p-6 mb-8 text-center">
                <p className="text-gray-700 mb-4">Nenhum pedido encontrado para este e-mail.</p>
                <p className="text-gray-600 text-sm">
                  Se você realizou uma compra recentemente, verifique se utilizou o mesmo e-mail informado.
                </p>
              </div>
            )}
            
            {!searched && (
              <div className="bg-white rounded-lg shadow-md p-6 w-full mt-8">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Não tem o email?</h2>
                <p className="text-gray-600 mb-4">
                  Se você não lembra qual e-mail utilizou para compra, entre em contato conosco pelo WhatsApp para obter ajuda.
                </p>
                
                <a 
                  href="https://wa.me/5562999915390" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-green-500 text-white rounded font-medium hover:bg-green-600 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.6 6.3c-1.4-1.5-3.3-2.3-5.4-2.3-4.2 0-7.6 3.4-7.6 7.6 0 1.3 0.3 2.6 1 3.8l-1.1 4 4.1-1.1c1.1 0.6 2.4 0.9 3.7 0.9 4.2 0 7.6-3.4 7.6-7.6 0-2-0.8-3.9-2.3-5.3zm-5.4 11.7c-1.1 0-2.3-0.3-3.3-0.9l-0.2-0.1-2.4 0.6 0.6-2.3-0.1-0.2c-0.6-1-0.9-2.2-0.9-3.4 0-3.5 2.8-6.3 6.3-6.3 1.7 0 3.3 0.7 4.5 1.9s1.9 2.8 1.9 4.5c0 3.5-2.9 6.2-6.4 6.2zm3.5-4.7c-0.2-0.1-1.1-0.6-1.3-0.6-0.2-0.1-0.3-0.1-0.4 0.1-0.1 0.2-0.5 0.6-0.6 0.8-0.1 0.1-0.2 0.1-0.4 0-0.2-0.1-0.8-0.3-1.5-0.9-0.6-0.5-0.9-1.1-1-1.3-0.1-0.2 0-0.3 0.1-0.4 0.1-0.1 0.2-0.2 0.3-0.3 0.1-0.1 0.1-0.2 0.2-0.3 0.1-0.1 0-0.2 0-0.3 0-0.1-0.4-1.1-0.6-1.4-0.2-0.4-0.3-0.3-0.5-0.3h-0.3c-0.1 0-0.3 0-0.5 0.2-0.2 0.2-0.7 0.7-0.7 1.7s0.7 1.9 0.8 2.1c0.1 0.1 1.4 2.1 3.3 2.9 0.5 0.2 0.8 0.3 1.1 0.4 0.5 0.1 0.9 0.1 1.2 0.1 0.4-0.1 1.1-0.5 1.3-0.9 0.2-0.5 0.2-0.9 0.1-0.9-0.1-0.1-0.2-0.1-0.4-0.2z" fill="currentColor"/>
                  </svg>
                  Suporte via WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 