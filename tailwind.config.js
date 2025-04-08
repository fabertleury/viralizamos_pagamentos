/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Forçar o Tailwind a incluir estas classes mesmo se elas não forem detectadas no código
  safelist: [
    'bg-white', 'bg-gray-100', 'bg-gray-200', 'bg-pink-600', 'bg-pink-700',
    'text-white', 'text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-800', 'text-pink-600',
    'p-2', 'p-4', 'p-6', 'px-2', 'px-4', 'py-2', 'py-4',
    'mb-2', 'mb-4', 'mb-6', 'mt-2', 'mt-4', 'mx-auto',
    'flex', 'flex-col', 'items-center', 'justify-center', 'justify-between',
    'rounded', 'rounded-lg', 'border', 'border-b', 'border-gray-200',
    'w-48', 'h-48', 'w-full', 'h-full',
    'font-medium', 'font-semibold', 'font-bold', 'text-sm', 'text-center',
    'container', 'relative', 'overflow-hidden',
    'animate-spin', 'pix-code'
  ],
  theme: {
    extend: {
      colors: {
        pink: {
          50: "#fdf2f9",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899",
          600: "#db2777",
          700: "#be185d",
          800: "#9d174d",
          900: "#831843",
          950: "#500724",
        }
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'slide-down': 'slideDown 0.3s ease-out'
      },
      keyframes: {
        spin: {
          to: { transform: 'rotate(360deg)' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 }
        }
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} 