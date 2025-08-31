
/**
 * @fileoverview Main entry point for all Cloud Functions for the RDI Platform.
 * This file implements the event-driven triggers for the AI analysis pipeline.
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { runWithHttp } from "@genkit-ai/firebase/functions";
import { integralAssessmentFlow } from "./flows/integralAssessment"; // Corrected import

// Initialize Firebase Admin SDK
initializeApp();


/**
 * Cloud Function that triggers automatically when a new file is uploaded
 * to Cloud Storage. This function now invokes the 'integralAssessmentFlow'.
 */
export const triggerDocumentAnalysis = onObjectFinalized( // Renamed for clarity
  {
    bucket: process.env.GCLOUD_PROJECT! + ".appspot.com",
    cpu: 2,
    memory: '1GiB',
  },
  async (event) => {
    const filePath = event.data.name;
    const metadata = event.data.metadata || {};

    logger.info(`[triggerDocumentAnalysis] New file detected: ${filePath}`);

    // This regex now expects: uploads/{userId}/{placeId}/{docId}_{fileName}
    // This makes parsing more robust as docId is now part of the folder structure
    const pathRegex = /^uploads\/[^\/]+\/([^\/]+)\/([^\/]+)_.+$/;
    const matches = filePath.match(pathRegex);

    if (!matches) {
        logger.warn(`File path ${filePath} does not match the expected format 'uploads/{uid}/{placeId}/{docId}_{filename}'. Skipping.`);
        return;
    }

    const [, placeId, documentId] = matches;
    
    if (event.data.resourceState === 'not_exists') {
      logger.log("File deletion event, skipping.");
      return;
    }
    if (event.data.metageneration > 1) {
      logger.log("Metadata change event, skipping to prevent re-triggering.");
      return;
    }

    try {
      logger.log(`Invoking integralAssessmentFlow for place: ${placeId}, doc: ${documentId}`);
      
      // Use the Genkit 'runWithHttp' utility for robust invocation.
      await runWithHttp(integralAssessmentFlow, {
        placeId: placeId,
        documentId: documentId,
        storagePath: filePath,
      });

      logger.info(`[triggerDocumentAnalysis] Successfully invoked flow for docId: ${documentId}`);

    } catch (error) {
      logger.error(`[triggerDocumentAnalysis] Failed to invoke integralAssessmentFlow for ${filePath}.`, {
        error,
        placeId,
        documentId,
      });
    }
  }
);

// We need to export the flow from here so the Cloud Function can call it.
export { integralAssessmentFlow };
