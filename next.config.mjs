/** @type {import('next').NextConfig} */
const nextConfig = {
  // Adding this experimental flag helps ensure the cache is fully invalidated.
  experimental: {
    serverComponentsExternalPackages: ['@genkit-ai/core', '@genkit-ai/googleai']
  },
  webpack: (config) => {
    // This empty webpack modification is a safe way to ensure a full rebuild.
    return config;
  },
};

export default nextConfig;
