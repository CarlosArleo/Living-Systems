/**
 * @fileoverview Central Genkit configuration file.
 */
import 'dotenv/config';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { Dotprompt } from '@genkit-ai/dotprompt';

// DO NOT import flows here. This file's sole purpose is to configure and export 'ai'.
// Flows will be imported by the development server entry point (dev.ts).

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase({
      flowStateStore: { collection: 'flow-state' },
      traceStore: { collection: 'traces' },
      cacheStore: { collection: 'cache' },
    }),
    new Dotprompt({ dir: './src/ai/prompts' }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
