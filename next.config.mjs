/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow requests from Cloud Workstations, Firebase, and localhost
  allowedDevOrigins: [
    'localhost',
    '*.cloudworkstations.dev',
    '*.cluster-*.cloudworkstations.dev',
    '*.firebase.com',
    '*.web.app',
  ],
  experimental: {
    serverComponentsExternalPackages: ['@genkit-ai/core', '@genkit-ai/googleai', 'firebase-admin']
  },
};

export default nextConfig;
