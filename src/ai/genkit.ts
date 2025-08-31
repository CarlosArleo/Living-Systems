
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import firebase from '@genkit-ai/firebase'; // CORRECTED: Default import
import 'dotenv/config'; // Load environment variables

// Create the configured AI instance - this is the "central brain"
export const ai = genkit({
  plugins: [
    googleAI(),
    // CORRECTED: Call the default export directly as a function
    firebase({
      projectId: process.env.GCLOUD_PROJECT,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    }),
  ],
  model: googleAI.model('gemini-1.5-pro'), // Default model
});

// Export the googleAI plugin for use by other files
export { googleAI };
