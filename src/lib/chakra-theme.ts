import { extendTheme } from '@chakra-ui/react';

// Cores da Viralizamos
const colors = {
  brand: {
    50: "#ffeef5",
    100: "#ffd6e5",
    200: "#ffadc9",
    300: "#ff85ae",
    400: "#ff5c93",
    500: "#ff3378",
    600: "#ff0a5c",
    700: "#e60052",
    800: "#bd0043",
    900: "#940035",
  },
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
};

// Fontes que combinam com o site Viralizamos
const fonts = {
  heading: "var(--font-inter)",
  body: "var(--font-inter)",
};

// Componentes estilizados
const components = {
  Button: {
    baseStyle: {
      fontWeight: 500,
      borderRadius: "md",
    },
    variants: {
      solid: {
        bg: "brand.600",
        color: "white",
        _hover: {
          bg: "brand.700",
        },
      },
      outline: {
        borderColor: "brand.600",
        color: "brand.600",
        _hover: {
          bg: "brand.50",
        },
      },
      ghost: {
        color: "brand.600",
        _hover: {
          bg: "brand.50",
        },
      },
      link: {
        color: "brand.600",
      },
    },
    defaultProps: {
      variant: "solid",
      colorScheme: "brand",
    },
  },
  Heading: {
    baseStyle: {
      fontWeight: "600",
      color: "gray.800",
    },
  },
  Input: {
    variants: {
      outline: {
        field: {
          borderColor: "gray.300",
          _hover: {
            borderColor: "brand.400",
          },
          _focus: {
            borderColor: "brand.500",
            boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
          },
        },
      },
    },
    defaultProps: {
      variant: "outline",
    },
  },
  Card: {
    baseStyle: {
      container: {
        bg: "white",
        boxShadow: "md",
        borderRadius: "lg",
        overflow: "hidden",
      },
      header: {
        py: 4,
        px: 6,
      },
      body: {
        py: 4,
        px: 6,
      },
      footer: {
        py: 4,
        px: 6,
      },
    },
  },
};

// Estilo global
const styles = {
  global: {
    body: {
      bg: "white",
      color: "gray.800",
    },
  },
};

// Configuração de tamanhos e breakpoints
const breakpoints = {
  sm: "30em", // 480px
  md: "48em", // 768px
  lg: "62em", // 992px
  xl: "80em", // 1280px
  "2xl": "96em", // 1536px
};

const theme = extendTheme({
  colors,
  fonts,
  components,
  styles,
  breakpoints,
});

export default theme; 