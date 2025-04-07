'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Mail, Phone } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo e informações */}
          <div className="flex flex-col">
            <Link href="/" className="flex items-center mb-4">
              <Image 
                src="/logo.svg" 
                alt="Viralizamos" 
                width={40} 
                height={40} 
                className="h-10 w-auto"
              />
              <span className="ml-3 text-xl font-bold">Viralizamos</span>
            </Link>
            <p className="text-gray-400 text-sm mb-4">
              Impulsione sua presença no Instagram com nossos serviços de alta qualidade.
              Pagamentos seguros e rápidos para seus pedidos.
            </p>
            <div className="flex mt-2">
              <a 
                href="https://www.instagram.com/viralizamos.ia" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white hover:text-primary-500 transition-colors"
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
                <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/acompanhar" className="text-gray-400 hover:text-white transition-colors">
                  Acompanhar Pedido
                </Link>
              </li>
              <li>
                <Link href="/termos" className="text-gray-400 hover:text-white transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="text-gray-400 hover:text-white transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <a 
                  href="https://viralizamos.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Site Principal
                </a>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <div className="space-y-3">
              <div className="flex items-center text-gray-400">
                <Mail className="w-5 h-5 mr-3" />
                <span>contato@viralizamos.com</span>
              </div>
              <div className="flex items-center text-gray-400">
                <Phone className="w-5 h-5 mr-3" />
                <a 
                  href="https://wa.me/5562999915390" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-white transition-colors"
                >
                  +55 (62) 99991-5390
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright e Links */}
        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mb-4 md:mb-0">
            <Link href="/termos" className="text-gray-400 hover:text-white transition-colors text-sm">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="text-gray-400 hover:text-white transition-colors text-sm">
              Política de Privacidade
            </Link>
          </div>
          <div className="text-gray-500 text-sm">
            &copy; {currentYear} Viralizamos. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
} 