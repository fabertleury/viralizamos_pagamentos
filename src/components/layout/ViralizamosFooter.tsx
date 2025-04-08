'use client';

import React from 'react';
import { Box, Container, Grid, GridItem, Heading, Text, Link, Flex, VStack, HStack, Divider } from '@chakra-ui/react';
import NextLink from 'next/link';
import { FaInstagram, FaFacebook, FaTwitter, FaYoutube } from 'react-icons/fa';

export function ViralizamosFooter() {
  return (
    <Box as="footer" bg="gray.800" color="white" py={12}>
      <Container maxW="container.xl">
        <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={8}>
          <GridItem>
            <Heading size="md" mb={4}>Viralizamos</Heading>
            <Text color="gray.400" fontSize="sm" mb={6}>
              Ajudamos influenciadores e marcas a alavancar seu alcance nas redes sociais com serviços de alta qualidade para Instagram.
            </Text>
            <HStack spacing={4}>
              <Link href="https://instagram.com/viralizamos" color="gray.400" _hover={{ color: "pink.500" }}>
                <FaInstagram size={20} />
              </Link>
              <Link href="https://facebook.com/viralizamos" color="gray.400" _hover={{ color: "pink.500" }}>
                <FaFacebook size={20} />
              </Link>
              <Link href="https://twitter.com/viralizamos" color="gray.400" _hover={{ color: "pink.500" }}>
                <FaTwitter size={20} />
              </Link>
              <Link href="https://youtube.com/viralizamos" color="gray.400" _hover={{ color: "pink.500" }}>
                <FaYoutube size={20} />
              </Link>
            </HStack>
          </GridItem>
          
          <GridItem>
            <Heading size="md" mb={4}>Links Rápidos</Heading>
            <VStack align="flex-start" spacing={2}>
              <NextLink href="https://viralizamos.com/" passHref>
                <Link color="gray.400" _hover={{ color: "white" }} fontSize="sm">
                  Home
                </Link>
              </NextLink>
              <NextLink href="https://viralizamos.com/sobre" passHref>
                <Link color="gray.400" _hover={{ color: "white" }} fontSize="sm">
                  Sobre Nós
                </Link>
              </NextLink>
              <NextLink href="https://viralizamos.com/servicos" passHref>
                <Link color="gray.400" _hover={{ color: "white" }} fontSize="sm">
                  Serviços
                </Link>
              </NextLink>
              <NextLink href="https://viralizamos.com/precos" passHref>
                <Link color="gray.400" _hover={{ color: "white" }} fontSize="sm">
                  Preços
                </Link>
              </NextLink>
              <NextLink href="https://viralizamos.com/contato" passHref>
                <Link color="gray.400" _hover={{ color: "white" }} fontSize="sm">
                  Contato
                </Link>
              </NextLink>
            </VStack>
          </GridItem>
          
          <GridItem>
            <Heading size="md" mb={4}>Serviços</Heading>
            <VStack align="flex-start" spacing={2}>
              <NextLink href="https://viralizamos.com/servicos/curtidas" passHref>
                <Link color="gray.400" _hover={{ color: "white" }} fontSize="sm">
                  Curtidas no Instagram
                </Link>
              </NextLink>
              <NextLink href="https://viralizamos.com/servicos/seguidores" passHref>
                <Link color="gray.400" _hover={{ color: "white" }} fontSize="sm">
                  Seguidores no Instagram
                </Link>
              </NextLink>
              <NextLink href="https://viralizamos.com/servicos/visualizacoes" passHref>
                <Link color="gray.400" _hover={{ color: "white" }} fontSize="sm">
                  Visualizações de Vídeo
                </Link>
              </NextLink>
              <NextLink href="https://viralizamos.com/servicos/comentarios" passHref>
                <Link color="gray.400" _hover={{ color: "white" }} fontSize="sm">
                  Comentários no Instagram
                </Link>
              </NextLink>
            </VStack>
          </GridItem>
          
          <GridItem>
            <Heading size="md" mb={4}>Contato</Heading>
            <Text color="gray.400" fontSize="sm" mb={2}>contato@viralizamos.com</Text>
            <Text color="gray.400" fontSize="sm" mb={4}>Atendimento: Segunda a Sexta, 9h às 18h</Text>
            <NextLink href="https://viralizamos.com/suporte" passHref>
              <Link display="inline-block" bg="pink.600" _hover={{ bg: "pink.700" }} color="white" fontSize="sm" px={4} py={2} borderRadius="md">
                Central de Suporte
              </Link>
            </NextLink>
          </GridItem>
        </Grid>
        
        <Divider borderColor="gray.700" my={12} />
        
        <Flex direction="column" align="center">
          <Text color="gray.500" fontSize="sm">
            &copy; {new Date().getFullYear()} Viralizamos. Todos os direitos reservados.
          </Text>
          <HStack mt={2} spacing={4}>
            <NextLink href="https://viralizamos.com/termos" passHref>
              <Link color="gray.500" _hover={{ color: "white" }} fontSize="sm">
                Termos de Uso
              </Link>
            </NextLink>
            <NextLink href="https://viralizamos.com/privacidade" passHref>
              <Link color="gray.500" _hover={{ color: "white" }} fontSize="sm">
                Política de Privacidade
              </Link>
            </NextLink>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
} 