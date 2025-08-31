/**
 * @fileoverview Central Genkit configuration file.
 */
import 'dotenv/config';
import { genkit, type GenkitOptions } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// Enable Firebase telemetry
enableFirebaseTelemetry();

// Define Genkit configuration, including automatic prompt loading
const genkitOptions: GenkitOptions = {
  promptDir: './src/ai/prompts',
  plugins: [
    googleAI(),
    // no manual Dotprompt instantiation needed
  ],
};

export const ai = genkit(genkitOptions);
export { googleAI };
