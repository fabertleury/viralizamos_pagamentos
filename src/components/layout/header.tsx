'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import {
  HeaderContainer,
  HeaderContent,
  Logo,
  LogoText,
  LogoSubtext,
  Nav,
  NavLink,
  MobileMenuButton,
  DesktopNav,
  MobileNav,
  MobileNavHeader,
  CloseButton
} from "./header-styles";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHomePage = true; // No servidor, podemos definir estaticamente ou usar outras técnicas

  return (
    <HeaderContainer>
      <HeaderContent>
        <Link href="/" passHref legacyBehavior>
          <a style={{ textDecoration: 'none' }}>
            <Logo>
              <Image
                src="/logo.svg"
                alt="Viralizamos Logo"
                width={32}
                height={32}
              />
              <LogoText>
                Viralizamos
                <LogoSubtext>Pagamentos</LogoSubtext>
              </LogoText>
            </Logo>
          </a>
        </Link>

        <MobileMenuButton onClick={() => setIsMenuOpen(true)}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 6H20M4 12H20M4 18H20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </MobileMenuButton>

        <DesktopNav>
          <Nav>
            <Link href="/" passHref legacyBehavior>
              <NavLink className={isHomePage ? "active" : ""}>Início</NavLink>
            </Link>
            <Link href="/faq" passHref legacyBehavior>
              <NavLink>FAQ</NavLink>
            </Link>
            <Link href="/acompanhar" passHref legacyBehavior>
              <NavLink>Acompanhar Pedido</NavLink>
            </Link>
          </Nav>
        </DesktopNav>

        <MobileNav isOpen={isMenuOpen}>
          <MobileNavHeader>
            <Logo>
              <Image
                src="/logo.svg"
                alt="Viralizamos Logo"
                width={32}
                height={32}
              />
              <LogoText>
                Viralizamos
                <LogoSubtext>Pagamentos</LogoSubtext>
              </LogoText>
            </Logo>

            <CloseButton onClick={() => setIsMenuOpen(false)}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </CloseButton>
          </MobileNavHeader>

          <Nav style={{ flexDirection: 'column', fontSize: '1.125rem' }}>
            <Link href="/" passHref legacyBehavior>
              <NavLink onClick={() => setIsMenuOpen(false)}>Início</NavLink>
            </Link>
            <Link href="/faq" passHref legacyBehavior>
              <NavLink onClick={() => setIsMenuOpen(false)}>FAQ</NavLink>
            </Link>
            <Link href="/acompanhar" passHref legacyBehavior>
              <NavLink onClick={() => setIsMenuOpen(false)}>Acompanhar Pedido</NavLink>
            </Link>
          </Nav>
        </MobileNav>
      </HeaderContent>
    </HeaderContainer>
  );
} 