/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Enable optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
}

module.exports = nextConfig
