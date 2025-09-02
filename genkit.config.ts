import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
initializeApp();

// Start with just the working plugins, add others later
export const ai = genkit({
  plugins: [
    googleAI(), // This should work
    // Comment out problematic plugins temporarily:
    // firebase plugin - will add back once we figure out the import
    // dotprompt plugin - will add back once we figure out the import
  ],
});

// Once this works, we can add the other plugins one by one