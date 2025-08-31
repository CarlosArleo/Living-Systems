/**
 * @fileoverview Central Genkit configuration file.
 */
import 'dotenv/config';
import { genkit, type GenkitOptions } from 'genkit';
// CORRECTED: Import the 'firebase' plugin function as a named export.
import { firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';

// This is the only file that should configure the main `ai` instance.
// Its only export should be `ai`.

const genkitConfig: GenkitOptions = {
  plugins: [
    googleAI(),
    // CORRECTED: Call the imported 'firebase' function directly.
    firebase(),
  ],
};

export const ai = genkit(genkitConfig);
