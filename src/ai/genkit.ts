/**
 * @fileoverview Central Genkit configuration file.
 */
import { genkit, type GenkitOptions } from 'genkit';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';
import { projectConfig } from './config'; // Import the centralized config

// Enable Firebase telemetry for monitoring and logging
enableFirebaseTelemetry();

// This is the only file that should configure the main `ai` instance.
// Its only export should be `ai`.

const genkitConfig: GenkitOptions = {
  plugins: [
    // Pass the validated project ID to the Google AI plugin
    googleAI({ projectId: projectConfig.projectId }),
  ],
  flowStateStore: 'firebase', // Use Firestore to persist flow state
  traceStore: 'firebase', // Use Firestore to store traces
};

export const ai = genkit(genkitConfig);
