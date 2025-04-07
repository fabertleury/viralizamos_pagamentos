'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [logoError, setLogoError] = useState(false);
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

  const handleLogoError = () => {
    setLogoError(true);
  };

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
            {logoError ? (
              <span className="text-xl font-bold text-pink-600">Viralizamos</span>
            ) : (
              <Image
                src="/logo.webp"
                alt="Viralizamos"
                width={150}
                height={50}
                style={{ width: 'auto', height: 'auto' }}
                priority
                onError={handleLogoError}
              />
            )}
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="block md:hidden p-2 z-50"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex gap-6">
              <Link 
                href="/faq" 
                className={`text-gray-600 font-medium hover:text-pink-600 transition-colors ${
                  pathname === '/faq' ? 'text-pink-600 font-semibold' : ''
                }`}
              >
                FAQ
              </Link>
              <Link 
                href="/acompanhar" 
                className={`text-gray-600 font-medium hover:text-pink-600 transition-colors ${
                  pathname === '/acompanhar' ? 'text-pink-600 font-semibold' : ''
                }`}
              >
                Acompanhar pedido
              </Link>
              <Link 
                href="/termos" 
                className={`text-gray-600 font-medium hover:text-pink-600 transition-colors ${
                  pathname === '/termos' ? 'text-pink-600 font-semibold' : ''
                }`}
              >
                Termos de uso
              </Link>
              <Link 
                href="/privacidade" 
                className={`text-gray-600 font-medium hover:text-pink-600 transition-colors ${
                  pathname === '/privacidade' ? 'text-pink-600 font-semibold' : ''
                }`}
              >
                Privacidade
              </Link>
            </nav>
            <a 
              href="https://viralizamos.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-pink-600 text-white px-4 py-2 rounded font-medium hover:bg-pink-700 transition-colors"
            >
              Voltar ao site
            </a>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="fixed inset-0 bg-white z-40 pt-20">
              <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col space-y-4">
                  <Link 
                    href="/faq" 
                    className="text-gray-700 hover:text-pink-600 py-2 border-b"
                    onClick={() => setIsOpen(false)}
                  >
                    FAQ
                  </Link>
                  
                  <Link 
                    href="/acompanhar" 
                    className="text-gray-700 hover:text-pink-600 py-2 border-b"
                    onClick={() => setIsOpen(false)}
                  >
                    Acompanhar pedido
                  </Link>
                  
                  <Link 
                    href="/termos" 
                    className="text-gray-700 hover:text-pink-600 py-2 border-b"
                    onClick={() => setIsOpen(false)}
                  >
                    Termos de uso
                  </Link>
                  
                  <Link 
                    href="/privacidade" 
                    className="text-gray-700 hover:text-pink-600 py-2 border-b"
                    onClick={() => setIsOpen(false)}
                  >
                    Privacidade
                  </Link>
                  
                  <a 
                    href="https://viralizamos.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 block w-full bg-pink-600 text-white text-center px-4 py-3 rounded font-medium hover:bg-pink-700 transition-colors"
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