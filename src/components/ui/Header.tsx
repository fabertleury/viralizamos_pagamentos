'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Box,
  Container,
  Flex,
  Button,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box as="header" bg={bgColor} borderBottom="1px" borderColor={borderColor} position="relative" zIndex="999">
      <Container maxW="container.xl" py={4}>
        <Flex justify="space-between" align="center">
          <Box as="a" href="https://viralizamos.com" display="flex" alignItems="center">
            <Image 
              src="/images/viralizamos-color.png" 
              alt="Viralizamos" 
              width={150} 
              height={50} 
              priority
            />
          </Box>
          
          <Box display={{ base: 'block', md: 'none' }} zIndex={50}>
            <Button
              variant="ghost"
              onClick={() => setMenuOpen(!menuOpen)}
              p={2}
              aria-label="Menu"
            >
              <Box as="svg" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12"></line>
                <line x1="4" x2="20" y1="6" y2="6"></line>
                <line x1="4" x2="20" y1="18" y2="18"></line>
              </Box>
            </Button>
          </Box>
          
          <Stack
            direction={{ base: 'column', md: 'row' }}
            display={{ base: menuOpen ? 'flex' : 'none', md: 'flex' }}
            width={{ base: 'full', md: 'auto' }}
            alignItems="center"
            flexGrow={1}
            spacing={6}
            position={{ base: 'absolute', md: 'static' }}
            top="100%"
            left={0}
            right={0}
            bg={{ base: bgColor, md: 'transparent' }}
            p={{ base: 4, md: 0 }}
            shadow={{ base: 'md', md: 'none' }}
          >
            <Text as={Link} href="/" fontWeight="medium" color="gray.700" _hover={{ color: 'primary.500' }}>Início</Text>
            <Text as={Link} href="/instagram" fontWeight="medium" color="gray.700" _hover={{ color: 'gray.900' }}>Serviços para Instagram</Text>
            <Text as={Link} href="/faq" fontWeight="medium" color="gray.700" _hover={{ color: 'primary.500' }}>FAQ</Text>
            <Button as={Link} href="/analisar-perfil" colorScheme="primary" size="sm">
              Analisar Perfil
            </Button>
            <Button as={Link} href="/acompanhar" colorScheme="primary" size="sm">
              Acompanhar Pedido
            </Button>
          </Stack>
        </Flex>
      </Container>
    </Box>
  );
} 