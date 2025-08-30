/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow requests from Cloud Workstations and localhost
  allowedDevOrigins: [
    'localhost',
    '*.cloudworkstations.dev',
    '*.cluster-*.cloudworkstations.dev',
    '*.firebase.com',
    '*.web.app',
  ],
  experimental: {
    serverComponentsExternalPackages: ['@genkit-ai/core', '@genkit-ai/googleai']
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
};

export default nextConfig;
