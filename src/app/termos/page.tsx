import Link from 'next/link';
import { 
  PaymentContainer, 
  Card, 
  Title,
  Text
} from '@/components/styles/payment-styles';

export default function TermosPage() {
  return (
    <PaymentContainer style={{ maxWidth: '800px', padding: '2rem 1rem' }}>
      <div style={{ width: '100%' }}>
        <Title>Termos de Uso</Title>
        <Text style={{ marginBottom: '2rem' }}>
          Última atualização: {new Date().toLocaleDateString()}
        </Text>
        
        <Card>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>1. Aceitação dos Termos</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            Ao utilizar o serviço de pagamentos da Viralizamos, você concorda em cumprir e estar sujeito a estes Termos de Uso.
            Se você não concorda com algum dos termos, não utilize nossos serviços.
          </Text>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>2. Descrição do Serviço</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            A Viralizamos Pagamentos processa pagamentos para serviços relacionados ao Instagram, incluindo, mas não se limitando a,
            aumento de curtidas, seguidores e visualizações. Nós atuamos como intermediários de pagamento entre você e os prestadores dos serviços.
          </Text>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>3. Privacidade</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            Ao utilizar nossos serviços, você concorda com nossa <Link href="/privacidade" style={{ color: '#db2777' }}>Política de Privacidade</Link>,
            que descreve como coletamos, usamos e compartilhamos suas informações.
          </Text>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>4. Reembolsos</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            Caso o serviço contratado não seja entregue conforme descrito, oferecemos reembolso total. Para solicitar um reembolso,
            entre em contato conosco dentro de 7 dias após a realização do pagamento.
          </Text>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>5. Limitação de Responsabilidade</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            A Viralizamos não é responsável por qualquer ação tomada pelo Instagram em sua conta como resultado dos serviços contratados.
            Ao utilizar nossos serviços, você reconhece os riscos envolvidos e entende que o Instagram pode tomar medidas contra contas que
            violem seus termos de uso.
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