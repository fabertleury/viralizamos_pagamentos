'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Mail, Phone } from 'lucide-react';
import {
  FooterContainer,
  FooterContent,
  FooterLogo,
  FooterLogoText,
  FooterAbout,
  SocialLinks,
  SocialLink,
  FooterColumn,
  FooterHeading,
  FooterLinks,
  FooterLink,
  FooterContact,
  ContactItem,
  FooterCopyright,
  CopyrightText,
  FooterBottom,
  FooterBottomLink
} from "./footer-styles";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <FooterContainer>
      <FooterContent>
        {/* Coluna 1: Logo e Sobre */}
        <FooterColumn>
          <Link href="/" passHref legacyBehavior>
            <FooterLogo as="a">
              <Image src="/logo.svg" alt="Viralizamos" width={40} height={40} />
              <FooterLogoText>Viralizamos</FooterLogoText>
            </FooterLogo>
          </Link>
          
          <FooterAbout>
            <p>
              Impulsione sua presença no Instagram com nossos serviços de alta qualidade. 
              Pagamentos seguros e rápidos para seus pedidos.
            </p>
          </FooterAbout>
          
          <SocialLinks>
            <SocialLink href="https://www.instagram.com/viralizamos.ia" target="_blank" rel="noopener noreferrer">
              <Instagram size={20} />
            </SocialLink>
          </SocialLinks>
        </FooterColumn>

        {/* Coluna 2: Links */}
        <FooterColumn>
          <FooterHeading>Menu</FooterHeading>
          <FooterLinks>
            <FooterLink>
              <Link href="/">Início</Link>
            </FooterLink>
            <FooterLink>
              <Link href="/faq">FAQ</Link>
            </FooterLink>
            <FooterLink>
              <Link href="/acompanhar">Acompanhar Pedido</Link>
            </FooterLink>
            <FooterLink>
              <Link href="/termos">Termos de Uso</Link>
            </FooterLink>
            <FooterLink>
              <Link href="/privacidade">Política de Privacidade</Link>
            </FooterLink>
            <FooterLink>
              <a href="https://viralizamos.com" target="_blank" rel="noopener noreferrer">
                Site Principal
              </a>
            </FooterLink>
          </FooterLinks>
        </FooterColumn>

        {/* Coluna 3: Contato */}
        <FooterColumn>
          <FooterHeading>Contato</FooterHeading>
          <FooterContact>
            <ContactItem>
              <Mail size={18} />
              <span>contato@viralizamos.com</span>
            </ContactItem>
            <ContactItem>
              <Phone size={18} />
              <a 
                href="https://wa.me/5562999915390" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                +55 (62) 99991-5390
              </a>
            </ContactItem>
          </FooterContact>
        </FooterColumn>
      </FooterContent>

      <FooterCopyright>
        <CopyrightText>
          &copy; {currentYear} Viralizamos. Todos os direitos reservados.
        </CopyrightText>
        
        <FooterBottom>
          <Link href="/termos" legacyBehavior>
            <FooterBottomLink>Termos de Uso</FooterBottomLink>
          </Link>
          <Link href="/privacidade" legacyBehavior>
            <FooterBottomLink>Política de Privacidade</FooterBottomLink>
          </Link>
        </FooterBottom>
      </FooterCopyright>
    </FooterContainer>
  );
} 