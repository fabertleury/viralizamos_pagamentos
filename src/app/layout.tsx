import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";

// Importar scripts de inicializacao
import "@/lib/startup";
import "@/lib/db-check";

// Não importar o Bootstrap no lado do servidor
// import BootstrapClient from "./bootstrap-client";

// Se necessário, podemos importar scripts do Bootstrap aqui
// import 'bootstrap/dist/js/bootstrap.bundle.min.js'; - não necessário para SSR

// Setup das fontes
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Viralizamos Pagamentos",
  description: "Plataforma de pagamentos da Viralizamos para serviços do Instagram",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-grow">
          {/* <BootstrapClient /> */}
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
