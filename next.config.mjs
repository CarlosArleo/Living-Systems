/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow requests from Cloud Workstations and other Firebase domains
  allowedDevOrigins: [
    'localhost',
    'firebase-rdd-applicationback-1756497949958.cluster-jbb3mjctu5cbgsi6hwq6u4btwe.cloudworkstations.dev',
    '3000-firebase-rdd-applicationback-1756497949958.cluster-jbb3mjctu5cbgsi6hwq6u4btwe.cloudworkstations.dev',
    '6000-firebase-rdd-applicationback-1756497949958.cluster-jbb3mjctu5cbgsi6hwq6u4btwe.cloudworkstations.dev',
    '9000-firebase-rdd-applicationback-1756497949958.cluster-jbb3mjctu5cbgsi6hwq6u4btwe.cloudworkstations.dev',
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