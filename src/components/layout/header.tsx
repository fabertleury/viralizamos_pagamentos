'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Disable body scroll when mobile menu is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header 
      className={`
        bg-white border-b transition-all duration-300 z-50
        ${isSticky ? 'fixed top-0 left-0 right-0 shadow-md' : 'relative'}
      `}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image 
              src="/logo.svg" 
              alt="Viralizamos" 
              width={40} 
              height={40} 
              className="h-10 w-auto"
            />
            <div className="font-bold text-xl text-primary-600">
              Viralizamos
              <span className="inline-block text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded ml-2">
                Pagamentos
              </span>
            </div>
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="block md:hidden p-2 text-gray-500"
            onClick={() => setIsOpen(true)}
          >
            <Menu size={24} />
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex gap-6">
              <Link 
                href="/faq" 
                className={`text-gray-600 font-medium hover:text-primary-600 transition-colors ${
                  pathname === '/faq' ? 'text-primary-600 font-semibold' : ''
                }`}
              >
                FAQ
              </Link>
              <Link 
                href="/acompanhar" 
                className={`text-gray-600 font-medium hover:text-primary-600 transition-colors ${
                  pathname === '/acompanhar' ? 'text-primary-600 font-semibold' : ''
                }`}
              >
                Acompanhar pedido
              </Link>
              <Link 
                href="/termos" 
                className={`text-gray-600 font-medium hover:text-primary-600 transition-colors ${
                  pathname === '/termos' ? 'text-primary-600 font-semibold' : ''
                }`}
              >
                Termos de uso
              </Link>
              <Link 
                href="/privacidade" 
                className={`text-gray-600 font-medium hover:text-primary-600 transition-colors ${
                  pathname === '/privacidade' ? 'text-primary-600 font-semibold' : ''
                }`}
              >
                Privacidade
              </Link>
            </nav>
            <a 
              href="https://viralizamos.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-primary-600 text-white px-4 py-2 rounded font-medium hover:bg-primary-700 transition-colors"
            >
              Voltar ao site
            </a>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="fixed inset-0 bg-white z-50">
              <div className="container mx-auto px-4 py-4">
                <div className="flex justify-between items-center mb-8">
                  <Link href="/" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
                    <Image 
                      src="/logo.svg" 
                      alt="Viralizamos" 
                      width={40} 
                      height={40}
                      className="h-10 w-auto" 
                    />
                    <div className="font-bold text-xl text-primary-600">
                      Viralizamos
                      <span className="inline-block text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded ml-2">
                        Pagamentos
                      </span>
                    </div>
                  </Link>
                  <button
                    className="p-2 text-gray-500"
                    onClick={() => setIsOpen(false)}
                  >
                    <X size={24} />
                  </button>
                </div>
                <nav className="flex flex-col gap-4">
                  <Link 
                    href="/faq" 
                    className="text-gray-600 font-medium py-3 border-b border-gray-100 hover:text-primary-600"
                    onClick={() => setIsOpen(false)}
                  >
                    FAQ
                  </Link>
                  <Link 
                    href="/acompanhar" 
                    className="text-gray-600 font-medium py-3 border-b border-gray-100 hover:text-primary-600"
                    onClick={() => setIsOpen(false)}
                  >
                    Acompanhar pedido
                  </Link>
                  <Link 
                    href="/termos" 
                    className="text-gray-600 font-medium py-3 border-b border-gray-100 hover:text-primary-600"
                    onClick={() => setIsOpen(false)}
                  >
                    Termos de uso
                  </Link>
                  <Link 
                    href="/privacidade" 
                    className="text-gray-600 font-medium py-3 border-b border-gray-100 hover:text-primary-600"
                    onClick={() => setIsOpen(false)}
                  >
                    Privacidade
                  </Link>
                </nav>
                <div className="mt-6">
                  <a 
                    href="https://viralizamos.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full bg-primary-600 text-white text-center px-4 py-3 rounded font-medium hover:bg-primary-700 transition-colors"
                  >
                    Voltar ao site
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 