
/**
 * @fileoverview Local Genkit configuration for Cloud Functions.
 * This ensures the functions environment has its own configured `ai` instance.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import firebase from '@genkit-ai/firebase'; // CORRECTED: Default import

// This config will be used by the deployed Cloud Function environment.
// It will automatically use the application's default credentials and environment.
export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(), // CORRECTED: Call the default export directly as a function
  ],
  model: googleAI.model('gemini-1.5-pro'),
});

export { googleAI };
