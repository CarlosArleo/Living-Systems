/**
 * @fileoverview Central Genkit configuration file.
 */
import { genkit, type GenkitOptions } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { googleCloud } from '@genkit-ai/google-cloud';
import { projectConfig } from './config'; // Import the centralized config

// This is the only file that should configure the main `ai` instance.
// Its only export should be `ai`.

const genkitConfig: GenkitOptions = {
  plugins: [
    googleAI(), // The Google AI plugin for Gemini models requires no arguments here.
    // The Google Cloud plugin handles project-specific configuration,
    // including state and trace stores.
    googleCloud({
      projectId: projectConfig.projectId,
      flowStateStore: {
        provider: 'firebase',
      },
      traceStore: {
        provider: 'firebase',
      },
    }),
  ],
};

export const ai = genkit(genkitConfig);
