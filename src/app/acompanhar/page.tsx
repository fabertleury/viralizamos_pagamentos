'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  
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
            
            {searched && orders.length > 0 && (
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
                      <option value="partial">Parcial</option>
                      <option value="failed">Falhou</option>
                      <option value="canceled">Cancelado</option>
                    </Select>
                  </Stack>
                </Flex>
                
                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
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
                      <Card 
                        key={order.id} 
                        bg={cardBgColor}
                        borderRadius="lg" 
                        overflow="hidden" 
                        borderWidth="1px"
                        borderColor="gray.100"
                        transition="box-shadow 0.3s"
                        _hover={{ shadow: "lg" }}
                      >
                        <CardHeader bg="gray.50" px={4} py={2} display="flex" justifyContent="space-between" alignItems="center">
                          <Flex alignItems="center">
                            <Text fontSize="xs" fontWeight="medium" color="gray.500" mr={2}>
                              Status do pedido:
                            </Text>
                            <Badge variant={getStatusVariant(order.status || 'pending')}>
                              {getOrderStatusBadge(order.status || 'pending')}
                            </Badge>
                          </Flex>
                          <Text fontSize="xs" color="gray.500">
                            {formatDate(order.created_at)}
                          </Text>
                        </CardHeader>
                        
                        <CardBody p={4}>
                          <VStack align="stretch" spacing={3}>
                            <Flex justify="space-between">
                              <Text fontSize="sm" fontWeight="semibold" color="gray.700">ID do Pedido:</Text>
                              <Text fontSize="sm" color="gray.900">{order.external_order_id || order.id}</Text>
                            </Flex>
                            
                            <Flex justify="space-between">
                              <Text fontSize="sm" fontWeight="semibold" color="gray.700">Serviço:</Text>
                              <Text fontSize="sm" color="gray.900">{order.service?.name || 'Não especificado'}</Text>
                            </Flex>
                            
                            {order.target_username && (
                              <Flex justify="space-between">
                                <Text fontSize="sm" fontWeight="semibold" color="gray.700">Usuário:</Text>
                                <Text fontSize="sm" color="gray.900">@{order.target_username}</Text>
                              </Flex>
                            )}
                            
                            <Flex justify="space-between">
                              <Text fontSize="sm" fontWeight="semibold" color="gray.700">Quantidade:</Text>
                              <Text fontSize="sm" color="gray.900">{order.quantity || 'Não especificado'}</Text>
                            </Flex>
                            
                            {order.amount && (
                              <Flex justify="space-between">
                                <Text fontSize="sm" fontWeight="semibold" color="gray.700">Valor:</Text>
                                <Text fontSize="sm" color="gray.900">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.amount)}
                                </Text>
                              </Flex>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                </Grid>
              </Box>
            )}
            
            {searched && orders.length === 0 && !isSubmitting && (
              <Card bg={cardBgColor} shadow="sm" borderRadius="lg" mb={8} p={6} textAlign="center">
                <CardBody>
                  <Text color="gray.700" mb={4}>Nenhum pedido encontrado para este e-mail.</Text>
                  <Text color="gray.600" fontSize="sm">
                    Se você realizou uma compra recentemente, verifique se utilizou o mesmo e-mail informado.
                  </Text>
                </CardBody>
              </Card>
            )}
            
            {!searched && (
              <Card bg={cardBgColor} borderRadius="lg" shadow="md" p={6} w="full" mt={8}>
                <CardBody>
                  <Heading as="h2" size="md" color="gray.700" mb={4}>
                    Não tem o email?
                  </Heading>
                  <Text color="gray.600" mb={4}>
                    Se você não lembra qual e-mail utilizou para compra, entre em contato conosco pelo WhatsApp para obter ajuda.
                  </Text>
                  
                  <Button
                    as="a"
                    href="https://wa.me/5562999915390"
                    target="_blank"
                    rel="noopener noreferrer"
                    leftIcon={
                      <Box as="svg" width="20px" height="20px" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.6 6.3c-1.4-1.5-3.3-2.3-5.4-2.3-4.2 0-7.6 3.4-7.6 7.6 0 1.3 0.3 2.6 1 3.8l-1.1 4 4.1-1.1c1.1 0.6 2.4 0.9 3.7 0.9 4.2 0 7.6-3.4 7.6-7.6 0-2-0.8-3.9-2.3-5.3zm-5.4 11.7c-1.1 0-2.3-0.3-3.3-0.9l-0.2-0.1-2.4 0.6 0.6-2.3-0.1-0.2c-0.6-1-0.9-2.2-0.9-3.4 0-3.5 2.8-6.3 6.3-6.3 1.7 0 3.3 0.7 4.5 1.9s1.9 2.8 1.9 4.5c0 3.5-2.9 6.2-6.4 6.2zm3.5-4.7c-0.2-0.1-1.1-0.6-1.3-0.6-0.2-0.1-0.3-0.1-0.4 0.1-0.1 0.2-0.5 0.6-0.6 0.8-0.1 0.1-0.2 0.1-0.4 0-0.2-0.1-0.8-0.3-1.5-0.9-0.6-0.5-0.9-1.1-1-1.3-0.1-0.2 0-0.3 0.1-0.4 0.1-0.1 0.2-0.2 0.3-0.3 0.1-0.1 0.1-0.2 0.2-0.3 0.1-0.1 0-0.2 0-0.3 0-0.1-0.4-1.1-0.6-1.4-0.2-0.4-0.3-0.3-0.5-0.3h-0.3c-0.1 0-0.3 0-0.5 0.2-0.2 0.2-0.7 0.7-0.7 1.7s0.7 1.9 0.8 2.1c0.1 0.1 1.4 2.1 3.3 2.9 0.5 0.2 0.8 0.3 1.1 0.4 0.5 0.1 0.9 0.1 1.2 0.1 0.4-0.1 1.1-0.5 1.3-0.9 0.2-0.5 0.2-0.9 0.1-0.9-0.1-0.1-0.2-0.1-0.4-0.2z" />
                      </Box>
                    }
                    colorScheme="green"
                    size="md"
                  >
                    Suporte via WhatsApp
                  </Button>
                </CardBody>
              </Card>
            )}
          </VStack>
        </Container>
      </Box>
    </Box>
  );
} 