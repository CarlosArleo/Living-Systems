
// src/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
// FINAL CORRECTION: Use the correct NAMED import for version 1.17.x
import { firebase } from '@genkit-ai/firebase';
import 'dotenv/config'; // Load environment variables

// Create the configured AI instance - this is the "central brain"
export const ai = genkit({
  plugins: [
    googleAI(),
    // FINAL CORRECTION: Call the named import directly as a function.
    firebase(),
  ],
  model: googleAI.model('gemini-1.5-pro'), // Set a default model for convenience
});

// Export the googleAI plugin for direct use in other files if needed
export { googleAI };
