/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* config options here */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' 
              ? '*' 
              : 'https://viralizamos.com,https://www.viralizamos.com,https://dev.viralizamos.com,http://dev.viralizamos.com,https://orders.viralizamos.com,https://painel.viralizamos.com,https://pagamentos.viralizamos.com,https://checkout.viralizamos.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, X-Payment-Source',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp', 'image/png'],
    domains: [
      'scontent-lga3-1.cdninstagram.com',
      'scontent-lga3-2.cdninstagram.com',
      'scontent.cdninstagram.com',
      'instagram.fgru10-1.fna.fbcdn.net',
      'instagram.ftjl1-2.fna.fbcdn.net',
      'images.weserv.nl',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: 'images.weserv.nl',
      },
    ],
  },
};

module.exports = nextConfig; 