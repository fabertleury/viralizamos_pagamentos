import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  useColorModeValue
} from '@chakra-ui/react';
import { RefreshCw } from 'lucide-react';

// Tipos
interface ReposicaoRequest {
  id: string;
  status: string;
  created_at: string;
  processed_at?: string;
  attempts: number;
  metadata: {
    reason?: string;
    orders_reposicao?: boolean;
    motivo?: string;
    observacoes?: string;
    resposta?: string;
  };
}

interface ReposicaoListProps {
  reposicoes: ReposicaoRequest[];
  orderId: string;
  onRefreshStatus: (orderId: string) => void;
  isLoading: boolean;
}

// Função para formatar a data
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Função para obter a cor do badge baseado no status
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
      return 'green';
    case 'pending':
      return 'blue';
    case 'processing':
    case 'in progress':
      return 'purple';
    case 'failed':
    case 'rejected':
    case 'canceled':
      return 'red';
    default:
      return 'gray';
  }
};

// Função para formatar o status
const formatStatus = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
      return 'Concluída';
    case 'pending':
      return 'Pendente';
    case 'processing':
    case 'in progress':
      return 'Em processamento';
    case 'failed':
    case 'rejected':
      return 'Falhou';
    case 'canceled':
      return 'Cancelada';
    default:
      return status || 'Desconhecido';
  }
};

export default function ReposicaoList({ reposicoes, orderId, onRefreshStatus, isLoading }: ReposicaoListProps) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  if (!reposicoes || reposicoes.length === 0) {
    return (
      <Box 
        p={4} 
        bg={bgColor} 
        borderWidth="1px" 
        borderColor={borderColor} 
        borderRadius="md"
        shadow="sm"
      >
        <Text align="center" py={4} color="gray.500">
          Nenhuma reposição solicitada para este pedido.
        </Text>
      </Box>
    );
  }

  return (
    <Box 
      p={4} 
      bg={bgColor} 
      borderWidth="1px" 
      borderColor={borderColor} 
      borderRadius="md"
      shadow="sm"
    >
      <HStack justifyContent="space-between" mb={4}>
        <Text fontWeight="medium" fontSize="lg">
          Reposições ({reposicoes.length})
        </Text>
        <Button
          size="sm"
          leftIcon={<RefreshCw size={16} />}
          colorScheme="blue"
          variant="outline"
          isLoading={isLoading}
          onClick={() => onRefreshStatus(orderId)}
        >
          Atualizar
        </Button>
      </HStack>
      
      <Divider mb={4} />
      
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Status</Th>
            <Th>Data</Th>
            <Th>Motivo</Th>
            <Th>Resposta</Th>
          </Tr>
        </Thead>
        <Tbody>
          {reposicoes.map((reposicao) => (
            <Tr key={reposicao.id}>
              <Td>
                <Badge colorScheme={getStatusColor(reposicao.status)}>
                  {formatStatus(reposicao.status)}
                </Badge>
              </Td>
              <Td>
                <Text fontSize="xs">{formatDate(reposicao.created_at)}</Text>
                {reposicao.processed_at && (
                  <Text fontSize="xs" color="gray.500">
                    Processado: {formatDate(reposicao.processed_at)}
                  </Text>
                )}
              </Td>
              <Td>
                <Text fontSize="xs">
                  {reposicao.metadata?.orders_reposicao 
                    ? reposicao.metadata.motivo || 'Não especificado'
                    : reposicao.metadata?.reason || 'Não especificado'
                  }
                </Text>
              </Td>
              <Td>
                {reposicao.status === 'failed' || reposicao.status === 'completed' ? (
                  <Text fontSize="xs" color={reposicao.status === 'failed' ? 'red.500' : 'green.500'}>
                    {reposicao.metadata?.resposta || '-'}
                  </Text>
                ) : (
                  <Text fontSize="xs" color="gray.500">-</Text>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
} 