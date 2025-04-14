'use client';

import React from 'react';
import { Box, Container, Flex, Link, HStack, Image, Text, Button } from '@chakra-ui/react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

export default function ViralizamosHeader() {
  const pathname = usePathname();
  
  // Verifica se a página atual é a que corresponde ao link
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  return (
    <Box as="header" borderBottom="1px solid" borderColor="gray.200" bg="white" boxShadow="sm">
      <Container maxW="container.xl" py={4}>
        <Flex justify="space-between" align="center">
          {/* Logo */}
          <Link href="https://viralizamos.com" isExternal>
            <Image
              src="/logo.webp"
              alt="Viralizamos"
              h="40px"
              w="auto"
              fallbackSrc="/images/viralizamos-color.png"
              fallback={<Text fontSize="xl" fontWeight="bold" color="pink.600">Viralizamos</Text>}
            />
          </Link>
          
          {/* Links de navegação */}
          <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
            <Link 
              href="https://viralizamos.com" 
              isExternal
              fontWeight="medium"
              color={isActive('/') ? "pink.600" : "gray.600"}
              _hover={{ color: "pink.600" }}
            >
              Início
            </Link>
            
            <Link 
              href="https://viralizamos.com/instagram" 
              isExternal
              fontWeight="medium"
              color={isActive('/instagram') ? "pink.600" : "gray.600"}
              _hover={{ color: "pink.600" }}
            >
              Serviços para Instagram
            </Link>
            
            <Link 
              href="https://viralizamos.com/faq" 
              isExternal
              fontWeight="medium"
              color={isActive('/faq') ? "pink.600" : "gray.600"}
              _hover={{ color: "pink.600" }}
            >
              FAQ
            </Link>
            
            <Link 
              href="https://viralizamos.com/analisar-perfil" 
              isExternal
              fontWeight="medium"
              bg="pink.500"
              color="white"
              px={4}
              py={2}
              borderRadius="md"
              _hover={{ bg: "pink.600" }}
            >
              Analisar Perfil
            </Link>
            
            <Link 
              href="/acompanhar"
              as={NextLink}
              fontWeight="medium"
              bg="pink.500"
              color="white"
              px={4}
              py={2}
              borderRadius="md"
              _hover={{ bg: "pink.600" }}
            >
              Acompanhar Pedido
            </Link>
          </HStack>
          
          {/* Botão móvel (oculto no desktop) */}
          <Box display={{ base: 'block', md: 'none' }}>
            <Button
              as="a"
              href="https://viralizamos.com"
              size="sm"
              colorScheme="pink"
              variant="outline"
            >
              Voltar ao site
            </Button>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
} 