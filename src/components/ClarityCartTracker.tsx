"use client";

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';

interface ClarityCartTrackerProps {
  token?: string;
  amount?: number;
  serviceName?: string;
  customerEmail?: string;
  status?: string;
  timeRemaining?: number;
}

/**
 * Componente para rastreamento de carrinhos abandonados com Microsoft Clarity
 * 
 * Este componente rastreia eventos importantes no fluxo de pagamento:
 * - Visualização do carrinho
 * - Tempo gasto na página
 * - Abandono do carrinho (quando o usuário sai sem concluir)
 * - Conclusão do pagamento
 */
export default function ClarityCartTracker({
  token,
  amount,
  serviceName,
  customerEmail,
  status,
  timeRemaining
}: ClarityCartTrackerProps) {
  
  // Função para enviar eventos para o PostgreSQL
  const sendEventToDatabase = async (eventType: string, eventData: any) => {
    try {
      const response = await fetch('/api/analytics/clarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: eventType,
          data: eventData,
          cart_token: token,
          cart_amount: amount,
          service_name: serviceName,
          customer_email: customerEmail,
          time_spent: eventData.time_spent || null,
          user_agent: navigator.userAgent,
          page_url: window.location.href
        }),
      });

      if (!response.ok) {
        console.error('Erro ao enviar evento para o banco de dados');
      }
    } catch (error) {
      console.error('Erro ao enviar evento:', error);
    }
  };

  // Rastrear visualização do carrinho
  useEffect(() => {
    if (typeof window !== 'undefined' && token && amount) {
      // Registrar evento de visualização do carrinho
      if (typeof (window as any).clarity === 'function') {
        // Dados do evento
        const cartViewData = {
          token,
          amount,
          service: serviceName || 'Não especificado',
          email: customerEmail || 'Não disponível'
        };
        
        // Enviar para o Clarity
        (window as any).clarity('set', 'cart_view', cartViewData);
        
        // Enviar para o banco de dados
        sendEventToDatabase('cart_view', cartViewData);
        
        // Registrar evento de início de checkout
        const cartStartData = {
          token,
          amount,
          service: serviceName || 'Não especificado'
        };
        
        // Enviar para o Clarity
        (window as any).clarity('event', 'cart_started', cartStartData);
        
        // Enviar para o banco de dados
        sendEventToDatabase('cart_started', cartStartData);
        
        // Registrar timestamp para calcular tempo gasto
        sessionStorage.setItem('cart_start_time', Date.now().toString());
      }
    }
    
    // Função para rastrear abandono do carrinho quando o usuário sai da página
    const handleBeforeUnload = () => {
      if (typeof (window as any).clarity === 'function' && status !== 'approved') {
        const startTime = parseInt(sessionStorage.getItem('cart_start_time') || '0');
        const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        
        // Dados do evento de abandono
        const abandonData = {
          token,
          amount,
          service: serviceName,
          time_spent: timeSpent,
          time_remaining: timeRemaining || 0
        };
        
        // Registrar evento de abandono do carrinho no Clarity
        (window as any).clarity('event', 'cart_abandoned', abandonData);
        
        // Enviar para o banco de dados usando sendBeacon para garantir que os dados sejam enviados
        // mesmo quando a página está sendo fechada
        const blob = new Blob([
          JSON.stringify({
            event_type: 'cart_abandoned',
            data: abandonData,
            cart_token: token,
            cart_amount: amount,
            service_name: serviceName,
            customer_email: customerEmail,
            time_spent: timeSpent,
            user_agent: navigator.userAgent,
            page_url: window.location.href
          })
        ], { type: 'application/json' });
        
        navigator.sendBeacon('/api/analytics/clarity', blob);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [token, amount, serviceName, customerEmail, status, timeRemaining]);
  
  // Rastrear mudanças de status
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof (window as any).clarity === 'function' && status) {
      // Dados do evento de status
      const statusData = {
        token,
        amount,
        service: serviceName
      };
      
      // Enviar para o Clarity
      (window as any).clarity('event', `payment_status_${status}`, statusData);
      
      // Enviar para o banco de dados
      sendEventToDatabase(`payment_status_${status}`, statusData);
      
      // Se o pagamento foi aprovado, registrar evento de conclusão
      if (status === 'approved') {
        const startTime = parseInt(sessionStorage.getItem('cart_start_time') || '0');
        const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        
        // Dados do evento de conclusão
        const completedData = {
          token,
          amount,
          service: serviceName,
          time_spent: timeSpent
        };
        
        // Enviar para o Clarity
        (window as any).clarity('event', 'cart_completed', completedData);
        
        // Enviar para o banco de dados
        sendEventToDatabase('cart_completed', completedData);
        
        // Marcar o checkout como concluído para evitar evento de abandono
        sessionStorage.setItem('checkout_completed', 'true');
      }
    }
  }, [status, token, amount, serviceName]);
  
  // Rastrear tempo gasto na página a cada 30 segundos
  useEffect(() => {
    if (typeof window !== 'undefined' && token) {
      const interval = setInterval(() => {
        if (typeof (window as any).clarity === 'function') {
          const startTime = parseInt(sessionStorage.getItem('cart_start_time') || '0');
          const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
          
          // Enviar para o Clarity
          (window as any).clarity('set', 'time_in_cart', timeSpent);
          
          // Enviar para o banco de dados a cada minuto (2 intervalos)
          if (timeSpent % 60 === 0 && timeSpent > 0) {
            sendEventToDatabase('time_in_cart_update', {
              token,
              amount,
              service: serviceName,
              time_spent: timeSpent
            });
          }
        }
      }, 30000); // Atualizar a cada 30 segundos
      
      return () => clearInterval(interval);
    }
  }, [token, amount, serviceName]);
  
  return (
    <Script id="clarity-cart-tracking" strategy="afterInteractive">
      {`
        // Funções auxiliares para rastreamento de carrinho
        window.trackCartEvent = function(eventName, data) {
          if (typeof clarity === 'function') {
            clarity('event', eventName, data);
          }
        };
        
        // Configurar rastreamento de cliques em botões importantes
        document.addEventListener('DOMContentLoaded', function() {
          // Rastrear cliques no botão "Já paguei"
          const paymentButtons = document.querySelectorAll('button[data-action="check-payment"]');
          paymentButtons.forEach(function(button) {
            button.addEventListener('click', function() {
              if (typeof clarity === 'function') {
                // Dados do evento
                const eventData = {
                  token: '${token || ''}',
                  amount: ${amount || 0}
                };
                
                // Enviar para o Clarity
                clarity('event', 'payment_check_clicked', eventData);
                
                // Enviar para o banco de dados
                fetch('/api/analytics/clarity', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    event_type: 'payment_check_clicked',
                    data: eventData,
                    cart_token: '${token || ''}',
                    cart_amount: ${amount || 0},
                    service_name: '${serviceName || ''}',
                    customer_email: '${customerEmail || ''}',
                    page_url: window.location.href
                  })
                });
              }
            });
          });
          
          // Rastrear cliques no botão "Copiar código PIX"
          const copyButtons = document.querySelectorAll('button[data-action="copy-pix"]');
          copyButtons.forEach(function(button) {
            button.addEventListener('click', function() {
              if (typeof clarity === 'function') {
                // Dados do evento
                const eventData = {
                  token: '${token || ''}',
                  amount: ${amount || 0}
                };
                
                // Enviar para o Clarity
                clarity('event', 'pix_code_copied', eventData);
                
                // Enviar para o banco de dados
                fetch('/api/analytics/clarity', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    event_type: 'pix_code_copied',
                    data: eventData,
                    cart_token: '${token || ''}',
                    cart_amount: ${amount || 0},
                    service_name: '${serviceName || ''}',
                    customer_email: '${customerEmail || ''}',
                    page_url: window.location.href
                  })
                });
              }
            });
          });
        });
      `}
    </Script>
  );
}
