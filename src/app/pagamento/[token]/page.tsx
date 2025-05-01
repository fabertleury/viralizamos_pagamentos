"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import Script from 'next/script';
import ClarityCartTracker from '@/components/ClarityCartTracker';
import { 
  Box, 
  Container,
  Grid, 
  GridItem, 
  Heading, 
  Text, 
  Card, 
  CardBody, 
  CardHeader, 
  Stack, 
  Divider, 
  Button, 
  Flex, 
  Image as ChakraImage, 
  Avatar, 
  HStack, 
  VStack, 
  Progress, 
  Badge, 
  Input, 
  FormControl, 
  FormLabel,
  Link,
  Icon,
  SkeletonText,
  useClipboard,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaHeart, FaCopy, FaInfoCircle, FaTag, FaInstagram, FaCheck, FaQrcode, FaClock } from 'react-icons/fa';
import ViralizamosHeader from '@/components/layout/ViralizamosHeader';
import { ViralizamosFooter } from '@/components/layout/ViralizamosFooter';
import PixPaymentButton from '@/components/PixPaymentButton';

// Definir interfaces para os tipos de dados
interface PaymentRequest {
  id: string;
  token: string;
  status: string;
  created_at: string;
  amount: number;
  quantity: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  instagram_username: string;
  posts: Post[];
  service_name: string;
  qr_code_image: string;
  pix_code: string;
  pix_key: string;
  expires_at: string;
  payment?: {
    id: string;
    status: string;
    method: string;
    pix_code: string;
    pix_qrcode: string;
    amount: number;
  };
  return_url?: string;
}

interface Post {
  id: string;
  url: string;
  media_type: string;
  thumbnail_url?: string;
  image_url?: string;
  caption?: string;
  quantity: number;
}

// Função para resolver problemas de CORS com imagens externas do Instagram
const getProxyImageUrl = (url: string | undefined) => {
  if (!url) return null;
  
  // Se a URL contiver scontent-*.cdninstagram.com, usar um proxy de imagens
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
  }
  
  return url;
};

// Atualizar o cálculo da quantidade por post quando são selecionados múltiplos posts
// Se houver múltiplos posts, a quantidade total deve ser dividida entre eles
const calculatePostQuantity = (payment: PaymentRequest, postIndex: number) => {
  if (!payment || !payment.posts || payment.posts.length === 0) return 0;
  
  // Se há apenas um post, mostra o total
  if (payment.posts.length === 1) return payment.quantity;
  
  // Se há quantidade específica no post, usa ela
  if (payment.posts[postIndex].quantity) return payment.posts[postIndex].quantity;
  
  // Distribuir a quantidade total entre os posts de forma idêntica ao frontend principal
  const totalPosts = payment.posts.length;
  const totalQuantity = payment.quantity;
  
  // Caso específico para 500 curtidas em 3 posts (distribuição 167, 167, 166)
  if (totalPosts === 3 && totalQuantity === 500) {
    if (postIndex === 0 || postIndex === 1) {
      return 167; // Primeiro e segundo posts recebem 167
    } else {
      return 166; // Terceiro post recebe 166
    }
  }
  
  // Para outros casos, calcular uma distribuição equitativa
  const baseQuantity = Math.floor(totalQuantity / totalPosts);
  const remainder = totalQuantity % totalPosts;
  
  // Distribuir o resto entre os primeiros N posts
  if (postIndex < remainder) {
    return baseQuantity + 1;
  } else {
    return baseQuantity;
  }
};

export default function PaymentPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const toast = useToast();
  
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(1800); // 30 minutos em segundos
  const [formattedTime, setFormattedTime] = useState<string>('30:00');
  const [verifyingPayment, setVerifyingPayment] = useState<boolean>(false);
  
  // Estado para o diálogo de confirmação de pagamento
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  
  const pixCode = payment?.payment?.pix_code || '';
  const { hasCopied, onCopy } = useClipboard(pixCode);
  
  // Novas variáveis para estilo
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Formatar o tempo restante
  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Copiar código PIX
  const handleCopyPixCode = () => {
    onCopy();
  };
  
  // Buscar os dados de pagamento
  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/payment-request/${token}`);
        
        if (!response.ok) {
          throw new Error('Pagamento não encontrado ou já expirado');
        }
        
        const data = await response.json();
        setPayment(data);
        
        // Calcular tempo restante
        if (data.expires_at) {
          const expiryTime = new Date(data.expires_at).getTime();
          const now = new Date().getTime();
          const remainingMs = Math.max(0, expiryTime - now);
          const remainingSecs = Math.floor(remainingMs / 1000);
          
          // Garantir que o tempo inicial seja de 30 minutos (1800 segundos) ou o tempo restante, o que for menor
          const initialTime = Math.min(1800, Math.max(0, remainingSecs));
          setTimeRemaining(initialTime);
          setFormattedTime(formatTimeRemaining(initialTime));
        } else {
          // Se não houver data de expiração, definir para 30 minutos
          setTimeRemaining(1800);
          setFormattedTime('30:00');
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocorreu um erro ao carregar os dados');
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchPaymentData();
    }
  }, [token]);
  
  // Atualizar o timer a cada segundo
  useEffect(() => {
    if (timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prevTime => {
        const newTime = Math.max(0, prevTime - 1);
        setFormattedTime(formatTimeRemaining(newTime));
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining]);
  
  // Calcular a porcentagem de tempo restante para a barra de progresso
  const timePercentage = Math.min(100, Math.max(0, (timeRemaining / 1800) * 100));
  
  // Função para verificar se o pagamento foi aprovado
  const checkPaymentStatus = async (): Promise<boolean> => {
    try {
      setVerifyingPayment(true);
      const response = await fetch(`/api/payment-request/check/${token}`);
      
      if (!response.ok) {
        throw new Error('Erro ao verificar status do pagamento');
      }
      
      const data = await response.json();
      console.log('Status do pagamento:', data);
      
      // Atualizar informações do pagamento
      if (data.payment && data.payment.status !== payment?.payment?.status) {
        setPayment(data);
      }
      
      // Verificar se o pagamento foi aprovado - corrigido para tratar null como false
      if (data.payment && data.payment.status === 'approved') {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      return false;
    } finally {
      setVerifyingPayment(false);
    }
  };
  
  // Função para redirecionar para a página de agradecimento
  const redirectToThankYouPage = () => {
    // Verificar se o site principal enviou uma URL de retorno
    // Se sim, usar essa URL; caso contrário, usar a página de agradecimento interna
    const hasCustomReturnUrl = payment?.return_url && payment.return_url.includes('viralizamos.com');
    
    if (hasCustomReturnUrl) {
      try {
        // Verificar se a URL é válida antes de construir
        let url;
        
        try {
          url = new URL(payment!.return_url!);
        } catch (error) {
          console.error('URL inválida:', payment?.return_url);
          // Usar a URL interna
          window.location.href = `/agradecimento/${token}`;
          return;
        }
        
        // Adicionar parâmetros
        url.searchParams.append('token', token);
        url.searchParams.append('status', 'approved');
        
        if (payment?.id) {
          url.searchParams.append('payment_id', payment.id);
        }
        
        console.log('Redirecionando para URL personalizada:', url.toString());
        
        // Redirecionar
        window.location.href = url.toString();
      } catch (error) {
        console.error('Erro ao redirecionar para URL personalizada:', error);
        // Fallback para URL interna
        window.location.href = `/agradecimento/${token}`;
      }
    } else {
      // Se não há URL de retorno personalizada, usar a página interna
      console.log('Redirecionando para página de agradecimento interna');
      window.location.href = `/agradecimento/${token}`;
    }
  };
  
  // Função para verificar pagamento manualmente (botão "Já paguei")
  const handleManualCheck = async () => {
    const approved = await checkPaymentStatus();
    
    if (approved) {
      // Mostrar o diálogo e redirecionar automaticamente após 2 segundos
      onOpen();
      setTimeout(() => {
        redirectToThankYouPage();
      }, 2000);
    } else {
      toast({
        title: 'Pagamento em processamento',
        description: 'Seu pagamento ainda não foi confirmado. Tente novamente em alguns instantes.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Estado para contagem regressiva de verificação
  const [checkCountdown, setCheckCountdown] = useState<number>(30);
  
  // Iniciar contador regressivo para próxima verificação
  useEffect(() => {
    // Não iniciar se o pagamento já estiver aprovado
    if (payment?.payment?.status === 'approved') return;
    
    const countdownInterval = setInterval(() => {
      setCheckCountdown(prev => {
        if (prev <= 1) {
          // Quando chegar a zero, verificar o pagamento e reiniciar o contador
          checkPaymentStatus();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(countdownInterval);
  }, [payment]);
  
  // Função para lidar com a criação bem-sucedida do pagamento PIX
  const handlePixPaymentSuccess = (paymentData: {
    id: string;
    status: string;
    method: string;
    pix_code: string;
    pix_qrcode: string;
    amount: number;
  }) => {
    // Atualizar o estado com os dados do pagamento
    if (payment) {
      setPayment({
        ...payment,
        payment: {
          id: paymentData.id,
          status: paymentData.status,
          method: paymentData.method,
          pix_code: paymentData.pix_code,
          pix_qrcode: paymentData.pix_qrcode,
          amount: paymentData.amount
        }
      });
    }
  };

  // Função para lidar com erros na criação do pagamento PIX
  const handlePixPaymentError = (errorMessage: string) => {
    toast({
      title: 'Erro ao gerar pagamento',
      description: errorMessage,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  };
  
  // Rastrear início do checkout
  useEffect(() => {
    // Rastrear início do processo de pagamento
    if (typeof window !== 'undefined' && (window as any).gtag && !loading && payment) {
      (window as any).gtag('event', 'begin_checkout', {
        'send_to': 'AW-16904345570',
        'value': payment.amount,
        'currency': 'BRL',
        'items': [
          {
            'id': token,
            'name': payment.service_name,
            'quantity': payment.quantity
          }
        ]
      });
    }
  }, [payment, loading, token]);
  
  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg={bgColor}>
      {/* Tag para rastreamento de início de checkout */}
      <Script id="google-checkout-tracking" strategy="afterInteractive">
        {`
          function gtag_report_begin_checkout(amount, service_name) {
            gtag('event', 'begin_checkout', {
              'send_to': 'AW-16904345570',
              'value': amount,
              'currency': 'BRL',
              'items': [{
                'id': '${token}',
                'name': service_name
              }]
            });
          }
        `}
      </Script>
      
      {/* Componente de rastreamento de carrinhos abandonados */}
      <ClarityCartTracker 
        token={token}
        amount={payment?.amount}
        serviceName={payment?.service_name}
        customerEmail={payment?.customer_email}
        status={payment?.payment?.status}
        timeRemaining={timeRemaining}
      />
      
      <ViralizamosHeader />
      
      <Container maxW="container.xl" py={8} px={{ base: 4, md: 8 }} flex="1">
        
        <VStack spacing={6} align="stretch" width="100%">
          <Heading as="h1" size="xl" textAlign={{ base: "center", md: "left" }}>
            Finalizar Pagamento
          </Heading>
        
        {loading ? (
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
            <GridItem>
                <Box height="400px" borderRadius="lg" p={6} bg={cardBg} boxShadow="md">
                <SkeletonText mt="4" noOfLines={10} spacing="4" skeletonHeight="4" />
              </Box>
            </GridItem>
            <GridItem>
                <Box height="400px" borderRadius="lg" p={6} bg={cardBg} boxShadow="md">
                <SkeletonText mt="4" noOfLines={10} spacing="4" skeletonHeight="4" />
              </Box>
            </GridItem>
          </Grid>
        ) : error ? (
            <Card bg={cardBg} shadow="md">
            <CardBody>
              <Text color="red.500">{error}</Text>
            </CardBody>
          </Card>
        ) : payment ? (
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
              {/* COLUNA DE PAGAMENTO - Prioridade no mobile */}
              <GridItem order={{ base: 1, md: 2 }}>
                <VStack spacing={4} width="100%">
                  {/* Timer Card */}
                  <Card variant="elevated" shadow="md" width="100%" bg={cardBg} borderColor={borderColor}>
                    <CardBody>
                      <VStack spacing={3}>
                        <Flex width="100%" justify="center" align="center" gap={2}>
                          <Icon as={FaClock} color="pink.500" />
                          <Text fontWeight="bold" fontSize="2xl" color="pink.600">
                            {formattedTime}
                          </Text>
                        </Flex>
                        <Text fontSize="sm" color="gray.600" textAlign="center">
                          Este QR Code expira em breve
                        </Text>
                        <Progress
                          value={timePercentage}
                          size="sm"
                          colorScheme="pink"
                          width="100%"
                          borderRadius="full"
                        />
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Payment Card */}
                  <Card variant="elevated" shadow="md" width="100%" bg={cardBg} borderColor={borderColor}>
                    <CardHeader pb={0}>
                      <Heading size="md" textAlign="center">
                        <Flex justify="center" align="center" gap={2}>
                          <Icon as={FaQrcode} color="pink.500" />
                          <Text>Pague com PIX</Text>
                        </Flex>
                      </Heading>
                    </CardHeader>
                    
                <CardBody>
                      <VStack spacing={6} align="center">
                        {!payment?.payment && (
                          <Box width="100%" mb={4}>
                            <PixPaymentButton 
                              paymentRequestId={payment?.id || ''}
                              onSuccess={handlePixPaymentSuccess}
                              onError={handlePixPaymentError}
                              style={{ width: '100%' }}
                            />
                            <Text mt={2} fontSize="sm" color="gray.600" textAlign="center">
                              Clique no botão acima para gerar o código PIX
                            </Text>
                          </Box>
                        )}
                        
                        {/* QR Code */}
                        {payment?.payment?.pix_qrcode || payment?.payment?.pix_code ? (
                          <Box 
                            p={4} 
                            borderWidth="2px" 
                            borderColor="pink.100" 
                            borderRadius="md"
                            bg="white"
                            boxShadow="sm"
                          >
                            {payment?.payment?.pix_qrcode ? (
                              <ChakraImage 
                                src={`data:image/png;base64,${payment.payment.pix_qrcode}`} 
                                alt="QR Code PIX" 
                                width="200px" 
                                height="200px"
                              />
                            ) : (
                              <QRCodeSVG 
                                value={payment.payment.pix_code} 
                                size={200}
                                includeMargin={true}
                                bgColor="#FFFFFF"
                                fgColor="#000000"
                                level="M"
                              />
                            )}
                          </Box>
                        ) : (
                          <Box 
                            p={4} 
                            borderWidth="2px" 
                            borderColor="gray.200" 
                            borderRadius="md"
                            bg="white"
                            width="200px" 
                            height="200px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Text color="gray.500">QR Code não disponível</Text>
                          </Box>
                        )}
                        
                        {payment?.payment && (
                          <Text color="gray.600" fontSize="sm" textAlign="center">
                            Escaneie este QR Code com o app do seu banco para pagar
                          </Text>
                        )}
                        
                        {/* Código PIX */}
                        {payment?.payment?.pix_code && (
                          <Box width="100%">
                            <FormControl>
                              <FormLabel fontSize="sm" fontWeight="medium">
                                <HStack>
                                  <Icon as={FaTag} color="pink.600" />
                                  <Text>Código PIX</Text>
                                </HStack>
                              </FormLabel>
                              <Flex>
                                <Input 
                                  value={payment.payment.pix_code}
                                  isReadOnly
                                  pr="4.5rem"
                                  fontFamily="mono"
                                  fontSize="xs"
                                  bg="gray.50"
                                />
                                <Button
                                  ml={2}
                                  colorScheme="pink"
                                  variant="outline"
                                  size="md"
                                  onClick={handleCopyPixCode}
                                  leftIcon={<Icon as={FaCopy} />}
                                  width="100%"
                                  data-action="copy-pix"
                                >
                                  {hasCopied ? "Copiado!" : "Copiar código PIX"}
                                </Button>
                              </Flex>
                            </FormControl>
                          </Box>
                        )}
                        
                        {/* Botão "Já paguei" */}
                        {payment && payment.payment && (
                          <Box width="100%" mt={4}>
                            <Button
                              colorScheme="green"
                              size="lg"
                              width="100%"
                              onClick={handleManualCheck}
                              isLoading={verifyingPayment}
                              loadingText="Verificando..."
                              leftIcon={<Icon as={FaCheck} />}
                              mt={4}
                              data-action="check-payment"
                            >
                              Já paguei
                            </Button>
                            <Text mt={2} fontSize="sm" color="gray.600" textAlign="center">
                              Clique no botão acima após realizar o pagamento
                            </Text>
                          </Box>
                        )}
                        
                        <Box 
                          bg="gray.50" 
                          p={4} 
                          borderRadius="md" 
                          width="100%" 
                          mt={2}
                        >
                          <Text fontSize="sm" color="gray.600" textAlign="center">
                            Você será redirecionado automaticamente após a confirmação do pagamento.
                          </Text>
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>
              </GridItem>
              
              {/* COLUNA DE DETALHES DO PEDIDO */}
              <GridItem order={{ base: 2, md: 1 }}>
                <VStack spacing={4} width="100%">
                  {/* Detalhes do Pedido */}
                  <Card variant="elevated" shadow="md" width="100%" bg={cardBg} borderColor={borderColor}>
                    <CardHeader pb={0}>
                      <Heading size="md">Detalhes do Pedido</Heading>
                    </CardHeader>
                    
                    <CardBody>
                      <Stack spacing={4} divider={<Divider />}>
                    <Box>
                      <HStack mb={2}>
                        <Icon as={FaInfoCircle} color="pink.600" />
                        <Text fontWeight="semibold">Serviço:</Text>
                      </HStack>
                      <Text>{payment.service_name}</Text>
                      <Text mt={1} fontWeight="medium" color="pink.600">
                        Total: {payment.quantity || 0} 
                        {payment.posts && payment.posts.length > 0 && payment.posts[0]?.media_type === 'VIDEO' 
                              ? ' visualizações' 
                              : ' curtidas'
                        }
                      </Text>
                    </Box>
                    
                    <Box>
                      <HStack mb={2}>
                            <Icon as={FaInstagram} color="pink.600" />
                        <Text fontWeight="semibold">Instagram:</Text>
                      </HStack>
                      <HStack spacing={3}>
                        <Text>@{payment.instagram_username}</Text>
                      </HStack>
                    </Box>
                    
                    <Box>
                      <HStack mb={2}>
                        <Icon as={FaInfoCircle} color="pink.600" />
                        <Text fontWeight="semibold">Informações de Contato:</Text>
                      </HStack>
                      <Text>Nome: {payment.customer_name}</Text>
                      <Text>Email: {payment.customer_email}</Text>
                      {payment.customer_phone && (
                        <Text>Telefone: {payment.customer_phone}</Text>
                      )}
                    </Box>
                        
                        <Stack spacing={2}>
                          <Flex justify="space-between">
                            <Text>Subtotal</Text>
                            <Text>R$ {(payment.amount * 0.9).toFixed(2)}</Text>
                          </Flex>
                          
                          <Flex justify="space-between">
                            <Text>Taxa de processamento</Text>
                            <Text>R$ {(payment.amount * 0.1).toFixed(2)}</Text>
                          </Flex>
                          
                          <Divider />
                          
                          <Flex justify="space-between" fontWeight="bold">
                            <Text>Total</Text>
                            <Text color="pink.600">R$ {payment.amount.toFixed(2)}</Text>
                          </Flex>
                        </Stack>
                  </Stack>
                </CardBody>
              </Card>
              
                  {/* Posts selecionados */}
                  {payment.posts && payment.posts.length > 0 && (
                    <Card variant="elevated" shadow="md" width="100%" bg={cardBg} borderColor={borderColor}>
                      <CardHeader pb={0}>
                        <Flex justify="space-between" align="center">
                    <Heading size="md">Posts selecionados</Heading>
                    <Badge colorScheme="pink" fontSize="sm" px={2} py={1}>
                            {payment.quantity || 0}
                            {payment.posts[0]?.media_type === 'VIDEO' 
                        ? ' visualizações' 
                        : ' curtidas'
                      }
                    </Badge>
                  </Flex>
                      </CardHeader>
                  
                      <CardBody>
                    <VStack spacing={4} align="stretch">
                      {/* Explicação da distribuição de curtidas */}
                      <Text fontSize="sm" color="gray.600">
                        O total de {payment.quantity} curtidas será distribuído entre os {payment.posts.length} itens ({Math.floor(payment.quantity / payment.posts.length)} por item + {payment.quantity % payment.posts.length} extras para os primeiros).
                      </Text>
                      
                      {payment.posts.map((post) => (
                        <Flex 
                          key={post.id} 
                          borderWidth="1px" 
                          borderRadius="md" 
                          p={3} 
                          align="center"
                        >
                          <Box 
                            width="60px" 
                            height="60px" 
                            bg="gray.100" 
                            borderRadius="md" 
                            overflow="hidden" 
                            mr={4}
                          >
                            {post.image_url || post.thumbnail_url ? (
                              <Box position="relative" width="100%" height="100%">
                                <NextImage 
                                  src={getProxyImageUrl(post.image_url || post.thumbnail_url) || '/placeholder-post.png'} 
                                  alt="Thumbnail" 
                                  fill
                                  style={{ objectFit: 'cover' }}
                                  unoptimized={true}
                                />
                                <Flex 
                                  position="absolute"
                                  top="0"
                                  left="0"
                                  bg="rgba(0,0,0,0.4)"
                                  color="white"
                                  fontSize="xs"
                                  px={1}
                                  borderBottomRightRadius="sm"
                                >
                                  {post.media_type === 'VIDEO' ? 'Vídeo' : 'Foto'}
                                </Flex>
                              </Box>
                            ) : (
                              <Flex 
                                align="center" 
                                justify="center" 
                                height="100%" 
                                bg="gray.200"
                              >
                                <Icon as={FaInstagram} color="gray.400" boxSize={5} />
                              </Flex>
                            )}
                          </Box>
                          
                          <Box flex={1}>
                            <Text fontSize="sm" fontWeight="medium" mb={1} noOfLines={1}>
                              {post.caption || 'Post do Instagram'}
                            </Text>
                            
                            <Flex justify="space-between" align="center">
                              <Link 
                                href={post.url} 
                                color="pink.600" 
                                fontSize="xs" 
                                isExternal
                              >
                                Ver post original
                              </Link>
                              
                              <Badge colorScheme="pink" fontSize="sm" px={2} py={1} borderRadius="md">
                                {(() => {
                                  const postIndex = payment.posts.indexOf(post);
                                  const totalPosts = payment.posts.length;
                                  const totalQuantity = payment.quantity;
                                  
                                  if (totalPosts === 3 && totalQuantity === 500) {
                                    // Caso específico: 500 curtidas em 3 posts (167, 167, 166)
                                    if (postIndex === 0 || postIndex === 1) {
                                      return 167;
                                    } else {
                                      return 166;
                                    }
                                  } else {
                                    // Cálculo genérico
                                    const baseQuantity = Math.floor(totalQuantity / totalPosts);
                                    const extras = totalQuantity % totalPosts;
                                    return postIndex < extras ? baseQuantity + 1 : baseQuantity;
                                  }
                                })()} {post.media_type === 'VIDEO' ? 'visualizações' : 'curtidas'}
                              </Badge>
                            </Flex>
                          </Box>
                        </Flex>
                      ))}
                    </VStack>
                      </CardBody>
                    </Card>
                  )}
                  </VStack>
            </GridItem>
          </Grid>
        ) : null}
        </VStack>
      </Container>
      
      <ViralizamosFooter />
      
      {/* Diálogo de confirmação de pagamento */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="green.500">
              Pagamento confirmado!
            </AlertDialogHeader>

            <AlertDialogBody>
              Seu pagamento foi processado com sucesso. Você será redirecionado automaticamente...
            </AlertDialogBody>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
} 