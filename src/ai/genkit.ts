/**
 * @fileoverview Central Genkit configuration file.
 * This file configures all plugins and sets project-wide defaults.
 */
import 'dotenv/config';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { dotprompt, Dotprompt } from '@genkit-ai/dotprompt';

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase({
      flowStateStore: 'firebase', // Correct placement
      traceStore: 'firebase',     // Correct placement
    }),
    dotprompt({ dir: './src/ai/prompts' }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

// Export the googleAI plugin for direct use in other files if needed
export { googleAI };
