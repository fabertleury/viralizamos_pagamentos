'use client';

import Link from 'next/link';
import { Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo e informações */}
          <div className="flex flex-col">
            <div className="flex items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-pink-500">Viralizamos</span>
                <span className="text-sm font-medium px-2 py-1 bg-gray-800 rounded text-gray-300">Pagamentos</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Processamento seguro de pagamentos para serviços do Instagram.
            </p>
            <div className="flex mt-2">
              <a 
                href="https://www.instagram.com/viralizamos.ia" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white hover:text-pink-500 transition-colors"
              >
                <Instagram className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Menu */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Menu</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                  Início
                </Link>
              </li>
              <li>
                <Link href="/acompanhar-pedido" className="text-gray-400 hover:text-white transition-colors">
                  Acompanhar Pedido
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
                  Dúvidas Frequentes
                </Link>
              </li>
              <li>
                <a 
                  href="https://wa.me/5562999915390" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Suporte via WhatsApp
                </a>
              </li>
            </ul>
          </div>

          {/* Links importantes */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Links importantes</h3>
            <ul className="space-y-2">
              <li>
                <Link href="https://viralizamos.com/instagram/curtidas" className="text-gray-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                  Turbinar Curtidas
                </Link>
              </li>
              <li>
                <Link href="https://viralizamos.com/instagram/seguidores" className="text-gray-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                  Turbinar Seguidores
                </Link>
              </li>
              <li>
                <Link href="https://viralizamos.com/instagram/visualizacoes" className="text-gray-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                  Visualizações para Vídeos
                </Link>
              </li>
              <li>
                <Link href="https://viralizamos.com/instagram/comentarios" className="text-gray-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                  Turbinar Comentários
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Termos e Política */}
        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mb-4 md:mb-0">
            <Link href="/termos-de-uso" className="text-gray-400 hover:text-white transition-colors text-sm">
              Termos de Uso
            </Link>
            <Link href="/politica-de-privacidade" className="text-gray-400 hover:text-white transition-colors text-sm">
              Política de Privacidade
            </Link>
          </div>
          <div className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Viralizamos.com. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
} 