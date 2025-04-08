"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import NextImage from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Box, 
  Container,
  Grid, 
  GridItem, 
  Heading, 
  Text, 
  Card, 
  CardBody, 
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
  useClipboard
} from '@chakra-ui/react';
import { FaHeart, FaCopy, FaInfoCircle, FaTag, FaInstagram } from 'react-icons/fa';
import ViralizamosHeader from '@/components/layout/ViralizamosHeader';
import { ViralizamosFooter } from '@/components/layout/ViralizamosFooter';

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

export default function PaymentPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(1800); // 30 minutos em segundos
  const [formattedTime, setFormattedTime] = useState<string>('30:00');
  
  const pixCode = payment?.payment?.pix_code || '';
  const { hasCopied, onCopy } = useClipboard(pixCode);
  
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
        const response = await fetch(`/api/payment-requests/${token}`);
        
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
  
  return (
    <>
      <ViralizamosHeader />
      
      <Container maxW="container.xl" py={10}>
        <Heading as="h1" size="lg" mb={4}>Pagamento</Heading>
        <Text mb={6}>Complete seu pagamento para confirmar seu pedido</Text>
        
        {loading ? (
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
            <GridItem>
              <Box height="400px" borderRadius="lg" p={6} bg="white" boxShadow="md">
                <SkeletonText mt="4" noOfLines={10} spacing="4" skeletonHeight="4" />
              </Box>
            </GridItem>
            <GridItem>
              <Box height="400px" borderRadius="lg" p={6} bg="white" boxShadow="md">
                <SkeletonText mt="4" noOfLines={10} spacing="4" skeletonHeight="4" />
              </Box>
            </GridItem>
          </Grid>
        ) : error ? (
          <Card>
            <CardBody>
              <Text color="red.500">{error}</Text>
            </CardBody>
          </Card>
        ) : payment ? (
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
            {/* Coluna esquerda - Detalhes do pedido */}
            <GridItem>
              <Card mb={6} variant="elevated" shadow="md">
                <CardBody>
                  <Heading size="md" mb={3}>Detalhes do Pedido</Heading>
                  
                  <Stack divider={<Divider />} spacing={4}>
                    <Box>
                      <HStack mb={2}>
                        <Icon as={FaInfoCircle} color="pink.600" />
                        <Text fontWeight="semibold">Serviço:</Text>
                      </HStack>
                      <Text>{payment.service_name}</Text>
                      <Text mt={1} fontWeight="medium" color="pink.600">
                        Total: {payment.quantity || 0} 
                        {payment.posts && payment.posts.length > 0 && payment.posts[0]?.media_type === 'VIDEO' 
                          ? 'visualizações' 
                          : 'curtidas'
                        }
                      </Text>
                    </Box>
                    
                    <Box>
                      <HStack mb={2}>
                        <Icon as={FaInfoCircle} color="pink.600" />
                        <Text fontWeight="semibold">Instagram:</Text>
                      </HStack>
                      <HStack spacing={3}>
                        <Flex
                          width="32px"
                          height="32px"
                          borderRadius="full"
                          bg="pink.50"
                          justify="center"
                          align="center"
                        >
                          <Icon as={FaInstagram} color="pink.500" boxSize={4} />
                        </Flex>
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
                  </Stack>
                </CardBody>
              </Card>
              
              <Card variant="elevated" shadow="md">
                <CardBody>
                  <Flex justify="space-between" align="center" mb={3}>
                    <Heading size="md">Posts selecionados</Heading>
                    <Badge colorScheme="pink" fontSize="sm" px={2} py={1}>
                      Total: {payment.quantity || 0}
                      {payment.posts && payment.posts.length > 0 && payment.posts[0]?.media_type === 'VIDEO' 
                        ? ' visualizações' 
                        : ' curtidas'
                      }
                    </Badge>
                  </Flex>
                  
                  {payment.posts && payment.posts.length > 0 ? (
                    <VStack spacing={4} align="stretch">
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
                                {payment.posts.length === 1 ? payment.quantity : post.quantity} {post.media_type === 'VIDEO' ? 'visualizações' : 'curtidas'}
                              </Badge>
                            </Flex>
                          </Box>
                        </Flex>
                      ))}
                    </VStack>
                  ) : (
                    <Box py={4} textAlign="center">
                      <Text color="gray.500">Não há posts selecionados.</Text>
                    </Box>
                  )}
                  
                  <Divider my={4} />
                  
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
                </CardBody>
              </Card>
            </GridItem>
            
            {/* Coluna direita - Informações de pagamento */}
            <GridItem>
              <Card mb={6} variant="elevated" shadow="md">
                <CardBody>
                  <Flex direction="column" align="center">
                    <Text fontWeight="bold" fontSize="xl" mb={1}>{formattedTime}</Text>
                    <Text fontSize="sm" color="gray.500" mb={4}>
                      Este QR Code expira em {formattedTime}
                    </Text>
                    
                    <Progress
                      value={timePercentage}
                      size="sm"
                      colorScheme="pink"
                      width="100%"
                      borderRadius="full"
                      mb={4}
                    />
                  </Flex>
                </CardBody>
              </Card>
              
              <Card variant="elevated" shadow="md">
                <CardBody>
                  <Heading size="md" textAlign="center" mb={6}>Pague com PIX</Heading>
                  
                  <VStack spacing={6} align="center">
                    <Box 
                      p={4} 
                      borderWidth="2px" 
                      borderColor="gray.200" 
                      borderRadius="md"
                      bg="white"
                    >
                      {payment?.payment?.pix_qrcode ? (
                        <ChakraImage 
                          src={`data:image/png;base64,${payment.payment.pix_qrcode}`} 
                          alt="QR Code PIX" 
                          width="200px" 
                          height="200px"
                        />
                      ) : payment?.payment?.pix_code ? (
                        <QRCodeSVG 
                          value={payment.payment.pix_code} 
                          size={200}
                          includeMargin={true}
                          bgColor="#FFFFFF"
                          fgColor="#000000"
                          level="M"
                        />
                      ) : (
                        <Flex 
                          width="200px" 
                          height="200px" 
                          bg="gray.100" 
                          borderRadius="md" 
                          align="center" 
                          justify="center"
                        >
                          <Text color="gray.500">QR Code não disponível</Text>
                        </Flex>
                      )}
                    </Box>
                    
                    <Text color="gray.600" fontSize="sm">
                      Escaneie este QR Code com o app do seu banco ou copie o código PIX abaixo
                    </Text>
                    
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
                              onClick={handleCopyPixCode}
                              leftIcon={<Icon as={FaCopy} />}
                            >
                              {hasCopied ? "Copiado" : "Copiar"}
                            </Button>
                          </Flex>
                        </FormControl>
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
                        Você será redirecionado após o pagamento, o sistema irá processar automaticamente seu pedido.
                      </Text>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        ) : null}
      </Container>
      
      <ViralizamosFooter />
    </>
  );
} 