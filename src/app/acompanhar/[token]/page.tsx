'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Header } from '@/components/ui/Header';
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
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  useSteps,
  Select,
  FormControl,
  FormLabel,
  useToast,
  useColorModeValue,
  Spacer,
  Skeleton
} from '@chakra-ui/react';
import { ArrowLeft, RefreshCw, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
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

interface OrderDetails {
  id: string;
  token: string;
  status: string;
  service_name: string;
  profile_username: string;
  amount: number;
  description: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_email: string;
  transaction: TransactionData | null;
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

// Definir os passos do pedido
const steps = [
  { title: 'Pagamento Confirmado', description: 'O pagamento foi recebido' },
  { title: 'Processando', description: 'Seu pedido está sendo processado' },
  { title: 'Concluído', description: 'Serviço entregue com sucesso' },
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  // Obter índice do passo atual baseado no status do pedido
  const getStepIndex = (status: string): number => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 2;
      case 'processing':
      case 'in progress':
        return 1;
      case 'approved':
      case 'paid':
        return 0;
      default:
        return -1;
    }
  };

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
        return 'Cancelado';
      default:
        return status || 'Desconhecido';
    }
  };

  // Buscar detalhes do pedido
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!params.token) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/payment-requests/${params.token}`);
        
        if (!response.ok) {
          throw new Error('Não foi possível carregar os detalhes do pedido');
        }
        
        const data = await response.json();
        
        if (data.paymentRequest) {
          setOrder(data.paymentRequest);
          setNewStatus(data.paymentRequest.status);
        } else {
          throw new Error('Pedido não encontrado');
        }
      } catch (err) {
        console.error('Erro ao buscar detalhes do pedido:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os detalhes do pedido.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [params.token, toast]);

  // Atualizar status do pedido
  const handleUpdateStatus = async () => {
    if (!order || newStatus === order.status) return;
    
    setUpdatingStatus(true);
    
    try {
      const response = await fetch(`/api/payment-requests/${params.token}/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Não foi possível atualizar o status do pedido');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOrder(prev => prev ? { ...prev, status: newStatus } : null);
        toast({
          title: 'Status atualizado',
          description: 'O status do pedido foi atualizado com sucesso.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(data.error || 'Erro ao atualizar status');
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao atualizar status do pedido.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Índice do passo atual na stepper
  const { activeStep } = useSteps({
    index: order ? getStepIndex(order.status) : -1,
    count: steps.length,
  });

  return (
    <Box minH="100vh" display="flex" flexDir="column" bg={bgColor}>
      <Header />
      
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
              Não foi possível carregar os detalhes do pedido. Por favor, tente novamente mais tarde.
            </Text>
            <Button as={Link} href="/acompanhar" colorScheme="blue">
              Voltar para lista de pedidos
            </Button>
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
                Pedido #{order.token.substring(0, 8)}
              </Text>
              <Spacer />
              <Text fontSize="sm" color="gray.500">
                {formatDate(order.created_at)}
              </Text>
            </HStack>

            {activeStep >= 0 && (
              <Box mb={8}>
                <Stepper index={activeStep} colorScheme="green" size="lg">
                  {steps.map((step, index) => (
                    <Step key={index}>
                      <StepIndicator>
                        <StepStatus
                          complete={<StepIcon />}
                          incomplete={<StepNumber />}
                          active={<StepNumber />}
                        />
                      </StepIndicator>
                      <Box flexShrink="0">
                        <StepTitle>{step.title}</StepTitle>
                        <StepDescription>{step.description}</StepDescription>
                      </Box>
                      <StepSeparator />
                    </Step>
                  ))}
                </Stepper>
              </Box>
            )}

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
                    </Grid>
                    
                    {order.description && (
                      <>
                        <Divider my={4} />
                        <VStack align="flex-start" spacing={1}>
                          <Text fontSize="sm" color="gray.500">Descrição</Text>
                          <Text>{order.description}</Text>
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
                
                <Card bg={cardBg} shadow="md" borderRadius="lg" borderColor={borderColor}>
                  <CardHeader pb={2}>
                    <Heading size="md">Ações</Heading>
                  </CardHeader>
                  
                  <CardBody>
                    <VStack spacing={4}>
                      <FormControl>
                        <FormLabel>Atualizar status</FormLabel>
                        <Select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                        >
                          <option value="pending">Pendente</option>
                          <option value="processing">Processando</option>
                          <option value="completed">Concluído</option>
                          <option value="cancelled">Cancelado</option>
                          <option value="failed">Falhou</option>
                        </Select>
                      </FormControl>
                      
                      <Button
                        colorScheme="blue"
                        width="full"
                        leftIcon={<RefreshCw size={16} />}
                        isLoading={updatingStatus}
                        loadingText="Atualizando..."
                        onClick={handleUpdateStatus}
                        isDisabled={newStatus === order.status}
                      >
                        Atualizar Status
                      </Button>
                      
                      <Button
                        as={Link}
                        href={`/api/payment-requests/${order.token}/receipt`}
                        target="_blank"
                        colorScheme="green"
                        variant="outline"
                        width="full"
                      >
                        Gerar Recibo
                      </Button>
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