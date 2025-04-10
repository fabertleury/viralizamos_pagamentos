'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Header } from '@/components/ui/Header';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  Flex,
  Badge,
  Card,
  CardBody,
  Icon,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';
import Link from 'next/link';

interface PaymentInfo {
  id: string;
  token: string;
  amount: number;
  service_name: string;
  profile_username: string;
  customer_name: string;
  customer_email: string;
  status: string;
  created_at: string;
}

export default function AgradecimentoPage() {
  const params = useParams();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  
  // Buscar informações do pagamento
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (!params.token) {
        setError('Token de pagamento não encontrado');
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/payment-status?token=${params.token}`);
        
        if (!response.ok) {
          throw new Error('Não foi possível carregar as informações do pagamento');
        }
        
        const data = await response.json();
        setPayment({
          id: data.transaction?.id || '',
          token: params.token as string,
          amount: data.payment?.amount || 0,
          service_name: data.payment?.service || 'Serviço',
          profile_username: data.payment?.profile || '',
          customer_name: data.customer?.name || '',
          customer_email: data.customer?.email || '',
          status: data.payment_status || 'pending',
          created_at: data.payment?.created_at || new Date().toISOString()
        });
      } catch (err) {
        console.error('Erro ao buscar informações do pagamento:', err);
        setError('Não foi possível carregar as informações do pagamento');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPaymentInfo();
  }, [params.token]);
  
  // Formatar valor em reais
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  return (
    <Box minH="100vh" display="flex" flexDir="column" bg={bgColor}>
      <Header />
      
      <Container maxW="container.md" py={12} flex="1">
        {loading ? (
          <Flex justify="center" align="center" minH="300px">
            <Box className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </Flex>
        ) : error ? (
          <Card bg={cardBgColor} shadow="md" borderRadius="lg" p={6}>
            <CardBody>
              <VStack spacing={6} align="center">
                <Icon as={CheckCircle} boxSize={16} color="red.500" />
                <Heading size="lg" textAlign="center">Ops! Algo deu errado</Heading>
                <Text textAlign="center">{error}</Text>
                <Button as={Link} href="/" colorScheme="primary" size="lg">
                  Voltar para a página inicial
                </Button>
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <VStack spacing={8} align="stretch">
            <Card bg={cardBgColor} shadow="md" borderRadius="lg" overflow="hidden">
              <Box bg="green.500" py={6} px={4}>
                <VStack spacing={4} align="center">
                  <Icon as={CheckCircle} boxSize={16} color="white" />
                  <Heading color="white" size="lg" textAlign="center">
                    Recebemos seu pagamento!
                  </Heading>
                  <Text color="white" textAlign="center">
                    Obrigado por escolher nossos serviços.
                  </Text>
                  <Badge colorScheme="green" py={1} px={3} fontSize="md">
                    Pedido #{payment?.token.substring(0, 8)}
                  </Badge>
                </VStack>
              </Box>
              
              <CardBody p={8}>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={4}>Detalhes do Pedido</Heading>
                    <Divider mb={4} />
                    
                    <VStack spacing={4} align="stretch">
                      <Flex justify="space-between">
                        <Text color="gray.600">Serviço:</Text>
                        <Text fontWeight="bold">{payment?.service_name}</Text>
                      </Flex>
                      
                      {payment?.profile_username && (
                        <Flex justify="space-between">
                          <Text color="gray.600">Perfil:</Text>
                          <Text fontWeight="bold">{payment.profile_username}</Text>
                        </Flex>
                      )}
                      
                      <Flex justify="space-between">
                        <Text color="gray.600">Valor:</Text>
                        <Text fontWeight="bold">{formatCurrency(payment?.amount || 0)}</Text>
                      </Flex>
                      
                      <Flex justify="space-between">
                        <Text color="gray.600">Status:</Text>
                        <Badge colorScheme="green">Aprovado</Badge>
                      </Flex>
                    </VStack>
                  </Box>
                  
                  <Divider />
                  
                  <Box>
                    <Heading size="md" mb={4}>O que acontece agora?</Heading>
                    <VStack spacing={4} align="stretch">
                      <Text>1. Nossa equipe iniciará o processamento do seu pedido em breve.</Text>
                      <Text>2. Você receberá atualizações por e-mail sobre o status do seu pedido.</Text>
                      <Text>3. Você pode acompanhar seu pedido a qualquer momento através do link abaixo.</Text>
                    </VStack>
                  </Box>
                  
                  <Box textAlign="center" mt={4}>
                    <Button
                      as={Link}
                      href={`/acompanhar/${payment?.token}`}
                      colorScheme="blue"
                      size="lg"
                      width={{ base: "full", md: "auto" }}
                    >
                      Acompanhar meu pedido
                    </Button>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
            
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.500">
                Caso tenha alguma dúvida, entre em contato com nosso suporte através do e-mail{' '}
                <Link href="mailto:suporte@viralizamos.com" style={{ color: '#3182CE' }}>
                  suporte@viralizamos.com
                </Link>
              </Text>
            </Box>
          </VStack>
        )}
      </Container>
    </Box>
  );
} 