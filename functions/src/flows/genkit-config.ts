
/**
 * @fileoverview Local Genkit configuration for Cloud Functions.
 * This ensures the functions environment has its own configured `ai` instance.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
// FINAL CORRECTION: Use the correct NAMED import.
import { firebase } from '@genkit-ai/firebase';

// This config will be used by the deployed Cloud Function environment.
// It will automatically use the application's default credentials and environment.
export const ai = genkit({
  plugins: [
    googleAI(),
    // FINAL CORRECTION: Call the named import directly as a function.
    firebase(),
  ],
  model: googleAI.model('gemini-1.5-pro'),
});

export { googleAI };
