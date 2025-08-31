/**
 * @fileoverview The main Genkit configuration file for the RDI Platform.
 * This file defines the central 'ai' instance with all its plugins and settings.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { googleCloud } from '@genkit-ai/google-cloud';
import 'dotenv/config'; // Load environment variables from .env file

// Create the configured AI instance - this is the "central brain"
export const ai = genkit({
  plugins: [
    // The Google AI plugin is used for interacting with Gemini models.
    googleAI(),
    // The Google Cloud plugin handles integration with GCP services,
    // including Firebase for tracing and flow state storage.
    googleCloud(),
  ],
  // Configure Genkit to use Firestore for persisting flow states and traces.
  // This is the modern, correct way to integrate with Firebase for these features.
  flowStateStore: 'firebase',
  traceStore: 'firebase',
  // Set a default model for convenience in other flows.
  model: googleAI.model('gemini-1.5-pro'),
  // Standard operational settings.
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

// Export the googleAI plugin for direct use in other files if needed
export { googleAI };
