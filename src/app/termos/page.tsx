import Link from 'next/link';

export default function TermosPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col items-center min-h-[calc(100vh-280px)]">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Termos de Uso</h1>
        <p className="text-gray-600 mb-6">
          Última atualização: {new Date().toLocaleDateString()}
        </p>
        
        <div className="bg-white rounded-lg shadow-md p-6 w-full mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">1. Aceitação dos Termos</h2>
          <p className="text-gray-600 mb-6">
            Ao utilizar o serviço de pagamentos da Viralizamos, você concorda em cumprir e estar sujeito a estes Termos de Uso.
            Se você não concorda com algum dos termos, não utilize nossos serviços.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-700 mb-4">2. Descrição do Serviço</h2>
          <p className="text-gray-600 mb-6">
            A Viralizamos Pagamentos processa pagamentos para serviços relacionados ao Instagram, incluindo, mas não se limitando a,
            aumento de curtidas, seguidores e visualizações. Nós atuamos como intermediários de pagamento entre você e os prestadores dos serviços.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-700 mb-4">3. Privacidade</h2>
          <p className="text-gray-600 mb-6">
            Ao utilizar nossos serviços, você concorda com nossa <Link href="/privacidade" className="text-pink-600 hover:text-pink-700">Política de Privacidade</Link>,
            que descreve como coletamos, usamos e compartilhamos suas informações.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-700 mb-4">4. Reembolsos</h2>
          <p className="text-gray-600 mb-6">
            Caso o serviço contratado não seja entregue conforme descrito, oferecemos reembolso total. Para solicitar um reembolso,
            entre em contato conosco dentro de 7 dias após a realização do pagamento.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-700 mb-4">5. Limitação de Responsabilidade</h2>
          <p className="text-gray-600 mb-6">
            A Viralizamos não é responsável por qualquer ação tomada pelo Instagram em sua conta como resultado dos serviços contratados.
            Ao utilizar nossos serviços, você reconhece os riscos envolvidos e entende que o Instagram pode tomar medidas contra contas que
            violem seus termos de uso.
          </p>
        </div>
        
        <div className="text-center mt-6">
          <Link href="/" className="text-pink-600 hover:text-pink-700">
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
} 