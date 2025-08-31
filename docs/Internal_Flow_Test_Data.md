# Test Data for Internal Genkit Flows

This document contains the JSON inputs required to test the internal development flows in the Genkit Developer UI.

---

### 1. Flow: `embedText`

**Purpose:** Converts text into a vector embedding.
**File:** `src/ai/flows/embed.ts`

**JSON Input:**
```json
"This is a test sentence for the embedding model."
```

---

### 2. Flow: `generateMasterPrompt`

**Purpose:** Generates a detailed Master Prompt from a simple task description.
**File:** `src/ai/flows/meta-prompter.ts`

**JSON Input:**
```json
"Create a React component that fetches and displays user data."
```

---

### 3. Flow: `critiqueCode`

**Purpose:** Audits a piece of code against a set of rules.
**File:** `src/ai/flows/critiqueCode.ts`

**JSON Input:**
```json
{
  "codeToCritique": "function add(a, b) { return a + b; }",
  "projectConstitution": "All functions must have TypeScript types and JSDoc comments."
}
```

---

### 4. Flow: `generateCode`

This flow has two distinct modes to test.

#### A. Initial Code Generation

**Purpose:** Creates a new piece of code from a task description.
**File:** `src/ai/flows/generateCode.ts`

**JSON Input:**
```json
{
  "taskDescription": "Create a simple TypeScript function that adds two numbers.",
  "context": [
    "Guideline: All functions must include JSDoc comments explaining what they do."
  ]
}
```

#### B. Code Correction

**Purpose:** Fixes a piece of failed code based on an audit report.
**File:** `src/ai/flows/generateCode.ts`

**JSON Input:**
```json
{
  "taskDescription": "Create a simple TypeScript function that adds two numbers.",
  "context": [
    "Guideline: All functions must include JSDoc comments explaining what they do."
  ],
  "failedCode": "function add(a, b) { return a + b; }",
  "critique": "### Code Audit Report\\n\\n**1. Issues Found:**\\n- The function is missing TypeScript type annotations for its parameters and return value.\\n- The function lacks the required JSDoc comment block.\\n\\n**3. Verdict:**\\nFAIL"
}
```
