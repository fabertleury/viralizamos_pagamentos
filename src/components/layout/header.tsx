'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsSticky(scrollPosition > 100); // Fica sticky após 100px de rolagem
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`
        bg-white border-b transition-all duration-300 z-[9999]
        ${isSticky 
          ? 'fixed top-0 left-0 right-0 shadow-md animate-slide-down' 
          : 'relative'
        }
      `}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-pink-600">Viralizamos</span>
              <span className="text-sm font-medium px-2 py-1 bg-gray-100 rounded text-gray-500">Pagamentos</span>
            </div>
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="block md:hidden p-2 z-50"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-700 hover:text-primary">
              Início
            </Link>
            
            <Link href="/faq" className="text-gray-700 hover:text-primary">
              FAQ
            </Link>
            
            {/* Action Buttons */}
            <button className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition-colors font-medium">
              <Link href="/acompanhar-pedido">
                Acompanhar Pedido
              </Link>
            </button>
          </nav>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="fixed inset-0 bg-white z-40 pt-20">
              <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col space-y-4">
                  <Link 
                    href="/" 
                    className="text-gray-700 hover:text-primary py-2 border-b"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Início
                  </Link>
                  
                  <Link 
                    href="/faq" 
                    className="text-gray-700 hover:text-primary py-2 border-b"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    FAQ
                  </Link>
                  
                  <div className="pt-4">
                    <button 
                      className="w-full bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition-colors font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Link href="/acompanhar-pedido">
                        Acompanhar Pedido
                      </Link>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 