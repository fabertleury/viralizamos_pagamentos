import Link from 'next/link';
import { 
  PaymentContainer, 
  Card, 
  Title,
  Text
} from '@/components/styles/payment-styles';

export default function PrivacidadePage() {
  return (
    <PaymentContainer style={{ maxWidth: '800px', padding: '2rem 1rem' }}>
      <div style={{ width: '100%' }}>
        <Title>Política de Privacidade</Title>
        <Text style={{ marginBottom: '2rem' }}>
          Última atualização: {new Date().toLocaleDateString()}
        </Text>
        
        <Card>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>1. Informações que Coletamos</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            Coletamos informações que você nos fornece diretamente quando utiliza nossos serviços, incluindo:
          </Text>
          <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>Nome completo</li>
            <li style={{ marginBottom: '0.5rem' }}>Endereço de e-mail</li>
            <li style={{ marginBottom: '0.5rem' }}>Número de telefone (opcional)</li>
            <li style={{ marginBottom: '0.5rem' }}>Nome de usuário do Instagram</li>
            <li style={{ marginBottom: '0.5rem' }}>Informações sobre as publicações do Instagram selecionadas</li>
          </ul>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>2. Como Usamos suas Informações</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            Utilizamos as informações coletadas para:
          </Text>
          <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>Processar pagamentos e fornecer os serviços contratados</li>
            <li style={{ marginBottom: '0.5rem' }}>Enviar confirmações e atualizações sobre seu pedido</li>
            <li style={{ marginBottom: '0.5rem' }}>Prestar suporte ao cliente</li>
            <li style={{ marginBottom: '0.5rem' }}>Melhorar nossos serviços e desenvolver novos recursos</li>
          </ul>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>3. Compartilhamento de Informações</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            Não vendemos suas informações pessoais a terceiros. Compartilhamos suas informações apenas com:
          </Text>
          <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              Processadores de pagamento para completar as transações
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Prestadores de serviços que nos ajudam a entregar os serviços contratados
            </li>
          </ul>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>4. Segurança</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            Utilizamos medidas de segurança técnicas e organizacionais para proteger suas informações pessoais contra acesso não autorizado,
            perda ou alteração. Todos os dados são transmitidos através de conexões seguras (HTTPS).
          </Text>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>5. Seus Direitos</h2>
          <Text style={{ marginBottom: '1.5rem' }}>
            Você tem o direito de acessar, corrigir ou solicitar a exclusão de suas informações pessoais. Para exercer esses direitos,
            entre em contato conosco através do e-mail: contato@viralizamos.com
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