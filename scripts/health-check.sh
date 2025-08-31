#!/bin/bash

# RDI Platform Health Check & Constitutional Audit
# Version 2.0
# Run this script to validate the project against its architectural constitution.

echo "🔍 RDI Platform Health Check & Constitutional Audit"
echo "====================================================="

# --- Color Codes ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Counters ---
ERRORS=0
WARNINGS=0

# --- Helper Function ---
check_file_exists() {
    if [ ! -f "$1" ]; then
        echo -e "${RED}❌ CRITICAL: Foundational file is missing: $1${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    return 0
}

# =====================================================
# 1. CONSTITUTIONAL CHECKS (The Most Important Part)
# =====================================================
echo -e "\n🏛️  Auditing against Project Constitution (CONTEXT.md)..."

if check_file_exists "CONTEXT.md"; then
    # Check 1.1: Enforce Wholeness Directive
    if ! grep -q "cannot be enforced by security rules alone" "CONTEXT.md"; then
        echo -e "${RED}❌ CONSTITUTIONAL FLAW: The 'Enforce Wholeness' directive in CONTEXT.md is incomplete.${NC}"
        echo "   Fix: It must state that this check is handled by the backend, not security rules."
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ 'Enforce Wholeness' directive is correctly defined.${NC}"
    fi

    # Check 1.2: Security Rule Example
    if ! grep -q "Example: Complete Ruleset for Users and Places" "CONTEXT.md"; then
        echo -e "${RED}❌ CONSTITUTIONAL FLAW: The security rule example is missing from CONTEXT.md.${NC}"
        echo "   Fix: Add the perfected ruleset example to Section 4.1 to guide the agent."
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ Security rule example is present.${NC}"
    fi
else
    # This is a fatal error, no point in continuing other checks.
    echo -e "${RED}FATAL: CONTEXT.md is missing. Cannot perform audit.${NC}"
    exit 1
fi

# =====================================================
# 2. ENVIRONMENT & CONFIGURATION CHECKS
# =====================================================
echo -e "\n🌍 Checking Environment & Configuration..."

# Check 2.1: .env file and required variables
if check_file_exists ".env"; then
    REQUIRED_VARS=("GCLOUD_PROJECT" "FIREBASE_STORAGE_BUCKET")
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^${var}=" .env || [[ "$(grep "^${var}=" .env | cut -d'=' -f2-)" == "" ]]; then
            echo -e "${RED}❌ CONFIG ERROR: Required variable '$var' is missing or empty in .env${NC}"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "${GREEN}✅ Environment variable '$var' is set.${NC}"
        fi
    done
else
    echo "   Skipping .env checks."
fi

# Check 2.2: Central Configuration Manifest
if check_file_exists "src/ai/config.ts"; then
    if ! grep -q "throw new Error" "src/ai/config.ts"; then
        echo -e "${YELLOW}⚠️  WARNING: src/ai/config.ts is missing validation checks.${NC}"
        echo "   It should throw an error if required environment variables are not set."
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ Configuration manifest (config.ts) includes validation.${NC}"
    fi
fi

# =====================================================
# 3. GENKIT & TYPESCRIPT HEALTH CHECKS
# =====================================================
echo -e "\n🔧 Checking Genkit & TypeScript Health..."

# Check 3.1: Dependency Alignment
echo "   Checking package versions..."
# This is a simple check. A more advanced check could compare versions.
if ! node -p "require('./package.json').dependencies['@genkit-ai/google-cloud']" > /dev/null 2>&1; then
    echo -e "${RED}❌ DEPENDENCY ERROR: @genkit-ai/google-cloud is not installed.${NC}"
    echo "   Fix: Run 'npm install @genkit-ai/google-cloud'"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Required Genkit plugins appear to be installed.${NC}"
fi

# Check 3.2: TypeScript Compilation
echo "   Running TypeScript compiler check..."
if npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript compilation successful (Found 0 errors).${NC}"
else
    echo -e "${RED}❌ CRITICAL: TypeScript compilation failed.${NC}"
    echo "   Fix: Run 'npx tsc --noEmit' to see the specific errors."
    ERRORS=$((ERRORS + 1))
fi

# =====================================================
# 4. ARCHITECTURAL CHECKS (Code against Constitution)
# =====================================================
echo -e "\n🏗️  Performing Architectural Audit..."

# Check 4.1: Firestore Rules Security
if check_file_exists "firestore.rules"; then
    if grep -q "allow read: if true;" "firestore.rules"; then
        echo -e "${RED}❌ ARCHITECTURAL FLAW: firestore.rules allows public read access ('if true;').${NC}"
        echo "   Violation: CONTEXT.md Section 4, 'Secure by Default'."
        ERRORS=$((ERRORS + 1))
    elif ! grep -q "allow write: if false;" "firestore.rules"; then
        echo -e "${YELLOW}⚠️  WARNING: firestore.rules may be missing 'allow write: if false;' for critical collections.${NC}"
        echo "   Verify that client-side writes are disabled for 'places' and 'documents'."
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ firestore.rules appears to be secure by default.${NC}"
    fi
fi

# Check 4.2: Flow Registration
if check_file_exists "src/ai/flows/index.ts"; then
    # Count the number of flow files vs. the number of exports in the index
    FLOW_FILES_COUNT=$(ls -1 src/ai/flows/*.ts | grep -v "index.ts" | wc -l)
    EXPORT_COUNT=$(grep -c "export \*" src/ai/flows/index.ts)
    if [ "$FLOW_FILES_COUNT" -ne "$EXPORT_COUNT" ]; then
        echo -e "${RED}❌ ARCHITECTURAL FLAW: Flow registration mismatch.${NC}"
        echo "   Found $FLOW_FILES_COUNT flow files but only $EXPORT_COUNT are exported in src/ai/flows/index.ts."
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ All flows appear to be correctly registered in the index.${NC}"
    fi
fi

# =====================================================
# 5. SUMMARY
# =====================================================
echo -e "\n📊 SUMMARY"
echo "==========="

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✅ All checks passed! The RDI Platform is in a healthy, constitutional state.${NC}"
    else
        echo -e "${YELLOW}⚠️  Project is functional but has $WARNINGS warning(s). Please review.${NC}"
    fi
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS critical issue(s) that violate the constitution.${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Also found $WARNINGS warning(s).${NC}"
    fi
    echo -e "\n🛠️  RECOMMENDED ACTIONS:"
    echo "   1. Review any 'CONSTITUTIONAL FLAW' messages and update CONTEXT.md."
    echo "   2. Review any 'CONFIG ERROR' messages and update your .env file."
    echo "   3. Run 'npx tsc --noEmit' to debug any compilation errors."
    echo "   4. Review any 'ARCHITECTURAL FLAW' messages and refactor the relevant code."
    exit 1
fi