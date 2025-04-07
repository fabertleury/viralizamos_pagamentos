'use client';

import { useState } from 'react';
import { 
  PaymentContainer, 
  Card, 
  Title,
  Text,
  Button
} from '@/components/styles/payment-styles';

export default function AcompanharPedidoPage() {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setIsSubmitting(true);
    // Simulando uma chamada de API
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Funcionalidade em desenvolvimento. Em breve você poderá acompanhar seus pedidos aqui.');
    }, 1000);
  };
  
  return (
    <PaymentContainer style={{ maxWidth: '800px', padding: '2rem 1rem' }}>
      <div style={{ width: '100%' }}>
        <Title>Acompanhar Pedido</Title>
        <Text style={{ marginBottom: '2rem' }}>
          Digite o código do seu pedido para verificar o status.
        </Text>
        
        <Card>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="code" style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 500,
                color: '#64748b'
              }}>
                Código do Pedido
              </label>
              <input 
                id="code"
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Exemplo: ORD-123456" 
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={isSubmitting}
              style={{ 
                marginTop: '1rem',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Verificando...' : 'Verificar Status'}
            </Button>
          </form>
        </Card>
        
        <Card style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Não tem o código?</h2>
          <Text>
            Se você não recebeu o código do seu pedido, verifique seu e-mail (incluindo a pasta de spam).
            Caso não encontre, entre em contato conosco pelo WhatsApp para obter ajuda.
          </Text>
          
          <a 
            href="https://wa.me/5562999915390" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#25d366',
              color: 'white',
              borderRadius: '0.375rem',
              fontWeight: 500,
              textDecoration: 'none'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.6 6.3c-1.4-1.5-3.3-2.3-5.4-2.3-4.2 0-7.6 3.4-7.6 7.6 0 1.3 0.3 2.6 1 3.8l-1.1 4 4.1-1.1c1.1 0.6 2.4 0.9 3.7 0.9 4.2 0 7.6-3.4 7.6-7.6 0-2-0.8-3.9-2.3-5.3zm-5.4 11.7c-1.1 0-2.3-0.3-3.3-0.9l-0.2-0.1-2.4 0.6 0.6-2.3-0.1-0.2c-0.6-1-0.9-2.2-0.9-3.4 0-3.5 2.8-6.3 6.3-6.3 1.7 0 3.3 0.7 4.5 1.9s1.9 2.8 1.9 4.5c0 3.5-2.9 6.2-6.4 6.2zm3.5-4.7c-0.2-0.1-1.1-0.6-1.3-0.6-0.2-0.1-0.3-0.1-0.4 0.1-0.1 0.2-0.5 0.6-0.6 0.8-0.1 0.1-0.2 0.1-0.4 0-0.2-0.1-0.8-0.3-1.5-0.9-0.6-0.5-0.9-1.1-1-1.3-0.1-0.2 0-0.3 0.1-0.4 0.1-0.1 0.2-0.2 0.3-0.3 0.1-0.1 0.1-0.2 0.2-0.3 0.1-0.1 0-0.2 0-0.3 0-0.1-0.4-1.1-0.6-1.4-0.2-0.4-0.3-0.3-0.5-0.3h-0.3c-0.1 0-0.3 0-0.5 0.2-0.2 0.2-0.7 0.7-0.7 1.7s0.7 1.9 0.8 2.1c0.1 0.1 1.4 2.1 3.3 2.9 0.5 0.2 0.8 0.3 1.1 0.4 0.5 0.1 0.9 0.1 1.2 0.1 0.4-0.1 1.1-0.5 1.3-0.9 0.2-0.5 0.2-0.9 0.1-0.9-0.1-0.1-0.2-0.1-0.4-0.2z" fill="currentColor"/>
            </svg>
            Suporte via WhatsApp
          </a>
        </Card>
      </div>
    </PaymentContainer>
  );
} 