/**
 * @fileoverview Main entry point for all Cloud Functions for the RDI Platform.
 * This file implements the event-driven triggers for the AI analysis pipeline.
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { run } from "@genkit-ai/firebase/functions";
import { processUploadedDocument } from "./flows/processing"; // CORRECTED: Import the new unified flow.

// Initialize Firebase Admin SDK
initializeApp();


/**
 * Cloud Function that triggers automatically when a new file is uploaded
 * to Cloud Storage. This function invokes the new, unified Genkit flow
 * 'processUploadedDocument'.
 */
export const triggerDocumentProcessing = onObjectFinalized(
  {
    bucket: process.env.GCLOUD_PROJECT! + ".appspot.com",
    cpu: 2,
    memory: '1GiB', // Allocate sufficient memory for file operations
  },
  async (event) => {
    const fileBucket = event.bucket;
    const filePath = event.data.name;
    const metadata = event.data.metadata || {};

    logger.info(`[triggerDocumentProcessing] New file detected: ${filePath} in bucket: ${fileBucket}`);

    // Ensure the function only triggers for files in the correct directory.
    // Path format: places/{placeId}/{documentId}/{fileName}
    const pathParts = filePath.split('/');
    if (pathParts[0] !== 'places' || pathParts.length < 4) {
        logger.log(`File path ${filePath} is not a valid document upload path. Skipping.`);
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

    const placeId = pathParts[1];
    const documentId = pathParts[2];
    const fileName = pathParts[pathParts.length - 1];
    const uploadedBy = metadata.uploadedBy; // Get UID from custom metadata

    if (!uploadedBy) {
      logger.error(`[triggerDocumentProcessing] File is missing 'uploadedBy' custom metadata. Cannot process.`, { filePath });
      return;
    }

    try {
      logger.log(`Invoking processUploadedDocument for place: ${placeId}, doc: ${documentId}`);
      
      // Use the Genkit 'run' utility to securely call the unified flow.
      const result = await run(processUploadedDocument, {
        placeId: placeId,
        documentId: documentId,
        storagePath: filePath,
        fileName: fileName,
        uploadedBy: uploadedBy,
      });

      logger.info(`[triggerDocumentProcessing] Successfully invoked flow. Result:`, result);

    } catch (error) {
      logger.error(`[triggerDocumentProcessing] Failed to invoke processUploadedDocument for ${filePath}.`, {
        error,
        placeId,
        documentId,
      });
      // The flow itself handles setting the 'failed' status in Firestore.
    }
  }
);
