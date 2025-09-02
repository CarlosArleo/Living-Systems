/**
 * @fileoverview Central Genkit configuration file.
 * This file is now aligned with the modern Genkit v1.x syntax and mirrors
 * the setup in `src/ai/genkit.ts` for consistency.
 */
import 'dotenv/config';
import { genkit, type GenkitOptions } from 'genkit';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';

// Enable Firebase telemetry for monitoring. This automatically sets up
// the required flowStateStore and traceStore.
enableFirebaseTelemetry();

const genkitConfig: GenkitOptions = {
  plugins: [
    googleAI(),
    // Additional plugins would go here.
  ],
  // No need to define stores, tools, or flows here in modern Genkit.
  // Flows are automatically discovered, and tools are passed directly to prompts.
  logLevel: 'debug',
  enableTracingAndMetrics: true,
};

// The modern `genkit()` constructor is used instead of `defineConfig`.
// Note: This file isn't the primary 'ai' instance for the app, 
// which is in src/ai/genkit.ts, but it provides a valid configuration
// for any CLI operations that might read from the root.
export default genkit(genkitConfig);
