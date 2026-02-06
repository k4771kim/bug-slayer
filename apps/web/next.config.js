/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bug-slayer/game-engine', '@bug-slayer/shared'],
  webpack: (config, { isServer }) => {
    // Phaser.js configuration
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        phaser: 'phaser/dist/phaser.js',
      };
    }
    return config;
  },
};

module.exports = nextConfig;
