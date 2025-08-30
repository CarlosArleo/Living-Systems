/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL FIX: Allows the frontend to communicate with the backend
  // in the Firebase Studio / Cloud Workstations environment.
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
    // CRITICAL FIX: Excludes native WebSocket dependencies from the client bundle
    // to prevent the "__webpack_require__.nmd is not a function" error.
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
};

export default nextConfig;
