import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone", // Required for Docker deployment
  
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
    }
    return config;
  },
};

export default nextConfig;
