/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@syncup/shared'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
