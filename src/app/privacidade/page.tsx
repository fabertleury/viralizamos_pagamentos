import Link from 'next/link';

export default function PrivacidadePage() {
  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col items-center min-h-[calc(100vh-280px)]">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Política de Privacidade</h1>
        <p className="text-gray-600 mb-6">
          Última atualização: {new Date().toLocaleDateString()}
        </p>
        
        <div className="bg-white rounded-lg shadow-md p-6 w-full mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">1. Informações que Coletamos</h2>
          <p className="text-gray-600 mb-3">
            Coletamos informações que você nos fornece diretamente quando utiliza nossos serviços, incluindo:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-600">
            <li className="mb-2">Nome completo</li>
            <li className="mb-2">Endereço de e-mail</li>
            <li className="mb-2">Número de telefone (opcional)</li>
            <li className="mb-2">Nome de usuário do Instagram</li>
            <li className="mb-2">Informações sobre as publicações do Instagram selecionadas</li>
          </ul>
          
          <h2 className="text-xl font-semibold text-gray-700 mb-4">2. Como Usamos suas Informações</h2>
          <p className="text-gray-600 mb-3">
            Utilizamos as informações coletadas para:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-600">
            <li className="mb-2">Processar pagamentos e fornecer os serviços contratados</li>
            <li className="mb-2">Enviar confirmações e atualizações sobre seu pedido</li>
            <li className="mb-2">Prestar suporte ao cliente</li>
            <li className="mb-2">Melhorar nossos serviços e desenvolver novos recursos</li>
          </ul>
          
          <h2 className="text-xl font-semibold text-gray-700 mb-4">3. Compartilhamento de Informações</h2>
          <p className="text-gray-600 mb-3">
            Não vendemos suas informações pessoais a terceiros. Compartilhamos suas informações apenas com:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-600">
            <li className="mb-2">
              Processadores de pagamento para completar as transações
            </li>
            <li className="mb-2">
              Prestadores de serviços que nos ajudam a entregar os serviços contratados
            </li>
          </ul>
          
          <h2 className="text-xl font-semibold text-gray-700 mb-4">4. Segurança</h2>
          <p className="text-gray-600 mb-6">
            Utilizamos medidas de segurança técnicas e organizacionais para proteger suas informações pessoais contra acesso não autorizado,
            perda ou alteração. Todos os dados são transmitidos através de conexões seguras (HTTPS).
          </p>
          
          <h2 className="text-xl font-semibold text-gray-700 mb-4">5. Seus Direitos</h2>
          <p className="text-gray-600 mb-6">
            Você tem o direito de acessar, corrigir ou solicitar a exclusão de suas informações pessoais. Para exercer esses direitos,
            entre em contato conosco através do e-mail: contato@viralizamos.com
          </p>
        </div>
        
        <div className="text-center mt-6">
          <Link href="/" className="text-primary-600 hover:text-primary-700">
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
} 