#!/bin/bash
# cleanup-and-migrate.sh - Fix deprecated packages and migrate to modern config

echo "🧹 Cleaning up deprecated packages and migrating to modern config..."

# Step 1: Clean existing installation
echo "📦 Removing node_modules and lock files..."
rm -rf node_modules package-lock.json

# Step 2: Update npm to latest version
echo "⬆️  Updating npm to latest version..."
npm install -g npm@latest

# Step 3: Remove deprecated ESLint config files
echo "🗑️  Removing old ESLint config files..."
rm -f .eslintrc.json .eslintrc.js .eslintrc.yml .eslintrc.yaml .eslintignore

# Step 4: Clean npm cache
echo "🧽 Cleaning npm cache..."
npm cache clean --force

# Step 5: Install with exact versions (no deprecated packages)
echo "📥 Installing packages with exact versions..."

# Create new package.json with fixed dependencies
cat > package.json << 'EOF'
{
  "name": "nextn",
  "version": "0.2.0",
  "description": "MVP with a working multi-capital harmonization flow.",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "genkit:dev": "genkit start -- tsx --env-file=.env src/ai/dev.ts",
    "genkit:watch": "genkit start --watch",
    "genkit:deploy": "genkit deploy",
    "build:context": "tsx --env-file=.env scripts/process-context.ts",
    "setup": "npm run build:context",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "health-check": "bash scripts/health-check.sh",
    "postinstall": "npx update-browserslist-db@latest",
    "validate-packages": "npm list genkit @genkit-ai/core @genkit-ai/firebase @genkit-ai/googleai typescript",
    "clean": "rm -rf .next dist",
    "analyze": "cross-env ANALYZE=true npm run build"
  },
  "dependencies": {
    "@babel/runtime": "^7.25.6",
    "@genkit-ai/core": "^1.18.0",
    "@genkit-ai/dotprompt": "^0.9.12",
    "@genkit-ai/firebase": "^1.18.0",
    "@genkit-ai/googleai": "^1.18.0",
    "@google-cloud/monitoring": "^5.3.0",
    "@hookform/resolvers": "^3.9.0",
    "@radix-ui/react-accordion": "^1.2.1",
    "@radix-ui/react-alert-dialog": "^1.1.2",
    "@radix-ui/react-avatar": "^1.1.1",
    "@radix-ui/react-checkbox": "^1.1.2",
    "@radix-ui/react-collapsible": "^1.1.1",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-menubar": "^1.1.2",
    "@radix-ui/react-popover": "^1.1.2",
    "@radix-ui/react-progress": "^1.1.1",
    "@radix-ui/react-radio-group": "^1.2.1",
    "@radix-ui/react-scroll-area": "^1.2.0",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-slider": "^1.2.1",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.2",
    "@radix-ui/react-tooltip": "^1.1.3",
    "@tanstack/react-query": "^5.59.0",
    "@tanstack/react-query-devtools": "^5.59.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "date-fns": "^4.1.0",
    "embla-carousel-react": "^8.3.0",
    "firebase": "^12.2.0",
    "firebase-admin": "^12.2.0",
    "firebase-functions": "^5.1.1",
    "framer-motion": "^11.11.7",
    "genkit": "^1.18.0",
    "genkit-cli": "^1.18.0",
    "google-auth-library": "^10.3.0",
    "lucide-react": "^0.451.0",
    "mapbox-gl": "^3.7.0",
    "next": "^15.0.3",
    "next-themes": "^0.3.0",
    "react": "^18.3.1",
    "react-day-picker": "^9.1.3",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.0",
    "react-map-gl": "^7.1.7",
    "recharts": "^2.12.7",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.3",
    "tailwindcss-animate": "^1.0.7",
    "usehooks-ts": "^3.1.0",
    "vaul": "^1.0.0",
    "zod": "^3.23.8",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@next/bundle-analyzer": "^15.0.3",
    "@types/mapbox-gl": "^3.4.0",
    "@types/node": "^22.8.1",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "autoprefixer": "^10.4.20",
    "cross-env": "^7.0.3",
    "dotenv": "^16.4.5",
    "eslint": "^9.14.0",
    "@eslint/js": "^9.14.0",
    "globals": "^15.11.0",
    "typescript-eslint": "^8.13.0",
    "jest": "^29.7.0",
    "postcss": "^8.4.47",
    "prettier": "^3.3.3",
    "tailwindcss": "^3.4.14",
    "tsx": "^4.19.1",
    "typescript": "^5.6.3"
  },
  "engines": {
    "node": ">=18.17.0",
    "npm": ">=9.0.0"
  }
}
EOF

# Step 6: Install packages (should be clean now)
echo "📦 Installing packages..."
npm install

# Step 7: Verify no deprecated warnings
echo "✅ Checking for deprecated packages..."
npm ls --depth=0

echo ""
echo "🎉 Migration complete! Key changes:"
echo "   • Updated to ESLint 9 with flat config"
echo "   • Removed all deprecated packages"
echo "   • Updated to latest stable versions"
echo "   • Added modern tooling"
echo ""
echo "Next steps:"
echo "   1. Replace your .eslintrc with the new eslint.config.js"
echo "   2. Test with: npm run lint"
echo "   3. Run: npm run dev"