'use client';

import React from 'react';
import { Box, Container, Flex, Link, HStack, Image, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

export default function ViralizamosHeader() {
  const pathname = usePathname();
  
  return (
    <Box as="header" borderBottom="1px solid" borderColor="gray.200" bg="white">
      <Container maxW="container.xl" py={4}>
        <Flex justify="space-between" align="center">
          <NextLink href="/" passHref legacyBehavior>
            <Link>
              <Image
                src="/logo-viralizamos.png"
                alt="Viralizamos"
                h="40px"
                w="auto"
                fallback={<Text fontSize="xl" fontWeight="bold" color="brand.600">Viralizamos</Text>}
              />
            </Link>
          </NextLink>
          
          <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
            <NextLink href="https://viralizamos.com" passHref legacyBehavior>
              <Link color="gray.600" fontSize="sm" fontWeight="medium" _hover={{ color: "brand.600" }}>
                Home
              </Link>
            </NextLink>
            
            <NextLink href="https://viralizamos.com/sobre" passHref legacyBehavior>
              <Link color="gray.600" fontSize="sm" fontWeight="medium" _hover={{ color: "brand.600" }}>
                Sobre
              </Link>
            </NextLink>
            
            <NextLink href="https://viralizamos.com/servicos" passHref legacyBehavior>
              <Link color="gray.600" fontSize="sm" fontWeight="medium" _hover={{ color: "brand.600" }}>
                Serviços
              </Link>
            </NextLink>
            
            <NextLink href="https://viralizamos.com/contato" passHref legacyBehavior>
              <Link color="gray.600" fontSize="sm" fontWeight="medium" _hover={{ color: "brand.600" }}>
                Contato
              </Link>
            </NextLink>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
} 