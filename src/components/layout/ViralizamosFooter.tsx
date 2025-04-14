'use client';

import React from 'react';
import { Box, Container, Text, Link, Flex, HStack, Divider } from '@chakra-ui/react';
import { FaInstagram } from 'react-icons/fa';

export function ViralizamosFooter() {
  return (
    <Box as="footer" bg="gray.800" color="white" py={8}>
      <Container maxW="container.xl">
        <Flex direction="column" align="center">
          <Text color="gray.400" fontSize="sm" mb={4}>
            Ajudamos influenciadores e marcas a alavancar seu alcance nas redes sociais.
          </Text>
          
          <Link 
            href="https://www.instagram.com/viralizamos.ia" 
            color="gray.400" 
            _hover={{ color: "pink.500" }} 
            isExternal
            display="flex"
            alignItems="center"
            mb={6}
          >
            <FaInstagram size={24} />
            <Text ml={2} fontWeight="medium">@viralizamos.ia</Text>
          </Link>
          
          <Divider borderColor="gray.700" my={6} />
          
          <Text color="gray.500" fontSize="sm">
            &copy; {new Date().getFullYear()} Viralizamos. Todos os direitos reservados.
          </Text>
        </Flex>
      </Container>
    </Box>
  );
} 