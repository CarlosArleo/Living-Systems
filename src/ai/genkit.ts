/**
 * @fileoverview Central Genkit configuration file.
 */
'use server';

import { genkit, type GenkitOptions } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
// CORRECTED: The firebase plugin is imported as a named export.
import { firebase } from '@genkit-ai/firebase';
import { projectConfig } from './config';

// This is the only file that should configure the main `ai` instance.
// Its only export should be `ai`.

const genkitConfig: GenkitOptions = {
  plugins: [
    // The googleAI plugin for interacting with Gemini models.
    googleAI(),
    // CORRECTED: The firebase plugin is configured with the stores.
    firebase({
      flowStateStore: {
        collection: 'genkit-flow-state',
      },
      traceStore: {
        collection: 'genkit-traces',
      },
    }),
  ],
  // Top-level options
  logLevel: 'debug',
  enableTracingAndMetrics: true,
};

export const ai = genkit(genkitConfig);
