// genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Create the configured AI instance - this is the "central brain"
export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-1.5-pro'), // Default model
});

// Export the googleAI plugin for use by other files
export { googleAI };
