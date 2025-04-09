'use client'

import { CacheProvider } from '@chakra-ui/next-js'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'

// Definir o tema personalizado
const theme = extendTheme({
  colors: {
    primary: {
      50: '#fce7f3',
      100: '#fbcfe8',
      200: '#f9a8d4',
      300: '#f472b6',
      400: '#ec4899',
      500: '#C43582', // Cor principal do Viralizamos
      600: '#a62c6c',
      700: '#86234a',
      800: '#601a32',
      900: '#3e1222',
    },
    brand: {
      500: '#C43582', // Cor principal do Viralizamos
    }
  },
  fonts: {
    heading: 'var(--font-inter)',
    body: 'var(--font-inter)',
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'medium',
        borderRadius: 'md',
      },
      variants: {
        solid: {
          bg: 'primary.500',
          color: 'white',
          _hover: {
            bg: 'primary.600',
          },
        },
        outline: {
          border: '1px solid',
          borderColor: 'primary.500',
          color: 'primary.500',
        },
        ghost: {
          color: 'primary.500',
          _hover: {
            bg: 'primary.50',
          },
        },
      },
    },
    Input: {
      baseStyle: {
        field: {
          borderRadius: 'md',
        },
      },
      variants: {
        outline: {
          field: {
            borderColor: 'gray.200',
            _focus: {
              borderColor: 'primary.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)',
            },
          },
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        px: 2,
        py: 1,
        textTransform: 'capitalize',
        fontWeight: 'medium',
      },
      variants: {
        success: {
          bg: 'green.50',
          color: 'green.700',
        },
        processing: {
          bg: 'yellow.50',
          color: 'yellow.700',
        },
        error: {
          bg: 'red.50',
          color: 'red.700',
        },
        partial: {
          bg: 'blue.50',
          color: 'blue.700',
        },
      },
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>
        {children}
      </ChakraProvider>
    </CacheProvider>
  )
} 