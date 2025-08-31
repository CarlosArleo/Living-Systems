/**
 * @fileoverview Central Genkit configuration file.
 */
import 'dotenv/config';
import { genkit, type GenkitOptions } from 'genkit';
import { firebase } from '@genkit-ai/firebase/plugin'; 
import { googleAI } from '@genkit-ai/googleai';
import { Dotprompt } from '@genkit-ai/dotprompt';

// This is the only file that should configure the main `ai` instance.
// Its only export should be `ai`.

const genkitConfig: GenkitOptions = {
  plugins: [
    googleAI(),
    // Correctly call the firebase() plugin function
    firebase({
        flowStateStore: {
            collection: 'flow-states',
        },
        traceStore: {
            collection: 'traces',
        },
        cacheStore: {
            collection: 'cache',
        }
    }),
    // Correctly instantiate Dotprompt as a class
    new Dotprompt({ dir: './src/ai/prompts' }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
};

export const ai = genkit(genkitConfig);
