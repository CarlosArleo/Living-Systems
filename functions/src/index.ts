
/**
 * @fileoverview Main entry point for all Cloud Functions for the RDI Platform.
 * This file implements the event-driven triggers for the AI analysis pipeline.
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { run } from "@genkit-ai/firebase";
import { integralAssessmentFlow } from "./flows/integralAssessment";

// Initialize Firebase Admin SDK
initializeApp();


/**
 * Cloud Function that triggers automatically when a new file is uploaded
 * to Cloud Storage. This function invokes the Genkit 'integralAssessmentFlow'.
 */
export const triggerIntegralAssessment = onObjectFinalized(
  {
    // 1. Trigger Type and Configuration
    bucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    // Listen for files created within the 'uploads' folder for any user and place.
    // Example path: /uploads/{userId}/{placeId}/{timestamp}_{fileName}
    cpu: 2, // Allocate more CPU for potential AI processing
  },
  async (event) => {
    const fileBucket = event.bucket;
    const filePath = event.data.name;

    // Log the event context for security and debugging
    logger.info(`[triggerIntegralAssessment] New file detected: ${filePath} in bucket: ${fileBucket}`);
    logger.log("Event context:", event);

    // Ensure the function doesn't re-trigger on metadata updates
    if (event.data.resourceState === 'not_exists') {
      logger.log("This is a file deletion event. Exiting function.");
      return;
    }
    if (event.data.metageneration > 1) {
      logger.log("This is a metadata change event. Exiting function to prevent re-triggering.");
      return;
    }

    // Extract placeId and docId from the file path.
    // Example path: uploads/{userId}/{placeId}/{docId}/{fileName}
    // We will assume a structure that can be parsed.
    // NOTE: This parsing logic MUST match the client-side upload logic.
    const pathParts = filePath.split('/');
    if (pathParts.length < 4 || pathParts[0] !== 'uploads') {
      logger.warn(`File path ${filePath} does not match expected structure 'uploads/{userId}/{placeId}/{docId}/{fileName}'. Skipping.`);
      return;
    }
    const placeId = pathParts[2];
    const docId = pathParts[3];

    try {
      // 2. Flow Invocation
      logger.log(`Invoking integralAssessmentFlow for place: ${placeId}, doc: ${docId}`);
      
      // Use the Genkit 'run' utility to securely call the flow.
      // This automatically handles authentication and context passing.
      const result = await run(integralAssessmentFlow, {
        placeId: placeId,
        documentId: docId,
        storagePath: filePath,
      });

      logger.info(`[triggerIntegralAssessment] Successfully invoked flow. Result:`, result);

    } catch (error) {
      // 4. Error Handling
      logger.error(`[triggerIntegralAssessment] Failed to invoke integralAssessmentFlow for ${filePath}.`, {
        error,
        placeId,
        docId,
      });
      // Optionally, update the Firestore document status to 'failed' here.
    }
  }
);
