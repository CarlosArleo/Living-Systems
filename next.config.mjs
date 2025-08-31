/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow requests from Cloud Workstations and other related domains for development.
  allowedDevOrigins: [
    'localhost',
    '*.cloudworkstations.dev',
    '*.cluster-*.cloudworkstations.dev',
    '*.firebase.com',
    '*.web.app',
  ],
  experimental: {
    // Ensures server-side packages are handled correctly by Next.js.
    serverComponentsExternalPackages: ['@genkit-ai/core', '@genkit-ai/googleai']
  },
};

export default nextConfig;
