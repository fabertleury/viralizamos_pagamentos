import Link from 'next/link';

export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col items-center min-h-[calc(100vh-280px)]">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Perguntas Frequentes</h1>
        <p className="text-gray-600 mb-6">
          Encontre respostas para as perguntas mais comuns sobre nossos serviços.
        </p>
        
        <div className="bg-white rounded-lg shadow-md p-6 w-full mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Como funciona o pagamento?</h2>
          <p className="text-gray-600 mb-6">
            Utilizamos o sistema PIX para receber pagamentos. Ao finalizar seu pedido, você receberá um QR Code
            que pode ser escaneado com o app do seu banco, ou um código PIX para copiar e colar.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Quanto tempo demora para o serviço ser ativado?</h2>
          <p className="text-gray-600 mb-6">
            Após a confirmação do pagamento, o serviço é ativado automaticamente em até 1 hora.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Como faço para acompanhar meu pedido?</h2>
          <p className="text-gray-600 mb-6">
            Você pode acompanhar seu pedido através da página <Link href="/acompanhar" className="text-primary-600 hover:text-primary-700">Acompanhar Pedido</Link>, 
            utilizando o código que enviamos para seu e-mail após a confirmação do pagamento.
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