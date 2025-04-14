'use client';

import React from 'react';
import { Box, Container, Text, Link, Flex, HStack, Divider, SimpleGrid } from '@chakra-ui/react';
import { FaInstagram } from 'react-icons/fa';

export function ViralizamosFooter() {
  return (
    <Box as="footer" bg="gray.900" color="white" py={6}>
      <Container maxW="container.xl">
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} mb={6}>
          {/* Coluna 1: Logo e descrição */}
          <Box>
            <Text fontSize="xl" fontWeight="bold" color="pink.500" mb={2}>viralizamos</Text>
            <Text color="gray.400" fontSize="sm" mb={4}>
              Impulsione sua presença no Instagram com nossos serviços de alta qualidade.
            </Text>
            <Link 
              href="https://www.instagram.com/viralizamos.ia" 
              color="gray.400" 
              _hover={{ color: "pink.500" }} 
              display="flex"
              alignItems="center"
            >
              <FaInstagram size={20} />
              <Text ml={2} fontWeight="medium">@viralizamos.ia</Text>
            </Link>
          </Box>

          {/* Coluna 2: Menu */}
          <Box>
            <Text fontSize="lg" fontWeight="semibold" mb={4}>Menu</Text>
            <Link href="https://viralizamos.com" color="gray.400" _hover={{ color: "pink.500" }} display="block" mb={2}>Início</Link>
            <Link href="https://pagamentos.viralizamos.com/acompanhar-pedido" color="gray.400" _hover={{ color: "pink.500" }} display="block" mb={2}>Acompanhar Pedido</Link>
            <Link href="https://viralizamos.com/faq" color="gray.400" _hover={{ color: "pink.500" }} display="block" mb={2}>Dúvidas Frequentes</Link>
            <Link href="https://wa.me/5562999915390" color="gray.400" _hover={{ color: "pink.500" }} display="block" mb={2}>Suporte via WhatsApp</Link>
          </Box>

          {/* Coluna 3: Serviços */}
          <Box>
            <Text fontSize="lg" fontWeight="semibold" mb={4}>Serviços para Instagram</Text>
            <Link href="https://viralizamos.com/instagram/curtidas" color="gray.400" _hover={{ color: "pink.500" }} display="block" mb={2}>Turbinar Curtidas</Link>
            <Link href="https://viralizamos.com/instagram/seguidores" color="gray.400" _hover={{ color: "pink.500" }} display="block" mb={2}>Turbinar Seguidores</Link>
            <Link href="https://viralizamos.com/instagram/visualizacoes" color="gray.400" _hover={{ color: "pink.500" }} display="block" mb={2}>Visualizações para Vídeos</Link>
            <Link href="https://viralizamos.com/instagram/comentarios" color="gray.400" _hover={{ color: "pink.500" }} display="block" mb={2}>Turbinar Comentários</Link>
          </Box>
        </SimpleGrid>

        <Divider borderColor="gray.700" my={4} />
        
        <Flex justifyContent="space-between" flexDir={{ base: 'column', sm: 'row' }} alignItems={{ base: 'center', sm: 'flex-start' }} pt={2}>
          <HStack spacing={4} mb={{ base: 3, sm: 0 }}>
            <Link href="https://viralizamos.com/termos-de-uso" fontSize="sm" color="gray.400" _hover={{ color: "pink.500" }}>Termos de Uso</Link>
            <Link href="https://viralizamos.com/politica-de-privacidade" fontSize="sm" color="gray.400" _hover={{ color: "pink.500" }}>Política de Privacidade</Link>
          </HStack>
          <Text color="gray.500" fontSize="sm">
            © 2025 Viralizamos.com. Todos os direitos reservados. v0.1.0
          </Text>
        </Flex>
      </Container>
    </Box>
  );
} 