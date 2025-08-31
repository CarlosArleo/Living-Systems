/**
 * @fileoverview Main entry point for all Cloud Functions for the RDI Platform.
 * This file implements the event-driven triggers for the AI analysis pipeline.
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { run } from "@genkit-ai/firebase/functions";
import { processUploadedDocument } from "./flows/processing";

// Initialize Firebase Admin SDK
initializeApp();


/**
 * Cloud Function that triggers automatically when a new file is uploaded
 * to Cloud Storage. This function invokes the unified Genkit flow
 * 'processUploadedDocument'.
 */
export const triggerDocumentProcessing = onObjectFinalized(
  {
    bucket: process.env.GCLOUD_PROJECT! + ".appspot.com",
    cpu: 2,
    memory: '1GiB',
  },
  async (event) => {
    const fileBucket = event.bucket;
    const filePath = event.data.name;
    const metadata = event.data.metadata || {};

    logger.info(`[triggerDocumentProcessing] New file detected: ${filePath} in bucket: ${fileBucket}`);

    // --- Hardened Path Validation ---
    // This regex ensures the path has the structure: places/{placeId}/{documentId}/{fileName...}
    const pathRegex = /^places\/([^\/]+?)\/([^\/]+?)\/(.+)$/;
    const matches = filePath.match(pathRegex);

    if (!matches) {
        logger.warn(`File path ${filePath} does not match the expected format 'places/{placeId}/{documentId}/{fileName}'. Skipping.`);
        return;
    }

    const [, placeId, documentId, fileName] = matches;
    
    // --- Idempotency Checks ---
    if (event.data.resourceState === 'not_exists') {
      logger.log("This is a file deletion event. Exiting function.");
      return;
    }
    if (event.data.metageneration > 1) {
      logger.log("This is a metadata change event. Exiting function to prevent re-triggering.");
      return;
    }

    const uploadedBy = metadata.uploadedBy;

    if (!uploadedBy) {
      logger.error(`[triggerDocumentProcessing] File is missing 'uploadedBy' custom metadata. Cannot process.`, { filePath });
      // We still return gracefully as this is a data error, not a function crash.
      return;
    }

    try {
      logger.log(`Invoking processUploadedDocument for place: ${placeId}, doc: ${documentId}`);
      
      // Use the Genkit 'run' utility to securely call the unified flow.
      await run(processUploadedDocument, {
        placeId: placeId,
        documentId: documentId,
        storagePath: filePath,
        fileName: fileName,
        uploadedBy: uploadedBy,
      });

      logger.info(`[triggerDocumentProcessing] Successfully invoked flow for docId: ${documentId}`);

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
