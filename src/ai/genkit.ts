
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import 'dotenv/config'; // Load environment variables

// Create the configured AI instance - this is the "central brain"
export const ai = genkit({
  plugins: [
    googleAI(),
    firebase({
      projectId: process.env.GCLOUD_PROJECT,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    }),
  ],
  model: googleAI.model('gemini-1.5-pro'), // Default model
});

// Export the googleAI plugin for use by other files
export { googleAI };
