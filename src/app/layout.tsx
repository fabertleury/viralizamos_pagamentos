import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import Script from 'next/script'

// Importar scripts de inicializacao
import "@/lib/startup";
import "@/lib/db-check";

// Não importar o Bootstrap no lado do servidor
// import BootstrapClient from "./bootstrap-client";

// Se necessário, podemos importar scripts do Bootstrap aqui
// import 'bootstrap/dist/js/bootstrap.bundle.min.js'; - não necessário para SSR

// Setup das fontes
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Viralizamos - Pagamento',
  description: 'Realize seu pagamento para serviços de Instagram',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        
        {/* Estilo crítico inline para garantir estilização básica mesmo se o CSS principal falhar */}
        <style dangerouslySetInnerHTML={{
          __html: `
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              margin: 0;
              padding: 0;
              color: rgb(15, 23, 42);
              background-color: rgb(255, 255, 255);
              line-height: 1.5;
            }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .flex-grow { flex-grow: 1; }
            .min-h-screen { min-height: 100vh; }
            .bg-white { background-color: white; }
            .text-pink-600 { color: #db2777; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-800 { color: #1f2937; }
            .bg-pink-600 { background-color: #db2777; }
            .bg-pink-700 { background-color: #be185d; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .bg-gray-200 { background-color: #e5e7eb; }
            .rounded { border-radius: 0.25rem; }
            .rounded-lg { border-radius: 0.5rem; }
            .border { border-width: 1px; border-style: solid; border-color: #e5e7eb; }
            .p-4 { padding: 1rem; }
            .p-6 { padding: 1.5rem; }
            .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
            .container { 
              max-width: 80rem; 
              margin-left: auto; 
              margin-right: auto; 
              padding-left: 1rem; 
              padding-right: 1rem; 
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-16904345570"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-16904345570');
          `}
        </Script>
        
        {/* Microsoft Clarity - Rastreamento de carrinho abandonado */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "rchf046tcf");
            
            // Configuração para rastreamento de carrinho abandonado
            if (typeof clarity === 'function') {
              document.addEventListener('DOMContentLoaded', function() {
                // Rastrear visualizações de página de carrinho
                if (window.location.pathname.includes('/pagamento')) {
                  clarity('set', 'cart_page_view', 1);
                }
              });
            }
          `}
        </Script>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
