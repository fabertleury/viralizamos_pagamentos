'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ViralizamosHeader from '@/components/layout/ViralizamosHeader';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Grid,
  GridItem,
  Flex,
  Badge,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  Spinner,
  Select,
  FormControl,
  FormLabel,
  useToast,
  useColorModeValue,
  Spacer,
  Skeleton
} from '@chakra-ui/react';
import { ArrowLeft, RefreshCw, CheckCircle, Clock, XCircle, AlertTriangle, MessageCircle } from 'lucide-react';
import Link from 'next/link';

// Definir interfaces
interface TransactionData {
  id: string;
  status: string;
  method: string;
  provider: string;
  external_id: string;
  amount: number;
  created_at: string;
  processed_at: string | null;
}

interface FormattedPost {
  index: number;
  type: string;
  code: string;
  quantity: number;
  imageUrl: string;
  textDescription: string;
}

interface OrderDetails {
  id: string;
  token: string;
  status: string;
  service_name: string;
  profile_username: string;
  amount: number;
  description: string;
  formatted_posts?: FormattedPost[];
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_email: string;
  transaction: TransactionData | null;
  order_id?: string; // ID do pedido no sistema de orders, se disponível
}

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

// Verificar se o pedido foi concluído há menos de 30 dias
const isWithin30Days = (dateString: string): boolean => {
  const orderDate = new Date(dateString);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - orderDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays <= 30;
};

// Verificar se já se passaram 12 horas desde a compra
const isPast12Hours = (dateString: string): boolean => {
  const orderDate = new Date(dateString);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - orderDate.getTime());
  const diffHours = diffTime / (1000 * 60 * 60); 
  return diffHours >= 12;
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [requestingReprocess, setRequestingReprocess] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reprocessRequests, setReprocessRequests] = useState<any[]>([]);
  const [loadingReprocessStatus, setLoadingReprocessStatus] = useState(false);
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  // Determinar o ícone do status de pagamento
  const getPaymentStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Icon as={CheckCircle} color="green.500" />;
      case 'pending':
        return <Icon as={Clock} color="yellow.500" />;
      case 'rejected':
      case 'cancelled':
      case 'refunded':
        return <Icon as={XCircle} color="red.500" />;
      default:
        return <Icon as={AlertTriangle} color="gray.500" />;
    }
  };

  // Obter cor do badge baseado no status
  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'approved':
        return 'green';
      case 'pending':
      case 'processing':
      case 'in progress':
        return 'blue';
      case 'failed':
      case 'rejected':
      case 'cancelled':
      case 'refunded':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Formatar o status para exibição
  const formatStatus = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'Concluído';
      case 'pending':
        return 'Pendente';
      case 'processing':
      case 'in progress':
        return 'Processando';
      case 'approved':
        return 'Aprovado';
      case 'failed':
        return 'Falhou';
      case 'rejected':
        return 'Rejeitado';
      case 'cancelled':
      case 'canceled':
        return 'Erro';
      case 'unpaid':
        return 'Não Pago';
      case 'payment not approved':
        return 'Não Pago';
      default:
        return status || 'Desconhecido';
    }
  };

  // Buscar status das reposições
  const fetchReprocessStatus = async () => {
    if (!order) return;
    
    setLoadingReprocessStatus(true);
    
    try {
      const response = await fetch(`/api/payment-reprocess?paymentRequestId=${order.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar status das reposições');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setReprocessRequests(data.reprocessRequests || []);
      } else {
        throw new Error(data.error || 'Erro ao carregar status das reposições');
      }
    } catch (err) {
      console.error('Erro ao buscar status das reposições:', err);
      // Não exibir toast para não incomodar o usuário com erro não crítico
    } finally {
      setLoadingReprocessStatus(false);
    }
  };

  // Buscar detalhes do pedido
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!params.token) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Buscando detalhes do pedido com token: ${params.token}`);
        const response = await fetch(`/api/payment-requests/${params.token}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao buscar detalhes do pedido');
        }
        
        const data = await response.json();
        console.log('Detalhes do pedido recebidos:', data);
        
        if (data.paymentRequest) {
          setOrder(data.paymentRequest);
          setNewStatus(data.paymentRequest.status || '');
          
          // Buscar status das reposições após carregar o pedido
          if (data.paymentRequest.id) {
            setTimeout(() => {
              fetchReprocessStatus();
            }, 300);
          }
        } else {
          setError('Dados do pedido não encontrados');
        }
      } catch (err) {
        console.error('Erro ao buscar detalhes do pedido:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [params.token]);

  // Formatador de status de reposição
  const formatReprocessStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pendente';
      case 'processing':
        return 'Em processamento';
      case 'completed':
        return 'Concluída';
      case 'failed':
        return 'Falhou';
      default:
        return status || 'Desconhecido';
    }
  };

  // Obter cor do badge para status de reposição
  const getReprocessStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'blue';
      case 'processing':
        return 'purple';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Atualizar status do pedido
  const handleUpdateStatus = async () => {
    if (!order) return;
    
    setUpdatingStatus(true);
    
    try {
      // Primeiro, verificar se temos o ID do pedido associado a este payment request
      const orderId = order.order_id || order.id;
      if (!orderId) {
        throw new Error('ID do pedido não encontrado');
      }
      
      const response = await fetch(`/api/orders/check-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          forceUpdate: true // Forçar atualização do status no banco de dados
        }),
      });
      
      if (!response.ok) {
        throw new Error('Não foi possível verificar o status do pedido');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOrder(prev => prev ? { 
          ...prev, 
          status: data.order.status,
          transaction: prev.transaction ? {
            ...prev.transaction,
            status: data.provider_status || prev.transaction.status
          } : null
        } : null);
        
        toast({
          title: 'Status atualizado',
          description: 'O status do seu pedido foi atualizado com sucesso.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(data.error || 'Erro ao atualizar status');
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao verificar status do pedido.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Função para solicitar reposição de um pedido
  const handleRequestReprocess = async () => {
    if (!order) return;
    
    setRequestingReprocess(true);
    
    try {
      const response = await fetch(`/api/payment-reprocess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentRequestId: order.id,
          reason: 'Solicitação de reposição pelo cliente'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Não foi possível solicitar a reposição');
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Solicitação enviada',
          description: 'Sua solicitação de reposição foi enviada com sucesso e será analisada em breve.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Atualizar a lista de reposições
        setTimeout(() => {
          fetchReprocessStatus();
        }, 500);
      } else {
        throw new Error(data.error || 'Erro ao solicitar reposição');
      }
    } catch (err) {
      console.error('Erro ao solicitar reposição:', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao solicitar reposição.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setRequestingReprocess(false);
    }
  };

  return (
    <Box minH="100vh" display="flex" flexDir="column" bg={bgColor}>
      <ViralizamosHeader />
      
      <Container maxW="container.lg" py={8} flex="1">
        <Button
          as={Link}
          href="/acompanhar"
          leftIcon={<ArrowLeft size={16} />}
          variant="ghost"
          mb={6}
          size="sm"
        >
          Voltar para lista de pedidos
        </Button>

        {loading ? (
          <VStack spacing={4} align="stretch">
            <Skeleton height="50px" width="300px" />
            <Skeleton height="200px" borderRadius="md" />
            <Skeleton height="150px" borderRadius="md" />
          </VStack>
        ) : error ? (
          <Box textAlign="center" p={8}>
            <Heading size="md" mb={4} color="red.500">
              {error}
            </Heading>
            <Text mb={6}>
              {error === 'Pedido não encontrado. Verifique se o link está correto.' 
                ? 'O pedido que você está procurando não foi encontrado no sistema. Verifique se o link está correto ou entre em contato com o suporte.' 
                : 'Não foi possível carregar os detalhes do pedido. Por favor, tente novamente mais tarde.'}
            </Text>
            <VStack spacing={4}>
              <Button as={Link} href="/acompanhar" colorScheme="blue">
                Voltar para lista de pedidos
              </Button>
              <Button as={Link} href="/" variant="outline">
                Voltar para página inicial
              </Button>
            </VStack>
          </Box>
        ) : order ? (
          <VStack spacing={6} align="stretch">
            <Heading as="h1" size="xl">
              Detalhes do Pedido
            </Heading>
            
            <HStack mb={8}>
              <Badge colorScheme={getStatusColor(order.status)} fontSize="md" px={2} py={1}>
                {formatStatus(order.status)}
              </Badge>
              <Text fontSize="sm" color="gray.500">
                Pedido #VP-{order.token.substring(0, 8)}
              </Text>
              <Spacer />
              <Text fontSize="sm" color="gray.500">
                {formatDate(order.created_at)}
              </Text>
            </HStack>

            <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={6}>
              <GridItem>
                <Card bg={cardBg} shadow="md" borderRadius="lg" borderColor={borderColor} mb={6}>
                  <CardHeader pb={0}>
                    <Heading size="md">Informações do Pedido</Heading>
                  </CardHeader>
                  
                  <CardBody>
                    <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap={4}>
                      <GridItem>
                        <VStack align="flex-start" spacing={1}>
                          <Text fontSize="sm" color="gray.500">Serviço</Text>
                          <Text fontWeight="semibold">{order.service_name}</Text>
                        </VStack>
                      </GridItem>
                      
                      <GridItem>
                        <VStack align="flex-start" spacing={1}>
                          <Text fontSize="sm" color="gray.500">Perfil</Text>
                          <Text fontWeight="semibold">{order.profile_username || 'Não especificado'}</Text>
                        </VStack>
                      </GridItem>
                      
                      <GridItem>
                        <VStack align="flex-start" spacing={1}>
                          <Text fontSize="sm" color="gray.500">Valor</Text>
                          <Text fontWeight="semibold">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(order.amount)}
                          </Text>
                        </VStack>
                      </GridItem>
                      
                      <GridItem>
                        <VStack align="flex-start" spacing={1}>
                          <Text fontSize="sm" color="gray.500">Data do Pedido</Text>
                          <Text fontWeight="semibold">{formatDate(order.created_at)}</Text>
                        </VStack>
                      </GridItem>
                      
                      {/* Campo para quantidade total */}
                      <GridItem>
                        <VStack align="flex-start" spacing={1}>
                          <Text fontSize="sm" color="gray.500">Quantidade Total</Text>
                          <Text fontWeight="semibold">
                            {order.formatted_posts && order.formatted_posts.length > 0 
                              ? order.formatted_posts.reduce((total, post) => total + (post.quantity || 0), 0)
                              : "Não especificado"}
                          </Text>
                        </VStack>
                      </GridItem>
                    </Grid>
                    
                    {order.description && (
                      <>
                        <Divider my={4} />
                        <VStack align="flex-start" spacing={3} width="100%">
                          <Text fontSize="sm" color="gray.500">Descrição</Text>
                          
                          {/* Exibir posts formatados, se disponíveis */}
                          {order.formatted_posts && order.formatted_posts.length > 0 ? (
                            <VStack spacing={3} width="100%" align="stretch">
                              {order.formatted_posts.map((post) => (
                                <Box 
                                  key={post.index}
                                  p={3} 
                                  borderRadius="md" 
                                  bg={useColorModeValue('gray.50', 'gray.700')}
                                  display="flex"
                                  alignItems="center"
                                  gap={3}
                                >
                                  <Text fontSize="sm" fontWeight="medium">
                                    {post.textDescription}
                                  </Text>
                                </Box>
                              ))}
                            </VStack>
                          ) : (
                            <Box 
                              whiteSpace="pre-wrap" 
                              p={3} 
                              borderRadius="md" 
                              bg={useColorModeValue('gray.50', 'gray.700')}
                              fontSize="sm"
                              w="100%"
                            >
                              {order.description}
                            </Box>
                          )}
                        </VStack>
                      </>
                    )}
                  </CardBody>
                </Card>
                
                {order.transaction && (
                  <Card bg={cardBg} shadow="md" borderRadius="lg" borderColor={borderColor}>
                    <CardHeader pb={0}>
                      <Flex alignItems="center" justifyContent="space-between">
                        <Heading size="md">Dados do Pagamento</Heading>
                        {getPaymentStatusIcon(order.transaction.status)}
                      </Flex>
                    </CardHeader>
                    
                    <CardBody>
                      <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap={4}>
                        <GridItem>
                          <VStack align="flex-start" spacing={1}>
                            <Text fontSize="sm" color="gray.500">Método</Text>
                            <Text fontWeight="semibold">
                              {order.transaction.method === 'pix' 
                                ? 'PIX' 
                                : order.transaction.method.charAt(0).toUpperCase() + order.transaction.method.slice(1)}
                            </Text>
                          </VStack>
                        </GridItem>
                        
                        <GridItem>
                          <VStack align="flex-start" spacing={1}>
                            <Text fontSize="sm" color="gray.500">Status</Text>
                            <Badge 
                              colorScheme={getStatusColor(order.transaction.status)}
                              fontSize="sm"
                            >
                              {formatStatus(order.transaction.status)}
                            </Badge>
                          </VStack>
                        </GridItem>
                        
                        <GridItem>
                          <VStack align="flex-start" spacing={1}>
                            <Text fontSize="sm" color="gray.500">Processador</Text>
                            <Text fontWeight="semibold">{order.transaction.provider}</Text>
                          </VStack>
                        </GridItem>
                        
                        <GridItem>
                          <VStack align="flex-start" spacing={1}>
                            <Text fontSize="sm" color="gray.500">ID Externo</Text>
                            <Text fontWeight="semibold" fontSize="sm">
                              {order.transaction.external_id || 'N/A'}
                            </Text>
                          </VStack>
                        </GridItem>
                        
                        {order.transaction.processed_at && (
                          <GridItem colSpan={2}>
                            <VStack align="flex-start" spacing={1}>
                              <Text fontSize="sm" color="gray.500">Processado em</Text>
                              <Text fontWeight="semibold">{formatDate(order.transaction.processed_at)}</Text>
                            </VStack>
                          </GridItem>
                        )}
                      </Grid>
                    </CardBody>
                  </Card>
                )}
              </GridItem>
              
              <GridItem>
                <Card bg={cardBg} shadow="md" borderRadius="lg" borderColor={borderColor} mb={6}>
                  <CardHeader pb={2}>
                    <Heading size="md">Cliente</Heading>
                  </CardHeader>
                  
                  <CardBody>
                    <VStack align="flex-start" spacing={4}>
                      <Box>
                        <Text fontSize="sm" color="gray.500">Nome</Text>
                        <Text fontWeight="semibold">{order.customer_name}</Text>
                      </Box>
                      
                      <Box>
                        <Text fontSize="sm" color="gray.500">Email</Text>
                        <Text fontWeight="semibold">{order.customer_email}</Text>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
                
                {/* Seção de reposições */}
                {reprocessRequests.length > 0 && (
                  <Card bg={cardBg} shadow="md" borderRadius="lg" borderColor={borderColor} mb={6}>
                    <CardHeader pb={2}>
                      <Heading size="md">Reposições Solicitadas</Heading>
                    </CardHeader>
                    
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        {reprocessRequests.map((request, index) => (
                          <Box 
                            key={request.id} 
                            p={3} 
                            borderRadius="md" 
                            bg={useColorModeValue('gray.50', 'gray.700')}
                          >
                            <Flex justify="space-between" align="center" mb={1}>
                              <HStack>
                                <Text fontSize="sm" fontWeight="medium">
                                  Reposição #{index + 1}
                                </Text>
                                <Badge colorScheme={getReprocessStatusColor(request.status)}>
                                  {formatReprocessStatus(request.status)}
                                </Badge>
                              </HStack>
                              <Text fontSize="xs" color="gray.500">
                                {formatDate(request.created_at)}
                              </Text>
                            </Flex>
                            
                            {request.metadata && request.metadata.reason && (
                              <Text fontSize="sm" color="gray.600" mt={1}>
                                Motivo: {request.metadata.reason}
                              </Text>
                            )}
                            
                            {request.processed_at && (
                              <Text fontSize="xs" color="gray.500" mt={1}>
                                Processado em: {formatDate(request.processed_at)}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}
                
                <Card bg={cardBg} shadow="md" borderRadius="lg" borderColor={borderColor}>
                  <CardHeader pb={2}>
                    <Heading size="md">Ações</Heading>
                  </CardHeader>
                  
                  <CardBody>
                    <VStack spacing={4}>
                      <Text fontSize="sm" color="gray.600" textAlign="center">
                        Clique no botão abaixo para verificar o status atual do seu pedido no provedor do serviço.
                        Esta ação consultará diretamente o sistema do provedor para atualizar o status do seu pedido.
                      </Text>
                      
                      <Button
                        colorScheme="blue"
                        width="full"
                        leftIcon={<RefreshCw size={18} />}
                        isLoading={updatingStatus}
                        loadingText="Verificando..."
                        onClick={handleUpdateStatus}
                        height="44px"
                        iconSpacing={2}
                        fontSize="md"
                        mb={2}
                      >
                        Verificar Status do Pedido
                      </Button>
                      
                      {order.transaction && order.transaction.status === 'approved' && (
                        <Button
                          as={Link}
                          href={`/api/payment-requests/${order.token}/receipt`}
                          target="_blank"
                          colorScheme="green"
                          variant="outline"
                          width="full"
                          mb={2}
                        >
                          Gerar Recibo
                        </Button>
                      )}
                      
                      {order.transaction && (order.transaction.status === 'cancelled' || order.transaction.status === 'canceled') && (
                        <Button
                          as="a"
                          href="https://wa.me/5562999915390"
                          target="_blank"
                          colorScheme="green"
                          variant="solid"
                          width="full"
                          mb={2}
                          leftIcon={<MessageCircle size={18} />}
                        >
                          Pedir Ajuda
                        </Button>
                      )}
                      
                      {/* Botão de solicitar reposição (apenas se dentro de 30 dias, após 12 horas da compra e não há reposição pendente) */}
                      {order.status === 'completed' && isWithin30Days(order.created_at) && isPast12Hours(order.created_at) && (
                        !reprocessRequests.some(r => r.status === 'pending' || r.status === 'processing')
                      ) && (
                        <Button
                          colorScheme="purple"
                          variant="outline"
                          width="full"
                          leftIcon={<RefreshCw size={18} />}
                          isLoading={requestingReprocess}
                          loadingText="Enviando..."
                          onClick={handleRequestReprocess}
                        >
                          Solicitar Reposição
                        </Button>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </VStack>
        ) : (
          <Box textAlign="center" p={8}>
            <Heading size="md" mb={4}>
              Pedido não encontrado
            </Heading>
            <Text mb={6}>
              Não foi possível encontrar detalhes para este pedido.
            </Text>
            <Button as={Link} href="/acompanhar" colorScheme="blue">
              Voltar para lista de pedidos
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
} 