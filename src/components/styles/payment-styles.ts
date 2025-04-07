import styled from 'styled-components';

// Cores principais baseadas no design do Viralizamos
export const colors = {
  primary: '#db2777', // Rosa
  primaryDark: '#be185d',
  primaryLight: '#f472b6',
  secondary: '#312e81', // Indigo escuro
  background: '#ffffff',
  text: '#1e293b',
  muted: '#94a3b8',
  border: '#e2e8f0',
  success: '#10b981',
  warning: '#fbbf24',
  error: '#ef4444',
  accent: '#8b5cf6',
};

// Container principal
export const PaymentContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;

  @media (min-width: 768px) {
    padding: 2rem;
  }

  @media (min-width: 1024px) {
    flex-direction: row;
    align-items: flex-start;
  }
`;

// Seção da esquerda com detalhes do pedido
export const OrderDetailsSection = styled.div`
  flex: 1;
  
  @media (min-width: 1024px) {
    padding-right: 2rem;
  }
`;

// Seção da direita com QR Code
export const QRCodeSection = styled.div`
  width: 100%;
  
  @media (min-width: 1024px) {
    width: 400px;
    position: sticky;
    top: 1rem;
  }
`;

// Card genérico
export const Card = styled.div`
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  border: 1px solid ${colors.border};
  margin-bottom: 1.5rem;
`;

// Título
export const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: 700;
  color: ${colors.primary};
  margin-bottom: 0.5rem;
`;

export const Subtitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${colors.text};
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${colors.border};
`;

// Texto padrão
export const Text = styled.p`
  color: ${colors.text};
  margin-bottom: 0.5rem;
  line-height: 1.5;
`;

export const MutedText = styled.p`
  color: ${colors.muted};
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
`;

// Itens de lista
export const ListItem = styled.div`
  display: flex;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

// Timer
export const TimerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
`;

export const TimerText = styled.div`
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 700;
  color: ${colors.primary};
  margin-bottom: 0.5rem;
`;

export const TimerBar = styled.div`
  width: 100%;
  height: 6px;
  background-color: ${colors.border};
  border-radius: 3px;
  overflow: hidden;
  
  &::before {
    content: '';
    display: block;
    height: 100%;
    width: var(--timer-progress, 100%);
    background-color: ${colors.success};
    animation: countdown 1800s linear forwards;
  }
  
  @keyframes countdown {
    from { width: 100%; }
    to { width: 0; }
  }
`;

export const TimerMessage = styled.p`
  font-size: 0.875rem;
  color: ${colors.muted};
  margin-top: 0.5rem;
  text-align: center;
`;

// QR Code
export const QRCodeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1.5rem 0;
`;

export const QRCodeImage = styled.img`
  max-width: 100%;
  height: auto;
  margin-bottom: 1rem;
`;

// Botões
export const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: ${colors.primary};
  color: white;
  font-weight: 500;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  width: 100%;
  
  &:hover {
    background-color: ${colors.primaryDark};
  }
  
  &:focus {
    outline: 2px solid ${colors.primaryLight};
    outline-offset: 2px;
  }
`;

export const ButtonOutline = styled(Button)`
  background-color: transparent;
  color: ${colors.primary};
  border: 1px solid ${colors.primary};
  
  &:hover {
    background-color: ${colors.primaryLight}10;
  }
`;

// Post item styles
export const PostItemContainer = styled.div`
  display: flex;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid ${colors.border};
  margin-bottom: 1rem;
`;

export const PostThumbnail = styled.div`
  width: 80px;
  height: 80px;
  background-color: #f3f4f6;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const PostInfo = styled.div`
  flex: 1;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

export const PostTitle = styled.div`
  font-weight: 500;
  color: ${colors.text};
  margin-bottom: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const PostMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
`;

export const PostLink = styled.a`
  color: ${colors.primary};
  font-size: 0.875rem;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

export const PostQuantity = styled.span`
  background-color: ${colors.primaryLight}20;
  color: ${colors.primary};
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
  font-size: 0.75rem;
`;

// Estilo para detalhes de preço
export const PriceRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

export const TotalRow = styled(PriceRow)`
  font-weight: 700;
  font-size: 1.125rem;
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid ${colors.border};
`;

// Customer info
export const CustomerInfo = styled.div`
  margin-bottom: 1.5rem;
`;

export const InfoRow = styled.div`
  display: flex;
  margin-bottom: 0.5rem;
  
  strong {
    min-width: 120px;
    font-weight: 600;
  }
`;

// Código PIX
export const PixCodeContainer = styled.div`
  background-color: #f8fafc;
  border: 1px dashed ${colors.border};
  border-radius: 0.375rem;
  padding: 0.75rem;
  margin: 1rem 0;
  position: relative;
`;

export const PixCode = styled.pre`
  font-family: var(--font-mono);
  font-size: 0.75rem;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  word-break: break-all;
  color: ${colors.text};
  margin: 0;
  padding-right: 2rem;
`;

export const CopyButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 0.5rem;
  background: none;
  border: none;
  color: ${colors.primary};
  cursor: pointer;
  
  &:hover {
    color: ${colors.primaryDark};
  }
`;

// Grid para informações
export const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  
  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

// Badge / Tag
export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  background-color: ${colors.primaryLight}20;
  color: ${colors.primary};
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
`;

// Feedback de cópia
export const CopyFeedback = styled.div`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: ${colors.secondary};
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  opacity: 0;
  transition: opacity 0.3s ease;
  
  &.visible {
    opacity: 1;
  }
`; 