
/**
 * @fileoverview Central Genkit configuration file.
 * This file configures all plugins and sets project-wide defaults.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { dotprompt } from '@genkit-ai/dotprompt';
import 'dotenv/config';

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(),
    dotprompt({ dir: './src/ai/prompts' }),
  ],
  flowStateStore: 'firebase',
  traceStore: 'firebase',
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export { googleAI };
