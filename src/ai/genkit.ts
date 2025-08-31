/**
 * @fileoverview Central Genkit configuration file.
 */
'use server';

import { genkit, type GenkitOptions } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { googleCloud } from '@genkit-ai/google-cloud';
import { projectConfig } from './config';

// This is the only file that should configure the main `ai` instance.
// Its only export should be `ai`.

const genkitConfig: GenkitOptions = {
  plugins: [
    googleAI(),
    googleCloud({
      projectId: projectConfig.projectId,
      storageBucket: projectConfig.storageBucket,
      location: projectConfig.location,
    }),
  ],
  flowStateStore: 'googleCloud',
  traceStore: 'googleCloud',
};

export const ai = genkit(genkitConfig);
