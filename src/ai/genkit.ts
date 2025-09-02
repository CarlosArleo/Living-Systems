// src/ai/genkit.ts
// This file is intentionally minimal.
// The main configuration is now in the root genkit.config.ts file.
// This allows our application code to import Genkit functions without
// re-running the entire configuration setup.

import { generate } from 'genkit/ai';
import { defineFlow } from 'genkit/flow';

// Re-export core functions for convenience in other files.
export const ai = {
    defineFlow,
    generate,
};