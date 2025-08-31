// src/ai/genkit.ts

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
// CORRECTED: Use the correct DEFAULT import.
import firebase from '@genkit-ai/firebase';
import 'dotenv/config'; // Load environment variables

// Create the configured AI instance - this is the "central brain"
export const ai = genkit({
  plugins: [
    googleAI(),
    // CORRECTED: Call the default import directly as a function.
    firebase({
      projectId: process.env.GCLOUD_PROJECT,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      flowStateStore: 'firebase', // Best practice for persisting flow states
      traceStore: 'firebase',     // Best practice for persisting traces
    }),
  ],
  model: googleAI.model('gemini-1.5-pro'), // Set a default model for convenience
});

// Export the googleAI plugin for direct use in other files if needed
export { googleAI };
