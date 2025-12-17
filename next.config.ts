import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Docker deployment
  
  // Optimize build performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'date-fns',
    ],
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
      
      // Optimize webpack for faster builds
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        minimize: true,
      };
    }
    
    // Speed up builds by reducing file system calls
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    };
    
    return config;
  },
};

export default nextConfig;
