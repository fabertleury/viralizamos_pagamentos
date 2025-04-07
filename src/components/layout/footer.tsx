'use client';

import Link from 'next/link';
import { Instagram } from 'lucide-react';
import {
  FooterContainer,
  FooterContent,
  FooterLogo,
  FooterLinks,
  FooterLink,
  Copyright
} from "./footer-styles";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <FooterContainer>
      <FooterContent>
        <div>
          <FooterLogo>
            <span style={{ fontWeight: 'bold', color: '#db2777' }}>Viralizamos</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Pagamentos</span>
          </FooterLogo>
          
          <Copyright>
            &copy; {currentYear} Viralizamos. Todos os direitos reservados.
          </Copyright>
        </div>

        <FooterLinks>
          <Link href="/" passHref legacyBehavior>
            <FooterLink>Início</FooterLink>
          </Link>
          <Link href="/faq" passHref legacyBehavior>
            <FooterLink>FAQ</FooterLink>
          </Link>
          <Link href="/acompanhar" passHref legacyBehavior>
            <FooterLink>Acompanhar Pedido</FooterLink>
          </Link>
          <Link href="/termos" passHref legacyBehavior>
            <FooterLink>Termos de Uso</FooterLink>
          </Link>
          <Link href="/privacidade" passHref legacyBehavior>
            <FooterLink>Política de Privacidade</FooterLink>
          </Link>
        </FooterLinks>
      </FooterContent>
    </FooterContainer>
  );
} 