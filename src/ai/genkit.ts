/**
 * @fileoverview Central Genkit configuration file.
 */
import 'dotenv/config';
import { genkit, type GenkitOptions } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
// CORRECTED: The firebase plugin is a named export.
import { firebase } from '@genkit-ai/firebase';
// CORRECTED: Dotprompt is a class and must be imported as such.
import { Dotprompt } from '@genkit-ai/dotprompt';

// Define Genkit configuration
const genkitOptions: GenkitOptions = {
  plugins: [
    googleAI(),
    // CORRECTED: The imported 'firebase' function is called directly with options.
    firebase({
      flowStateStore: 'firebase',
      traceStore: 'firebase',
    }),
    // CORRECTED: Dotprompt is a class and must be instantiated with `new`.
    new Dotprompt({ dir: './src/ai/prompts' }),
  ],
  // Correctly remove invalid top-level options
};

// Initialize and export the configured genkit instance
export const ai = genkit(genkitOptions);

// Export the googleAI plugin for direct use in other files if needed
export { googleAI };
