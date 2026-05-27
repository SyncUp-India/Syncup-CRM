/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@syncup/shared'],
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react'],
  },
};

module.exports = nextConfig;
