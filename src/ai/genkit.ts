/**
 * @fileoverview Central Genkit configuration file.
 */
import 'dotenv/config';
import { genkit, type GenkitOptions } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { Dotprompt } from '@genkit-ai/dotprompt';

// Import all the flows so they are registered with the server.
import './flows';

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase({
      flowStateStore: {
        collection: 'flow-state',
      },
      traceStore: {
        collection: 'traces',
      },
    }),
    new Dotprompt({ dir: './src/ai/prompts' }),
  ],
});
