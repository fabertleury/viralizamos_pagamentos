'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import ViralizamosHeader from '@/components/layout/ViralizamosHeader';
import { ViralizamosFooter } from '@/components/layout/ViralizamosFooter';
import {
  Box,
  Container,
  Heading,
  Text,
  FormControl,
  FormLabel,
  Input,
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
  Divider,
  InputGroup,
  InputRightElement,
  Select,
  Stack,
  useColorModeValue
} from '@chakra-ui/react';

// Definir interface para o tipo Order
interface TransactionData {
  id: string;
  status: string;
  method: string;
  provider: string;
  created_at: string;
  processed_at: string | null;
}

interface CustomerData {
  name: string;
  email: string;
}

interface Order {
  id: string;
  token: string;
  status: string;
  service_name: string;
  profile_username: string;
  amount: number;
  created_at: string;
  transaction: TransactionData | null;
  customer: CustomerData;
  reprocessRequests?: {
    id: string;
    status: string;
    created_at: string;
    processed_at?: string;
  }[];
  formatted_posts?: { quantity: number }[];
}

export default function AcompanharPedidoPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [processingOrders, setProcessingOrders] = useState<{[key: string]: boolean}>({});
  const [loadingReprocessStatus, setLoadingReprocessStatus] = useState<{[key: string]: boolean}>({});
  
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
      case 'unpaid':
        return 'unpaid';
      default:
        return paymentStatus?.toLowerCase() || 'unknown';
    }
  };

  // Função para obter a variante do badge baseado no status
  const getStatusVariant = (status = 'pending') => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'success';
      case 'pending':
      case 'processing':
      case 'in progress':
        return 'processing';
      case 'failed':
      case 'rejected':
      case 'canceled':
        return 'error';
      case 'partial':
        return 'partial';
      default:
        return 'processing';
    }
  };

  // Função para obter o texto do badge de status
  const getOrderStatusBadge = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'Concluído';
      case 'pending':
        return 'Pendente';
      case 'processing':
        return 'Processando';
      case 'failed':
        return 'Falhou';
      case 'cancelled':
      case 'canceled':
        return 'Erro';
      case 'payment not approved':
      case 'unpaid':
        return 'Não Pago';
      default:
        return status;
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

  // Função para filtrar e ordernar os pedidos
  const getFilteredOrders = () => {
    return orders
      .filter(order => {
        // Filtrar por status
        if (filterStatus !== 'all' && order.status.toLowerCase() !== filterStatus) {
          return false;
        }
        
        // Filtrar por termo de busca
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return (
            order.id.toLowerCase().includes(term) ||
            order.token.toLowerCase().includes(term) ||
            order.service_name.toLowerCase().includes(term) ||
            (order.profile_username && order.profile_username.toLowerCase().includes(term)) ||
            (order.transaction?.id && order.transaction.id.toLowerCase().includes(term))
          );
        }
        
        return true;
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
      // Chamar a API para buscar os pedidos
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
          setUserData(data.user);
          
          if (data.orders.length === 0) {
            toast.info('Nenhum pedido encontrado para este e-mail.');
          } else {
            toast.success(`${data.orders.length} pedidos encontrados.`);
          }
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao buscar pedidos. Por favor, tente novamente mais tarde.');
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast.error('Erro ao buscar pedidos. Por favor, tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  
  // Obter pedidos filtrados
  const filteredOrders = getFilteredOrders();
  
  // Função para buscar status das reposições para um pedido
  const fetchReprocessStatus = async (orderId: string) => {
    // Evitar buscar novamente se já estiver carregando
    if (loadingReprocessStatus[orderId]) return;
    
    // Atualizar estado de carregamento
    setLoadingReprocessStatus(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await fetch(`/api/payment-reprocess?paymentRequestId=${orderId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar status das reposições');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Atualizar o pedido com as informações de reposição
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, reprocessRequests: data.reprocessRequests || [] }
              : order
          )
        );
      }
    } catch (error) {
      console.error('Erro ao buscar status das reposições:', error);
    } finally {
      // Resetar estado de carregamento
      setLoadingReprocessStatus(prev => ({ ...prev, [orderId]: false }));
    }
  };
  
  // Formatar status de reposição
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
  
  // Obter cor para status de reposição
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

  // Função para solicitar reposição de um pedido
  const handleRequestReprocess = async (orderId: string) => {
    // Evitar múltiplas requisições simultâneas
    if (processingOrders[orderId]) return;
    
    // Atualizar estado de processamento
    setProcessingOrders(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await fetch(`/api/payment-reprocess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentRequestId: orderId,
          reason: 'Solicitação de reposição pelo cliente'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Não foi possível solicitar a reposição');
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Sua solicitação de reposição foi enviada com sucesso e será analisada em breve.');
        
        // Buscar status das reposições após enviar a solicitação
        setTimeout(() => {
          fetchReprocessStatus(orderId);
        }, 500);
      } else {
        throw new Error(data.error || 'Erro ao solicitar reposição');
      }
    } catch (error) {
      console.error('Erro ao solicitar reposição:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao solicitar reposição.');
    } finally {
      // Resetar estado de processamento
      setProcessingOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };
  
  // Verificar se o pedido foi concluído há menos de 30 dias
  const isWithin30Days = (dateString: string): boolean => {
    const orderDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - orderDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 30;
  };
  
  return (
    <Box minH="100vh" display="flex" flexDir="column">
      <ViralizamosHeader />
      
      <Box flex="1" bg={bgColor} py={12}>
        <Container maxW="container.md">
          <VStack spacing={6} align="stretch">
            <Heading as="h1" size="xl" mb={6}>
              Acompanhar Pedido
            </Heading>
            
            <Card bg={cardBgColor} shadow="sm" borderRadius="lg" mb={8}>
              <CardBody p={6}>
                <form onSubmit={handleSearchOrders}>
                  <FormControl id="email">
                    <FormLabel fontWeight="medium">Email</FormLabel>
                    <Flex>
                      <Input
                        type="email"
                        placeholder="Digite seu email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        mr={2}
                        fontSize="md"
                        size="lg"
                      />
                      <Button
                        type="submit"
                        colorScheme="primary"
                        isLoading={isSubmitting}
                        loadingText="Buscando..."
                        size="lg"
                        minWidth="110px"
                        height="46px"
                      >
                        Buscar
                      </Button>
                    </Flex>
                  </FormControl>
                </form>
              </CardBody>
            </Card>
            
            {searched && userData && (
              <Box p={4} bg="blue.50" borderRadius="md" mb={4}>
                <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align="center">
                  <Box>
                    <Text fontSize="md" fontWeight="bold">Olá, {userData.name}!</Text>
                    <Text fontSize="sm" color="gray.600">{userData.email}</Text>
                  </Box>
                </Flex>
              </Box>
            )}
            
            {searched && filteredOrders.length > 0 && (
              <Box mt={8}>
                <Flex 
                  direction={{ base: "column", md: "row" }} 
                  justify="space-between" 
                  align={{ base: "flex-start", md: "center" }} 
                  mb={6}
                  gap={4}
                >
                  <Box>
                    <Heading as="h2" size="md">Seus Pedidos</Heading>
                    <Text color="gray.600" mt={1} fontSize="sm">
                      Lista de todos os seus pedidos realizados
                    </Text>
                  </Box>
                  
                  <Stack 
                    direction={{ base: "column", sm: "row" }} 
                    spacing={3} 
                    width={{ base: "100%", md: "auto" }}
                    wrap={{ base: "wrap", md: "nowrap" }}
                  >
                    <Input
                      placeholder="Buscar pedidos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      size="md"
                      width={{ base: "full", sm: "auto" }}
                      minWidth={{ sm: "180px" }}
                    />
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      size="md"
                      minWidth={{ sm: "150px" }}
                    >
                      <option value="all">Todos os status</option>
                      <option value="pending">Pendente</option>
                      <option value="processing">Processando</option>
                      <option value="completed">Concluído</option>
                      <option value="failed">Falhou</option>
                      <option value="canceled">Cancelado</option>
                    </Select>
                    <Button
                      leftIcon={<RefreshCw size={18} />}
                      colorScheme="blue"
                      variant="solid"
                      onClick={() => handleSearchOrders()}
                      isLoading={isSubmitting}
                      size="md"
                      px={4}
                      minWidth="110px"
                      iconSpacing={2}
                      height="40px"
                    >
                      Atualizar
                    </Button>
                  </Stack>
                </Flex>
                
                <VStack spacing={4} align="stretch">
                  {filteredOrders.map((order) => (
                    <Card key={order.id} overflow="hidden" variant="outline">
                      <CardHeader
                        bg={useColorModeValue('gray.50', 'gray.700')}
                        py={3}
                        px={4}
                      >
                        <Flex justifyContent="space-between" alignItems="center">
                          <HStack spacing={2}>
                            <Text fontWeight="bold" fontSize="sm" color="gray.700">
                              Pedido: #VP-{order.token.substring(0, 8)}
                            </Text>
                            <Badge
                              colorScheme={
                                order.status === 'completed'
                                  ? 'green'
                                  : order.status === 'pending'
                                  ? 'yellow'
                                  : order.status === 'processing'
                                  ? 'blue'
                                  : 'red'
                              }
                            >
                              {getOrderStatusBadge(order.status)}
                            </Badge>
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            {formatDate(order.created_at)}
                          </Text>
                        </Flex>
                      </CardHeader>
                      
                      <CardBody py={4} px={4}>
                        <Grid
                          templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                          gap={4}
                        >
                          <GridItem>
                            <VStack align="flex-start" spacing={1}>
                              <Text fontSize="sm" color="gray.500">Serviço</Text>
                              <Text fontWeight="medium">{order.service_name}</Text>
                            </VStack>
                          </GridItem>
                          
                          <GridItem>
                            <VStack align="flex-start" spacing={1}>
                              <Text fontSize="sm" color="gray.500">Perfil</Text>
                              <Text fontWeight="medium">{order.profile_username || 'Não especificado'}</Text>
                            </VStack>
                          </GridItem>
                          
                          <GridItem>
                            <VStack align="flex-start" spacing={1}>
                              <Text fontSize="sm" color="gray.500">Valor</Text>
                              <Text fontWeight="medium">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(order.amount)}
                              </Text>
                            </VStack>
                          </GridItem>
                          
                          <GridItem>
                            <VStack align="flex-start" spacing={1}>
                              <Text fontSize="sm" color="gray.500">Método de pagamento</Text>
                              <Text fontWeight="medium">
                                {order.transaction?.method 
                                  ? order.transaction.method === 'pix' 
                                    ? 'PIX' 
                                    : order.transaction.method.charAt(0).toUpperCase() + order.transaction.method.slice(1)
                                  : 'Não informado'}
                              </Text>
                            </VStack>
                          </GridItem>
                          
                          <GridItem>
                            <VStack align="flex-start" spacing={1}>
                              <Text fontSize="sm" color="gray.500">Detalhes</Text>
                              <Text fontWeight="medium">
                                {order.formatted_posts 
                                  ? `${order.formatted_posts.length} ${order.formatted_posts.length === 1 ? 'post' : 'posts'} com total de ${order.formatted_posts.reduce((total, post) => total + (post.quantity || 0), 0)} ${order.service_name.toLowerCase().includes('curtida') ? 'curtidas' : 'visualizações'}`
                                  : 'Não disponível'}
                              </Text>
                            </VStack>
                          </GridItem>
                        </Grid>
                        
                        {/* Exibir status de reposição se houver */}
                        {order.reprocessRequests && order.reprocessRequests.length > 0 && (
                          <Box mt={4} p={3} bg="gray.50" borderRadius="md">
                            <Text fontSize="sm" fontWeight="medium" mb={2}>
                              Reposições solicitadas: {order.reprocessRequests.length}
                            </Text>
                            <HStack spacing={2} flexWrap="wrap">
                              {order.reprocessRequests.slice(0, 3).map((request, index) => (
                                <Badge 
                                  key={request.id} 
                                  colorScheme={getReprocessStatusColor(request.status)}
                                  variant="subtle"
                                  py={1}
                                  px={2}
                                >
                                  #{index + 1}: {formatReprocessStatus(request.status)}
                                </Badge>
                              ))}
                              {order.reprocessRequests.length > 3 && (
                                <Badge colorScheme="gray">
                                  +{order.reprocessRequests.length - 3} mais
                                </Badge>
                              )}
                            </HStack>
                          </Box>
                        )}
                        
                        {order.transaction && (
                          <>
                            <Divider my={4} />
                            <Text fontSize="sm" fontWeight="medium" mb={2}>
                              Informações do pagamento
                            </Text>
                            <Grid
                              templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                              gap={3}
                            >
                              <GridItem>
                                <HStack>
                                  <Text fontSize="xs" color="gray.500">Status:</Text>
                                  <Badge
                                    colorScheme={
                                      order.transaction.status === 'approved'
                                        ? 'green'
                                        : order.transaction.status === 'pending'
                                        ? 'yellow'
                                        : order.transaction.status === 'processing'
                                        ? 'blue'
                                        : 'red'
                                    }
                                    fontSize="xs"
                                  >
                                    {order.transaction.status === 'approved' 
                                      ? 'Aprovado' 
                                      : order.transaction.status === 'pending'
                                      ? 'Pendente'
                                      : order.transaction.status === 'processing'
                                      ? 'Processando'
                                      : order.transaction.status === 'payment not approved'
                                      ? 'Não Pago'
                                      : order.transaction.status === 'cancelled'
                                      ? 'Erro'
                                      : order.transaction.status}
                                  </Badge>
                                </HStack>
                              </GridItem>
                              
                              <GridItem>
                                <HStack>
                                  <Text fontSize="xs" color="gray.500">Processado:</Text>
                                  <Text fontSize="xs">
                                    {order.transaction.processed_at 
                                      ? formatDate(order.transaction.processed_at)
                                      : 'Não processado'}
                                  </Text>
                                </HStack>
                              </GridItem>
                            </Grid>
                          </>
                        )}
                        
                        <Flex 
                          justify="flex-end" 
                          mt={4} 
                          flexWrap={{ base: "wrap", md: "nowrap" }}
                          gap={2}
                        >
                          <Button
                            as={Link}
                            href={`/acompanhar/${order.token}`}
                            size="md"
                            colorScheme="blue"
                            variant="outline"
                            height="38px"
                            minWidth={{ base: "100%", sm: "110px" }}
                            flexGrow={{ base: 1, sm: 0 }}
                            px={4}
                            mb={{ base: 2, sm: 0 }}
                          >
                            Ver detalhes
                          </Button>
                          
                          {order.transaction && order.transaction.status === 'approved' && (
                            <Button
                              as={Link}
                              href={`/api/payment-requests/${order.token}/receipt`}
                              target="_blank"
                              size="md"
                              colorScheme="green"
                              variant="outline"
                              height="38px"
                              px={4}
                              minWidth={{ base: "100%", sm: "auto" }}
                              flexGrow={{ base: 1, sm: 0 }}
                              mb={{ base: 2, sm: 0 }}
                            >
                              Recibo
                            </Button>
                          )}
                          
                          {order.status === 'completed' && (
                            <>
                              {/* Botão para buscar status de reposição, apenas se houver reposições e ainda não foram buscadas */}
                              {order.reprocessRequests && order.reprocessRequests.length > 0 && !loadingReprocessStatus[order.id] && (
                                <Button
                                  size="sm"
                                  colorScheme="gray"
                                  variant="ghost"
                                  height="38px"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    fetchReprocessStatus(order.id);
                                  }}
                                  minWidth={{ base: "100%", sm: "auto" }}
                                  flexGrow={{ base: 1, sm: 0 }}
                                  mb={{ base: 2, sm: 0 }}
                                >
                                  Ver reposições
                                </Button>
                              )}
                              
                              {/* Botão de solicitar reposição (apenas se dentro de 30 dias e não há reposição pendente) */}
                              {isWithin30Days(order.created_at) && (
                                !order.reprocessRequests || 
                                !order.reprocessRequests.some(r => r.status === 'pending' || r.status === 'processing')
                              ) && (
                                <Button
                                  size="md"
                                  colorScheme="purple"
                                  variant="outline"
                                  height="38px"
                                  minWidth={{ base: "100%", sm: "110px" }}
                                  flexGrow={{ base: 1, sm: 0 }}
                                  px={4}
                                  isLoading={processingOrders[order.id] || false}
                                  loadingText="Enviando..."
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleRequestReprocess(order.id);
                                  }}
                                >
                                  Solicitar Reposição
                                </Button>
                              )}
                            </>
                          )}
                          
                          {order.transaction && (order.transaction.status === 'cancelled' || order.transaction.status === 'canceled') && (
                            <Button
                              as="a"
                              href="https://wa.me/5562999915390"
                              target="_blank"
                              size="md"
                              colorScheme="green"
                              variant="solid"
                              height="38px"
                              px={4}
                              minWidth={{ base: "100%", sm: "auto" }}
                              flexGrow={{ base: 1, sm: 0 }}
                              mb={{ base: 2, sm: 0 }}
                              leftIcon={<MessageCircle size={18} />}
                            >
                              Pedir Ajuda
                            </Button>
                          )}
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </Box>
            )}
            
            {searched && orders.length === 0 && (
              <Box textAlign="center" py={10}>
                <Heading as="h3" size="md" mb={3}>
                  Nenhum pedido encontrado
                </Heading>
                <Text color="gray.600">
                  Não encontramos pedidos associados a este email. Verifique se digitou o email corretamente.
                </Text>
              </Box>
            )}
          </VStack>
        </Container>
      </Box>
      
      <ViralizamosFooter />
    </Box>
  );
} 