'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import Confetti from 'react-confetti';
import Image from 'next/image';
import { Header } from '@/components/ui/Header';
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Button,
  Stack,
  VStack,
  HStack,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Divider,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';

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
    <Suspense fallback={
      <Flex minH="100vh" align="center" justify="center">
        <Spinner size="xl" thickness="4px" speed="0.65s" emptyColor="gray.200" color="primary.500" />
        <Text ml={4} fontSize="xl" fontWeight="medium">Carregando...</Text>
      </Flex>
    }>
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

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');

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
      <Box minH="100vh" display="flex" flexDir="column">
        <Header />
        <Flex flex="1" align="center" justify="center" p={4}>
          <VStack>
            <Spinner size="xl" thickness="4px" color="primary.500" mb={4} />
            <Heading size="lg">Carregando...</Heading>
          </VStack>
        </Flex>
      </Box>
    );
  }

  if (error) {
    return (
      <Box minH="100vh" display="flex" flexDir="column">
        <Header />
        <Flex flex="1" align="center" justify="center" p={4}>
          <VStack maxW="md" w="full" textAlign="center">
            <Alert status="error" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" borderRadius="lg" mb={4}>
              <AlertIcon boxSize="40px" mr={0} />
              <AlertTitle mt={4} mb={1} fontSize="lg">Erro!</AlertTitle>
              <AlertDescription maxWidth="sm">{error}</AlertDescription>
            </Alert>
            <Button as={Link} href="/" colorScheme="primary" variant="link">
              Voltar para a página inicial
            </Button>
          </VStack>
        </Flex>
      </Box>
    );
  }

  return (
    <Box minH="100vh" display="flex" flexDir="column">
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
      
      <Box flex="1" bg={bgColor} py={12}>
        <Container maxW="container.md" centerContent>
          <Card maxW="md" w="full" bg={cardBgColor} shadow="xl" borderRadius="lg" overflow="hidden">
            <CardBody p={8}>
              <VStack spacing={6}>
                <Box bg="green.100" p={3} borderRadius="full">
                  <Box as="svg" h={12} w={12} color="green.500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </Box>
                </Box>
                
                <Heading textAlign="center" size="lg" color="gray.900">
                  Pagamento Aprovado!
                </Heading>
                
                <Text textAlign="center" color="gray.600">
                  Seu pedido foi confirmado e está sendo processado.
                </Text>
                
                {transaction && (
                  <Card bg="gray.50" borderRadius="lg" w="full" mb={6}>
                    <CardHeader pb={0}>
                      <Heading size="md" color="gray.900">Detalhes do Pedido</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        {customer && customer.name && (
                          <Flex justify="space-between" borderBottom="1px" borderColor="gray.200" pb={2}>
                            <Text color="gray.600" fontWeight="medium">Cliente:</Text>
                            <Text fontWeight="medium">{customer.name}</Text>
                          </Flex>
                        )}
                        {customer && customer.email && (
                          <Flex justify="space-between" borderBottom="1px" borderColor="gray.200" pb={2}>
                            <Text color="gray.600" fontWeight="medium">Email:</Text>
                            <Text fontWeight="medium">{customer.email}</Text>
                          </Flex>
                        )}
                        <Flex justify="space-between" borderBottom="1px" borderColor="gray.200" pb={2}>
                          <Text color="gray.600" fontWeight="medium">ID da Transação:</Text>
                          <Text fontWeight="medium">{transaction.payment_id || transaction.external_id || transaction.id}</Text>
                        </Flex>
                        <Flex justify="space-between" borderBottom="1px" borderColor="gray.200" pb={2}>
                          <Text color="gray.600" fontWeight="medium">Valor:</Text>
                          <Text fontWeight="medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(transaction.amount)}
                          </Text>
                        </Flex>
                        <Flex justify="space-between" borderBottom="1px" borderColor="gray.200" pb={2}>
                          <Text color="gray.600" fontWeight="medium">Data:</Text>
                          <Text fontWeight="medium">
                            {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                          </Text>
                        </Flex>
                        <Flex justify="space-between">
                          <Text color="gray.600" fontWeight="medium">Status:</Text>
                          <Text fontWeight="medium" color="green.600">Aprovado</Text>
                        </Flex>
                      </VStack>
                    </CardBody>
                  </Card>
                )}
                
                <Stack direction={{ base: "column", sm: "row" }} spacing={4} w="full">
                  <Button
                    as="a"
                    href="https://viralizamos.com"
                    colorScheme="primary"
                    size="lg"
                    flex="1"
                    shadow="sm"
                  >
                    Voltar para a página inicial
                  </Button>
                  
                  <Button
                    as={Link}
                    href={customer && customer.email ? `/acompanhar?email=${encodeURIComponent(customer.email)}` : "/acompanhar"}
                    variant="outline"
                    colorScheme="primary"
                    size="lg"
                    flex="1"
                  >
                    Acompanhar pedido
                  </Button>
                </Stack>
              </VStack>
            </CardBody>
          </Card>
        </Container>
      </Box>
    </Box>
  );
} 