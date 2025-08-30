/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@genkit-ai/core', '@genkit-ai/googleai'],
  },
  webpack: (config, { isServer }) => {
    // A small webpack config change to force cache invalidation.
    if (!isServer) {
      // For example, you can add a simple alias or rule here if needed in the future.
    }
    return config;
  },
};

export default nextConfig;
