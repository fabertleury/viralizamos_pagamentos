'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsSticky(scrollPosition > 100); // Fica sticky após 100px de rolagem
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Disable body scroll when mobile menu is open
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isMenuOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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
            <Image
              src="/logo.webp"
              alt="Viralizamos"
              width={150}
              height={50}
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
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
            <Link href="/" className={`text-gray-700 hover:text-[#C43582] ${pathname === '/' ? 'text-[#C43582] font-semibold' : ''}`}>
              Início
            </Link>
            
            <Link 
              href="/faq" 
              className={`text-gray-700 hover:text-[#C43582] ${pathname === '/faq' ? 'text-[#C43582] font-semibold' : ''}`}
            >
              FAQ
            </Link>
            
            {/* Action Buttons */}
            <button className="font-medium bg-[#C43582] text-white hover:bg-[#a62c6c] px-4 py-2 rounded">
              <Link href="/acompanhar">
                Acompanhar Pedido
              </Link>
            </button>
            
            <button className="font-medium bg-[#C43582] text-white hover:bg-[#a62c6c] px-4 py-2 rounded">
              <a href="https://viralizamos.com" target="_blank" rel="noopener noreferrer">
                Voltar ao site
              </a>
            </button>
          </nav>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="fixed inset-0 bg-white z-40 pt-20">
              <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col space-y-4">
                  <Link 
                    href="/" 
                    className="text-gray-700 hover:text-[#C43582] py-2 border-b"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Início
                  </Link>
                  
                  <Link 
                    href="/faq" 
                    className="text-gray-700 hover:text-[#C43582] py-2 border-b"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    FAQ
                  </Link>
                  
                  <Link 
                    href="/termos" 
                    className="text-gray-700 hover:text-[#C43582] py-2 border-b"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Termos de Uso
                  </Link>
                  
                  <Link 
                    href="/privacidade" 
                    className="text-gray-700 hover:text-[#C43582] py-2 border-b"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Política de Privacidade
                  </Link>
                  
                  <div className="pt-4">
                    <button 
                      className="w-full font-medium bg-[#C43582] text-white hover:bg-[#a62c6c] px-4 py-2 rounded mb-3"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Link href="/acompanhar">
                        Acompanhar Pedido
                      </Link>
                    </button>
                    
                    <button 
                      className="w-full font-medium bg-[#C43582] text-white hover:bg-[#a62c6c] px-4 py-2 rounded"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <a href="https://viralizamos.com" target="_blank" rel="noopener noreferrer">
                        Voltar ao site
                      </a>
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