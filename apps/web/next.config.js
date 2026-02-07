const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ['@bug-slayer/game-engine', '@bug-slayer/shared'],
  webpack: (config, { isServer }) => {
    // Phaser.js configuration - client-side only
    if (!isServer) {
      // Resolve phaser to UMD build which exports via module.exports
      const phaserPath = path.join(__dirname, 'node_modules/phaser/dist/phaser.js');
      config.resolve.alias = {
        ...config.resolve.alias,
        phaser: phaserPath,
      };

      // Treat phaser.js as CommonJS so default import works
      config.module.rules.push({
        test: /phaser\.js$/,
        type: 'javascript/auto',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
