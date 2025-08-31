/**
 * @fileoverview Central Genkit configuration file.
 */
import 'dotenv/config';
import { genkit, type GenkitOptions } from 'genkit';
import { firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';

// This is the only file that should configure the main `ai` instance.
// Its only export should be `ai`.

const genkitConfig: GenkitOptions = {
  plugins: [
    googleAI(),
    // Correctly call the firebase() plugin function
    firebase({
      // The flowStateStore and other storage options are configured *inside* the firebase plugin
      flowStateStore: {
        collection: 'flow-states',
      },
      traceStore: {
        collection: 'traces',
      },
      cacheStore: {
        collection: 'cache',
      },
    }),
    // Dotprompt is not a plugin that needs to be configured here.
    // The Genkit CLI automatically discovers prompts in the specified directory.
  ],
  // logLevel and enableTracingAndMetrics are not top-level options in this version.
  // Tracing is enabled by configuring the traceStore in the firebase plugin.
};

export const ai = genkit(genkitConfig);
