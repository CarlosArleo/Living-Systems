# .github/workflows/deploy.yml - Production CI/CD Pipeline
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18.17.0'
  FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run typecheck
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
        env:
          GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY }}
          FIREBASE_ADMIN_SDK: ${{ secrets.FIREBASE_ADMIN_SDK }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for production
        run: npm run build
        env:
          GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY }}
          FIREBASE_ADMIN_SDK: ${{ secrets.FIREBASE_ADMIN_SDK }}
      
      - name: Deploy Genkit flows
        run: npm run genkit:deploy
        env:
          GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

---

# firebase.json - Firebase configuration
{
  "functions": [
    {
      "source": "lib",
      "codebase": "genkit",
      "runtime": "nodejs18"
    }
  ],
  "hosting": {
    "public": ".next",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "genkit"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "emulators": {
    "functions": {
      "port": 5001
    },
    "hosting": {
      "port": 5000
    }
  }
}

---

# next.config.js - Optimized Next.js configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['genkit', '@genkit-ai/core'],
  },
  
  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ]
  },

  // Bundle analyzer
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      const BundleAnalyzerPlugin = require('@next/bundle-analyzer')({
        enabled: true
      })
      config.plugins.push(new BundleAnalyzerPlugin())
    }
    
    return config
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.NODE_ENV,
  },
}

module.exports = nextConfig

---

# .env.example - Environment variables template
# Google AI Configuration
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Firebase Configuration  
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_ADMIN_SDK=your_firebase_admin_sdk_json

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Mapbox (if using maps)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Production URLs
NEXT_PUBLIC_API_URL=https://your-production-url.com
NEXT_PUBLIC_APP_URL=https://your-app-url.com

# Monitoring & Analytics
NEXT_PUBLIC_GA_ID=your_google_analytics_id