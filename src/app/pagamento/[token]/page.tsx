"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  PaymentContainer, 
  OrderDetailsSection, 
  QRCodeSection,
  Card, 
  Title,
  Subtitle,
  Text,
  MutedText,
  ListItem,
  TimerContainer,
  TimerText,
  TimerBar,
  TimerMessage,
  QRCodeContainer,
  QRCodeImage,
  Button,
  PixCodeContainer,
  PixCode,
  CopyButton,
  CopyFeedback,
  PostItemContainer,
  PostThumbnail,
  PostInfo,
  PostTitle,
  PostMeta,
  PostLink,
  PostQuantity,
  PriceRow,
  TotalRow,
  CustomerInfo,
  InfoRow
} from '@/components/styles/payment-styles';

// Definir interfaces para os tipos de dados
interface PaymentRequest {
  id: string;
  token: string;
  status: string;
  created_at: string;
  amount: number;
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
}

interface Post {
  id: string;
  url: string;
  media_type: string;
  thumbnail_url?: string;
  caption?: string;
  quantity: number;
}

export default function PaymentPage({ params }: { params: { token: string } }) {
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [formattedTime, setFormattedTime] = useState<string>('30:00');
  const [showCopyFeedback, setShowCopyFeedback] = useState<boolean>(false);
  
  // Formatar o tempo restante
  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Copiar código PIX para área de transferência
  const copyPixCode = async () => {
    if (!payment?.pix_code) return;
    
    try {
      await navigator.clipboard.writeText(payment.pix_code);
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 3000);
    } catch (err) {
      console.error('Erro ao copiar código:', err);
    }
  };
  
  // Buscar os dados de pagamento
  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/payment-requests/${params.token}`);
        
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
          
          setTimeRemaining(remainingSecs);
          setFormattedTime(formatTimeRemaining(remainingSecs));
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocorreu um erro ao carregar os dados');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPaymentData();
  }, [params.token]);
  
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
  
  if (loading) {
    return (
      <PaymentContainer>
        <Card style={{ textAlign: 'center', padding: '2rem' }}>
          <Text>Carregando informações do pagamento...</Text>
        </Card>
      </PaymentContainer>
    );
  }
  
  if (error || !payment) {
    return (
      <PaymentContainer>
        <Card style={{ textAlign: 'center', padding: '2rem' }}>
          <Text style={{ color: '#ef4444' }}>{error || 'Pagamento não encontrado'}</Text>
        </Card>
      </PaymentContainer>
    );
  }
  
  // Calcular a porcentagem de tempo restante para a barra de progresso
  const timePercentage = Math.min(100, Math.max(0, (timeRemaining / 1800) * 100));
  
  return (
    <PaymentContainer>
      {/* Seção de detalhes do pedido */}
      <OrderDetailsSection>
        <Title>Pagamento</Title>
        <Text>Complete seu pagamento para confirmar seu pedido</Text>
        
        <Card>
          <TimerContainer>
            <TimerText>{formattedTime}</TimerText>
            <TimerBar style={{ '--timer-progress': `${timePercentage}%` } as React.CSSProperties} />
            <TimerMessage>Este QR Code expira em {formattedTime}</TimerMessage>
          </TimerContainer>
        </Card>
        
        <Card>
          <Subtitle>Detalhes do Pedido</Subtitle>
          
          <InfoRow>
            <strong>Serviço:</strong> {payment.service_name}
          </InfoRow>
          
          <InfoRow>
            <strong>Instagram:</strong> @{payment.instagram_username}
          </InfoRow>
          
          <CustomerInfo>
            <InfoRow>
              <strong>Nome:</strong> {payment.customer_name}
            </InfoRow>
            <InfoRow>
              <strong>Email:</strong> {payment.customer_email}
            </InfoRow>
            {payment.customer_phone && (
              <InfoRow>
                <strong>Telefone:</strong> {payment.customer_phone}
              </InfoRow>
            )}
          </CustomerInfo>
          
          <Subtitle>Posts selecionados</Subtitle>
          
          {payment.posts.map((post) => (
            <PostItemContainer key={post.id}>
              <PostThumbnail>
                {post.thumbnail_url ? (
                  <img src={post.thumbnail_url} alt="Thumbnail" />
                ) : (
                  <div style={{ 
                    backgroundColor: '#f3f4f6', 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="4" fill="#E5E7EB"/>
                      <path d="M12 8V16M8 12H16" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </PostThumbnail>
              
              <PostInfo>
                <PostTitle>
                  {post.caption || 'Post do Instagram'}
                </PostTitle>
                
                <PostMeta>
                  <PostLink href={post.url} target="_blank" rel="noopener noreferrer">
                    Ver post original
                  </PostLink>
                  
                  <PostQuantity>
                    {post.quantity} {post.media_type === 'VIDEO' ? 'visualizações' : 'curtidas'}
                  </PostQuantity>
                </PostMeta>
              </PostInfo>
            </PostItemContainer>
          ))}
          
          <PriceRow>
            <span>Subtotal</span>
            <span>R$ {(payment.amount / 100).toFixed(2)}</span>
          </PriceRow>
          
          <TotalRow>
            <span>Total</span>
            <span>R$ {(payment.amount / 100).toFixed(2)}</span>
          </TotalRow>
        </Card>
      </OrderDetailsSection>
      
      {/* Seção do QR Code */}
      <QRCodeSection>
        <Card>
          <Subtitle>Pague com PIX</Subtitle>
          <MutedText>Escaneie o QR Code abaixo com o app do seu banco</MutedText>
          
          <QRCodeContainer>
            {payment.qr_code_image && (
              <QRCodeImage 
                src={payment.qr_code_image} 
                alt="QR Code PIX" 
              />
            )}
          </QRCodeContainer>
          
          <MutedText>Ou copie o código PIX abaixo</MutedText>
          
          <PixCodeContainer>
            <PixCode>{payment.pix_code}</PixCode>
            <CopyButton onClick={copyPixCode}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H16C17.1046 21 18 20.1046 18 19V17M16 3H10C8.89543 3 8 3.89543 8 5V15C8 16.1046 8.89543 17 10 17H16C17.1046 17 18 16.1046 18 15V5C18 3.89543 17.1046 3 16 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </CopyButton>
          </PixCodeContainer>
          
          <Button>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3V21M19 7L12 3L5 7M19 7V18.0984C19 18.6092 18.6092 19 18.0984 19H5.90164C5.39084 19 5 18.6092 5 18.0984V7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Já paguei
          </Button>
        </Card>
        
        <MutedText style={{ textAlign: 'center', marginTop: '1rem' }}>
          Após o pagamento, você receberá uma confirmação por email.
        </MutedText>
      </QRCodeSection>
      
      {/* Feedback de cópia */}
      <CopyFeedback className={showCopyFeedback ? 'visible' : ''}>
        Código PIX copiado!
      </CopyFeedback>
    </PaymentContainer>
  );
} 