/**
 * @fileoverview Central Genkit configuration file.
 */
import 'dotenv/config';
import { genkit, type GenkitOptions } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import * as firebase from '@genkit-ai/firebase';
import { Dotprompt } from '@genkit-ai/dotprompt';

// Define Genkit configuration
const genkitOptions: GenkitOptions = {
  plugins: [
    googleAI(),
    // Correctly initialize the firebase plugin using the namespace import
    firebase.firebase({
      flowStateStore: 'firebase',
      traceStore: 'firebase',
    }),
    // Correctly initialize the Dotprompt plugin with a capital D
    Dotprompt({ dir: './src/ai/prompts' }),
  ],
  // Correctly remove invalid top-level options
};

// Initialize and export the configured genkit instance
export const ai = genkit(genkitOptions);

// Export the googleAI plugin for direct use in other files if needed
export { googleAI };
