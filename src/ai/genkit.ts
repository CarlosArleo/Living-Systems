/**
 * @fileoverview Central Genkit configuration file.
 * This file configures all plugins and sets project-wide defaults.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase/plugin'; // Corrected import path
import { dotprompt } from '@genkit-ai/dotprompt'; // Corrected import
import 'dotenv/config';

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(), // Correct initialization
    dotprompt({ dir: './src/ai/prompts' }),
  ],
  flowStateStore: 'firebase', // Correct top-level config
  traceStore: 'firebase',     // Correct top-level config
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

// Export the googleAI plugin for direct use in other files if needed
export { googleAI };
