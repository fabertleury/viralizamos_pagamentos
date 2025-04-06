export default function PaymentHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-600 to-indigo-600 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h1 className="text-2xl font-bold text-indigo-600">Viralizamos Pagamentos</h1>
        </div>
        
        <p className="text-gray-700 mb-6">
          Bem-vindo à plataforma de pagamentos da Viralizamos. 
          Para acessar uma página de pagamento, você precisa utilizar o token fornecido.
        </p>
        
        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-8">
          <p>Esta é a página inicial do sistema de pagamentos. Os links para pagamentos específicos são enviados diretamente aos clientes.</p>
        </div>
        
        <p className="text-gray-500 text-sm">
          Para dúvidas ou suporte, entre em contato conosco.
        </p>
        
        <div className="mt-8 text-center text-gray-500 text-xs">
          <p>© {new Date().getFullYear()} Viralizamos</p>
        </div>
      </div>
    </div>
  );
} 