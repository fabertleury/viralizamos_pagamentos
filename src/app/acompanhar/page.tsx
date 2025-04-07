'use client';

import { useState } from 'react';
import Link from 'next/link';

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
    <div className="max-w-4xl mx-auto p-6 flex flex-col items-center min-h-[calc(100vh-280px)]">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Acompanhar Pedido</h1>
        <p className="text-gray-600 mb-6">
          Digite o código do seu pedido para verificar o status.
        </p>
        
        <div className="bg-white rounded-lg shadow-md p-6 w-full mb-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="code" className="block mb-2 font-medium text-gray-600">
                Código do Pedido
              </label>
              <input 
                id="code"
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Exemplo: ORD-123456" 
                className="w-full p-3 border border-gray-200 rounded text-base"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`bg-primary-600 text-white px-4 py-3 rounded font-medium hover:bg-primary-700 transition-colors mt-4 ${
                isSubmitting ? 'opacity-70' : ''
              }`}
            >
              {isSubmitting ? 'Verificando...' : 'Verificar Status'}
            </button>
          </form>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 w-full">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Não tem o código?</h2>
          <p className="text-gray-600 mb-4">
            Se você não recebeu o código do seu pedido, verifique seu e-mail (incluindo a pasta de spam).
            Caso não encontre, entre em contato conosco pelo WhatsApp para obter ajuda.
          </p>
          
          <a 
            href="https://wa.me/5562999915390" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 bg-green-500 text-white rounded font-medium hover:bg-green-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.6 6.3c-1.4-1.5-3.3-2.3-5.4-2.3-4.2 0-7.6 3.4-7.6 7.6 0 1.3 0.3 2.6 1 3.8l-1.1 4 4.1-1.1c1.1 0.6 2.4 0.9 3.7 0.9 4.2 0 7.6-3.4 7.6-7.6 0-2-0.8-3.9-2.3-5.3zm-5.4 11.7c-1.1 0-2.3-0.3-3.3-0.9l-0.2-0.1-2.4 0.6 0.6-2.3-0.1-0.2c-0.6-1-0.9-2.2-0.9-3.4 0-3.5 2.8-6.3 6.3-6.3 1.7 0 3.3 0.7 4.5 1.9s1.9 2.8 1.9 4.5c0 3.5-2.9 6.2-6.4 6.2zm3.5-4.7c-0.2-0.1-1.1-0.6-1.3-0.6-0.2-0.1-0.3-0.1-0.4 0.1-0.1 0.2-0.5 0.6-0.6 0.8-0.1 0.1-0.2 0.1-0.4 0-0.2-0.1-0.8-0.3-1.5-0.9-0.6-0.5-0.9-1.1-1-1.3-0.1-0.2 0-0.3 0.1-0.4 0.1-0.1 0.2-0.2 0.3-0.3 0.1-0.1 0.1-0.2 0.2-0.3 0.1-0.1 0-0.2 0-0.3 0-0.1-0.4-1.1-0.6-1.4-0.2-0.4-0.3-0.3-0.5-0.3h-0.3c-0.1 0-0.3 0-0.5 0.2-0.2 0.2-0.7 0.7-0.7 1.7s0.7 1.9 0.8 2.1c0.1 0.1 1.4 2.1 3.3 2.9 0.5 0.2 0.8 0.3 1.1 0.4 0.5 0.1 0.9 0.1 1.2 0.1 0.4-0.1 1.1-0.5 1.3-0.9 0.2-0.5 0.2-0.9 0.1-0.9-0.1-0.1-0.2-0.1-0.4-0.2z" fill="currentColor"/>
            </svg>
            Suporte via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
} 