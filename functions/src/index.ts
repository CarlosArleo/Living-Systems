/**
 * @fileoverview Main entry point for all Cloud Functions for the RDI Platform.
 * This file implements the event-driven triggers for the AI analysis pipeline.
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { run } from "@genkit-ai/firebase";
import { integralAssessmentFlow } from "./flows/integralAssessment"; // CORRECTED: Import the actual flow.

// Initialize Firebase Admin SDK
initializeApp();


/**
 * Cloud Function that triggers automatically when a new file is uploaded
 * to Cloud Storage. This function invokes the Genkit 'integralAssessmentFlow'.
 */
export const triggerIntegralAssessment = onObjectFinalized(
  {
    bucket: process.env.GCLOUD_PROJECT! + ".appspot.com",
    cpu: 2, // Allocate more CPU for potential AI processing
  },
  async (event) => {
    const fileBucket = event.bucket;
    const filePath = event.data.name;

    logger.info(`[triggerIntegralAssessment] New file detected: ${filePath} in bucket: ${fileBucket}`);

    // Ensure the function only triggers for files in the correct directory.
    if (!filePath.startsWith('uploads/')) {
        logger.log(`File path ${filePath} is not in 'uploads/' directory. Skipping.`);
        return;
    }

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
    // Expected path: uploads/{userId}/{placeId}/{docId}/{fileName}
    const pathParts = filePath.split('/');
    if (pathParts.length < 5) {
      logger.warn(`File path ${filePath} does not match expected structure 'uploads/{userId}/{placeId}/{docId}/{fileName}'. Skipping.`);
      return;
    }
    const placeId = pathParts[2];
    const docId = pathParts[3];

    try {
      logger.log(`Invoking integralAssessmentFlow for place: ${placeId}, doc: ${docId}`);
      
      // Use the Genkit 'run' utility to securely call the flow.
      // This automatically handles authentication and context passing.
      // The flow itself will handle getting a signedURL and doing the analysis.
      const result = await run(integralAssessmentFlow, {
        placeId: placeId,
        documentId: docId,
        storagePath: filePath,
      });

      logger.info(`[triggerIntegralAssessment] Successfully invoked flow. Result:`, result);

    } catch (error) {
      logger.error(`[triggerIntegralAssessment] Failed to invoke integralAssessmentFlow for ${filePath}.`, {
        error,
        placeId,
        docId,
      });
      // Optionally, update the Firestore document status to 'failed' here.
    }
  }
);
