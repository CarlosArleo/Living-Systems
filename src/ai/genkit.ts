/**
 * @fileoverview Central Genkit configuration file.
 */
import 'dotenv/config';
import { genkit } from 'genkit';
import { firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';
import { Dotprompt } from '@genkit-ai/dotprompt';

// This is the only file that should configure the main `ai` instance.
// Its only export should be `ai`.

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(), // Correctly call the firebase plugin
    new Dotprompt({ dir: './src/ai/prompts' }), // Correctly instantiate Dotprompt
  ],
  // Correctly place these options at the top level
  flowStateStore: 'firebase',
  traceStore: 'firebase',
  cacheStore: {
    provider: 'firebase',
    options: {
      collection: 'cache'
    }
  },
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
