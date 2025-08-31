/**
 * @fileoverview Central Genkit configuration file.
 */
import 'dotenv/config';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { dotprompt } from '@genkit-ai/dotprompt';

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase({
      flowStateStore: 'firebase',
      traceStore: 'firebase',
    }),
    dotprompt({ dir: './src/ai/prompts' }),
  ],
  enableTracingAndMetrics: true,
});

// Export the googleAI plugin for direct use in other files if needed
export { googleAI };
