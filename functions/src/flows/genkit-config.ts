
/**
 * @fileoverview Local Genkit configuration for Cloud Functions.
 * This ensures the functions environment has its own configured `ai` instance.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-1.5-pro'),
});

export { googleAI };
