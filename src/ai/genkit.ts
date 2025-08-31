/**
 * @fileoverview Central Genkit configuration file.
 */
import 'dotenv/config';
import { genkit, type GenkitOptions } from 'genkit';
// CORRECTED: Enable Firebase telemetry separately - there's no firebase plugin function
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';

// Enable Firebase telemetry for monitoring
enableFirebaseTelemetry();

// This is the only file that should configure the main `ai` instance.
// Its only export should be `ai`.

const genkitConfig: GenkitOptions = {
  plugins: [
    googleAI(),
    // Note: Firebase telemetry is enabled above, not as a plugin
  ],
};

export const ai = genkit(genkitConfig);