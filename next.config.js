/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Skip build-time static generation for customer pages
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Ensure environment variables are available in middleware (Edge Runtime)
  env: {
    JWT_SECRET: process.env.JWT_SECRET,
  },
  // Fix Tesseract worker path in standalone builds
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure worker scripts are copied to standalone output
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    return config;
  },
};

module.exports = nextConfig;




