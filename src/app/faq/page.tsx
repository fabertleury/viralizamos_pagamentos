import Link from 'next/link';
import { 
  PaymentContainer, 
  Card, 
  Title,
  Text
} from '@/components/styles/payment-styles';

export default function FAQPage() {
  return (
    <PaymentContainer style={{ maxWidth: '800px', padding: '2rem 1rem' }}>
      <div style={{ width: '100%' }}>
        <Title>Perguntas Frequentes</Title>
        <Text style={{ marginBottom: '2rem' }}>
          Encontre respostas para as perguntas mais comuns sobre nossos serviços.
        </Text>
        
        <Card>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Como funciona o pagamento?</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            Utilizamos o sistema PIX para receber pagamentos. Ao finalizar seu pedido, você receberá um QR Code
            que pode ser escaneado com o app do seu banco, ou um código PIX para copiar e colar.
          </Text>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Quanto tempo demora para o serviço ser ativado?</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            Após a confirmação do pagamento, o serviço é ativado automaticamente em até 1 hora.
          </Text>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Como faço para acompanhar meu pedido?</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            Você pode acompanhar seu pedido através da página <Link href="/acompanhar" style={{ color: '#db2777' }}>Acompanhar Pedido</Link>, 
            utilizando o código que enviamos para seu e-mail após a confirmação do pagamento.
          </Text>
        </Card>
        
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link href="/" style={{ color: '#db2777', textDecoration: 'none' }}>
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </PaymentContainer>
  );
} 