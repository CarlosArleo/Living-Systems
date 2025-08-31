/**
 * @fileoverview Central Genkit configuration file.
 */
'use server';

import { genkit, type GenkitOptions } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
// CORRECTED: Import the firebase plugin, which handles Google Cloud integration in this context.
import { firebase } from '@genkit-ai/firebase';
import { projectConfig } from './config';

// This is the only file that should configure the main `ai` instance.
// Its only export should be `ai`.

const genkitConfig: GenkitOptions = {
  plugins: [
    // The googleAI plugin for interacting with Gemini models.
    googleAI(),
    // The firebase plugin handles GCP project context, state stores, and tracing.
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
  flowStateStore: 'firebase',
  traceStore: 'firebase',
  logLevel: 'debug',
  enableTracingAndMetrics: true,
};

export const ai = genkit(genkitConfig);
