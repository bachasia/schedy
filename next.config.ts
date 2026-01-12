import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Docker deployment

  // Disable source maps in production to save memory
  productionBrowserSourceMaps: false,

  // Optimize build performance and reduce memory usage
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'date-fns',
    ],
    // Disable webpack build workers to reduce memory usage (important for VPS 2GB RAM)
    webpackBuildWorker: false,
  },

  // Mark Bull and related packages as external (server-only)
  // These packages use Node.js features like fork() that don't work with bundlers
  serverExternalPackages: [
    "bull",
    "@bull-board/api",
    "@bull-board/express",
    "express",
  ],

  // Use webpack to properly externalize these packages
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize Bull and related packages on the server side
      config.externals = config.externals || [];
      config.externals.push({
        bull: "commonjs bull",
        "@bull-board/api": "commonjs @bull-board/api",
        "@bull-board/express": "commonjs @bull-board/express",
        express: "commonjs express",
      });

      // Optimize webpack for low memory builds
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        minimize: process.env.NODE_ENV === 'production',
      };

      // Disable source maps to save memory
      if (process.env.NODE_ENV === 'production') {
        config.devtool = false;
      }
    }

    // Reduce parallel processing to prevent memory issues
    config.parallelism = 1; // Disable parallel processing

    // Speed up builds by reducing file system calls
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
      // Reduce cache memory usage
      maxMemoryGenerations: 1,
    };

    return config;
  },
};

export default nextConfig;
