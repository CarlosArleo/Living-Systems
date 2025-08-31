#!/bin/bash

# Genkit Project Health Check Script
# Run this script to validate your Genkit project setup

echo "🔍 Genkit Project Health Check"
echo "=============================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. CHECK PACKAGE VERSION CONSISTENCY
echo -e "\n📦 Checking package version consistency..."

GENKIT_VERSION=$(node -p "require('./package.json').dependencies.genkit" 2>/dev/null || echo "not found")
CORE_VERSION=$(node -p "require('./package.json').dependencies['@genkit-ai/core']" 2>/dev/null || echo "not found")
FIREBASE_VERSION=$(node -p "require('./package.json').dependencies['@genkit-ai/firebase']" 2>/dev/null || echo "not found")
GOOGLEAI_VERSION=$(node -p "require('./package.json').dependencies['@genkit-ai/googleai']" 2>/dev/null || echo "not found")

echo "  genkit: $GENKIT_VERSION"
echo "  @genkit-ai/core: $CORE_VERSION"
echo "  @genkit-ai/firebase: $FIREBASE_VERSION"
echo "  @genkit-ai/googleai: $GOOGLEAI_VERSION"

# Check for "latest" versions
if [[ "$FIREBASE_VERSION" == *"latest"* ]] || [[ "$GOOGLEAI_VERSION" == *"latest"* ]]; then
    echo -e "${RED}❌ ISSUE: Using 'latest' versions can cause compatibility issues${NC}"
    echo "   Fix: Pin all Genkit packages to the same version (e.g., ^1.18.0)"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ All versions are pinned${NC}"
fi

# 2. CHECK TYPESCRIPT COMPILATION
echo -e "\n🔧 Checking TypeScript compilation..."
if npx tsc --noEmit; then
    echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
    echo -e "${RED}❌ ISSUE: TypeScript compilation errors found${NC}"
    echo "   Run: npx tsc --noEmit"
    ERRORS=$((ERRORS + 1))
fi

# 3. CHECK ENVIRONMENT VARIABLES
echo -e "\n🌍 Checking environment variables..."

# Check for required env vars
REQUIRED_VARS=("GCLOUD_PROJECT" "GEMINI_API_KEY" "FIREBASE_STORAGE_BUCKET")
ENV_ISSUES=0

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" .env 2>/dev/null; then
        VALUE=$(grep "^${var}=" .env | cut -d'=' -f2-)
        if [[ "$VALUE" == *"your-project-id"* ]] || [[ "$VALUE" == *"placeholder"* ]]; then
            echo -e "${RED}❌ ISSUE: $var has placeholder value: $VALUE${NC}"
            ENV_ISSUES=$((ENV_ISSUES + 1))
        else
            echo -e "${GREEN}✅ $var is set${NC}"
        fi
    else
        echo -e "${RED}❌ ISSUE: $var not found in .env${NC}"
        ENV_ISSUES=$((ENV_ISSUES + 1))
    fi
done

if [ $ENV_ISSUES -gt 0 ]; then
    ERRORS=$((ERRORS + ENV_ISSUES))
fi

# Check for corrupted .env lines
if grep -q "FIREBASE_STORAGE_BUCKET.*FIREBASE_STORAGE_BUCKET" .env 2>/dev/null; then
    echo -e "${RED}❌ ISSUE: Corrupted FIREBASE_STORAGE_BUCKET line in .env${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 4. CHECK FIREBASE ADMIN SDK INITIALIZATION
echo -e "\n🔥 Checking Firebase Admin SDK initialization..."

if grep -r "admin.initializeApp()" src/ --include="*.ts" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  WARNING: Found admin.initializeApp() without explicit config${NC}"
    echo "   Consider adding explicit projectId and storageBucket"
fi

if grep -r "storage().bucket()" src/ --include="*.ts" >/dev/null 2>&1; then
    echo -e "${RED}❌ ISSUE: Found storage().bucket() calls without explicit bucket name${NC}"
    echo "   Fix: Use storage().bucket('your-bucket-name')"
    ERRORS=$((ERRORS + 1))
fi

# 5. CHECK GENKIT PLUGIN IMPORTS
echo -e "\n🔌 Checking Genkit plugin imports..."

# Check for incorrect Firebase import
if grep -q "import firebase from '@genkit-ai/firebase'" src/ --include="*.ts" 2>/dev/null; then
    echo -e "${RED}❌ ISSUE: Incorrect Firebase plugin import (default import)${NC}"
    echo "   Fix: Use import { enableFirebaseTelemetry } from '@genkit-ai/firebase'"
    ERRORS=$((ERRORS + 1))
fi

# Check for non-existent googleCloud import
if grep -q "googleCloud(" src/ --include="*.ts" 2>/dev/null; then
    echo -e "${RED}❌ ISSUE: Found googleCloud() function call${NC}"
    echo "   Fix: This function doesn't exist in current Genkit versions"
    ERRORS=$((ERRORS + 1))
fi

# 6. CHECK EMBEDDING API USAGE
echo -e "\n🎯 Checking embedding API usage..."

if grep -rn "content: texts," src/ --include="*.ts" 2>/dev/null; then
    echo -e "${RED}❌ ISSUE: Found 'content: texts' - arrays not supported${NC}"
    echo "   Fix: Process texts individually with map/Promise.all"
    ERRORS=$((ERRORS + 1))
fi

# 7. CHECK CREDENTIALS
echo -e "\n🔐 Checking credentials..."

if [ -f "./credentials/rdd-application.json" ]; then
    echo -e "${GREEN}✅ Service account credentials file exists${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Service account credentials file not found${NC}"
    echo "   Expected: ./credentials/rdd-application.json"
fi

# 8. CHECK FOR UNDEFINED VARIABLES
echo -e "\n🔍 Checking for common undefined variable patterns..."

UNDEFINED_PATTERNS=("fileRef" "bucket(" "response.embedding" "texts,")
for pattern in "${UNDEFINED_PATTERNS[@]}"; do
    if grep -rn "$pattern" src/ --include="*.ts" 2>/dev/null | grep -v "//"; then
        echo -e "${YELLOW}⚠️  Found potentially problematic pattern: $pattern${NC}"
    fi
done

# SUMMARY
echo -e "\n📊 SUMMARY"
echo "==========="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Your Genkit project looks healthy.${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS issue(s) that need attention.${NC}"
    echo -e "\n🛠️  QUICK FIXES:"
    echo "   1. Run: npm install (to sync package versions)"
    echo "   2. Run: npx tsc --noEmit (to see TypeScript errors)"
    echo "   3. Check your genkit.ts file for non-existent function calls"
    echo "   4. Ensure all storage().bucket() calls have explicit bucket names"
    echo "   5. Verify .env file has no placeholder values"
    exit 1
fi
