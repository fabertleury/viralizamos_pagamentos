'use client';

import React, { useState } from 'react';
import { Button, useToast, ButtonProps } from '@chakra-ui/react';

interface PixPaymentButtonProps extends Omit<ButtonProps, 'onClick' | 'isLoading' | 'loadingText' | 'onError'> {
  paymentRequestId: string;
  onSuccess: (paymentData: {
    id: string;
    status: string;
    method: string;
    pix_code: string;
    pix_qrcode: string;
    amount: number;
  }) => void;
  onError: (error: string) => void;
}

const PixPaymentButton: React.FC<PixPaymentButtonProps> = ({ 
  paymentRequestId, 
  onSuccess, 
  onError,
  colorScheme = "pink",
  size = "lg",
  width = "100%",
  ...restProps 
}) => {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleClick = async () => {
    setLoading(true);
    try {
      // Fazer requisição diretamente à API de pagamento sem autenticação
      const response = await fetch('/api/payment-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_request_id: paymentRequestId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar pagamento');
      }

      const paymentData = await response.json();
      console.log('Pagamento PIX criado com sucesso:', paymentData);
      
      // Notificar o componente pai sobre o sucesso
      if (paymentData.payment) {
        onSuccess({
          id: paymentData.payment.id,
          status: paymentData.payment.status,
          method: paymentData.payment.method,
          pix_code: paymentData.payment.pix_code,
          pix_qrcode: paymentData.payment.pix_qrcode,
          amount: paymentData.payment.amount
        });
      } else {
        throw new Error('Dados de pagamento incompletos na resposta');
      }
      
      toast({
        title: 'Pagamento gerado',
        description: 'O código PIX foi gerado com sucesso.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Erro ao criar pagamento PIX:', error);
      
      // Notificar o componente pai sobre o erro
      onError(error instanceof Error ? error.message : 'Erro desconhecido');
      
      toast({
        title: 'Erro no pagamento',
        description: error instanceof Error ? error.message : 'Erro ao processar pagamento',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      colorScheme={colorScheme}
      size={size}
      width={width}
      onClick={handleClick}
      isLoading={loading}
      loadingText="Gerando PIX..."
      {...restProps}
    >
      Pagar com PIX
    </Button>
  );
};

export default PixPaymentButton; 