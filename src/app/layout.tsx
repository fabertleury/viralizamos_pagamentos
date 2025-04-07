import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

// Importar scripts de inicialização
import "@/lib/startup";
import "@/lib/db-check";

// Não importar o Bootstrap no lado do servidor
// import BootstrapClient from "./bootstrap-client";

// Se necessário, podemos importar scripts do Bootstrap aqui
// import 'bootstrap/dist/js/bootstrap.bundle.min.js'; - não necessário para SSR

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Viralizamos Pagamentos",
  description: "Sistema de pagamentos da Viralizamos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${robotoMono.variable}`}>
        {/* <BootstrapClient /> */}
        {children}
      </body>
    </html>
  );
}
