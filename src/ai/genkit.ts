/**
 * @fileoverview Central Genkit configuration file.
 * This file configures all plugins and sets project-wide defaults.
 */
import { configure } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { dotprompt } from '@genkit-ai/dotprompt';
import 'dotenv/config';

export default configure({
  plugins: [
    googleAI(),
    firebase(), // Correctly initialize the firebase plugin for auth, flow state, and traces
    dotprompt({ dir: './src/ai/prompts' }),
  ],
  flowStateStore: 'firebase', // Persist flow states in Firestore
  traceStore: 'firebase',     // Persist traces in Firestore
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
