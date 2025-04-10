'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/ui/Header';
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
}

export default function AcompanharPedidoPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [userData, setUserData] = useState<any>(null);
  
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
  
  return (
    <Box minH="100vh" display="flex" flexDir="column">
      <Header />
      
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
                  
                  <Stack direction={{ base: "column", sm: "row" }} spacing={2}>
                    <Input
                      placeholder="Buscar pedidos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      size="md"
                      width={{ base: "full", sm: "auto" }}
                    />
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      size="md"
                    >
                      <option value="all">Todos os status</option>
                      <option value="pending">Pendente</option>
                      <option value="processing">Processando</option>
                      <option value="completed">Concluído</option>
                      <option value="failed">Falhou</option>
                      <option value="canceled">Cancelado</option>
                    </Select>
                    <Button
                      leftIcon={<RefreshCw size={16} />}
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => handleSearchOrders()}
                      isLoading={isSubmitting}
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
                              Pedido: {order.token.substring(0, 16)}...
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
                        </Grid>
                        
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
                        
                        <Flex justify="flex-end" mt={4}>
                          <Button
                            as={Link}
                            href={`/acompanhar/${order.token}`}
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                          >
                            Ver detalhes
                          </Button>
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
    </Box>
  );
} 