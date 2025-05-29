import { useState } from 'react';
import { Button } from '@chakra-ui/react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface UpdateOrderStatusButtonProps {
  orderId: string;
  status: string;
  onStatusUpdated?: (newStatus: string) => void;
}

export const UpdateOrderStatusButton = ({ orderId, status, onStatusUpdated }: UpdateOrderStatusButtonProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateOrderStatus = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      // Chamar a API para verificar o status do pedido no provedor
      const response = await fetch(`/api/orders/check-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          forceUpdate: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Não foi possível atualizar o status do pedido');
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Status do pedido atualizado com sucesso!');
        
        // Se o status foi alterado, notificar o componente pai
        if (data.order && data.order.status !== status && onStatusUpdated) {
          onStatusUpdated(data.order.status);
        }
      } else {
        throw new Error(data.error || 'Erro ao atualizar status do pedido');
      }
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status do pedido.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Button
      size="md"
      colorScheme="orange"
      variant="outline"
      height="38px"
      minWidth={{ base: "100%", sm: "auto" }}
      flexGrow={{ base: 1, sm: 0 }}
      px={4}
      mb={{ base: 2, sm: 0 }}
      leftIcon={<RefreshCw size={18} />}
      isLoading={isUpdating}
      loadingText="Atualizando..."
      onClick={handleUpdateOrderStatus}
    >
      Atualizar Status
    </Button>
  );
};
