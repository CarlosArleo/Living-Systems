
/**
 * @fileoverview Local Genkit configuration for Cloud Functions.
 * This ensures the functions environment has its own configured `ai` instance.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
// CORRECTED: Use the correct DEFAULT import.
import firebase from '@genkit-ai/firebase';

// This config will be used by the deployed Cloud Function environment.
// It will automatically use the application's default credentials and environment.
export const ai = genkit({
  plugins: [
    googleAI(),
    // CORRECTED: Call the default import directly as a function.
    firebase(), 
  ],
  model: googleAI.model('gemini-1.5-pro'),
});

export { googleAI };
