/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow requests from Cloud Workstations and other Firebase domains
  allowedDevOrigins: [
    'localhost',
    '*.cloudworkstations.dev',
    '*.cluster-*.cloudworkstations.dev',
    '*.firebase.com',
    '*.web.app',
  ],
  experimental: {
    // CORRECT: This tells Next.js to treat these packages as external
    // on the server, preventing them from being bundled with client code.
    serverComponentsExternalPackages: ['@genkit-ai/core', '@genkit-ai/googleai', 'firebase-admin'],
  },
};

export default nextConfig;
