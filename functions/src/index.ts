/**
 * @fileoverview Cloud Functions for the RDI Platform.
 * This file contains the event-driven triggers that integrate Firebase services
 * and orchestrate the backend Genkit AI flows.
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK if it hasn't been already.
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * A Cloud Function that triggers when a new file is uploaded to Cloud Storage.
 * Its sole purpose is to validate the event and securely invoke the
 * `processUploadedDocument` Genkit flow via an authenticated HTTP request.
 */
export const triggerDocumentAnalysis = onObjectFinalized(
  {
    // 2. Path Validation: Trigger only for files in the correct directory structure.
    bucket: process.env.FIREBASE_STORAGE_BUCKET || "",
    cpu: "gcf_gen1", // Specify CPU allocation
  },
  async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // 1. Log the event for debugging.
    logger.info(`[triggerDocumentAnalysis] Received event for file: ${filePath}`, {
      contentType,
      bucket: fileBucket,
    });

    // 2. Idempotency Check: Exit if this is a metadata-only update.
    // The 'metageneration' property is 1 for a new file upload.
    if (event.data.metageneration !== "1") {
      logger.log(`[triggerDocumentAnalysis] Ignoring metadata update for ${filePath}.`);
      return;
    }

    // 3. Path Validation: Ensure the file is in the correct 'places' path.
    // Example path: places/some-place-id/documents/some-doc-id/my-file.pdf
    // This regex extracts the placeId and the documentId from the path.
    const pathRegex = /^places\/([^/]+)\/documents\/([^/]+)\//;
    const match = filePath.match(pathRegex);

    if (!match) {
      logger.log(`[triggerDocumentAnalysis] File path ${filePath} does not match the required pattern. Skipping.`);
      return;
    }
    const [, placeId, documentId] = match;
    const fileName = filePath.split("/").pop() || "";
    
    // Extract custom metadata if it exists.
    const uploadedBy = event.data.metadata?.uploadedBy || 'unknown';

    try {
      // 4. Secure Flow Invocation: Prepare for an authenticated HTTP request.
      // The GENKIT_FLOW_SERVER_URL would be the deployed URL of your Next.js app's API route.
      const flowServerUrl = process.env.GENKIT_FLOW_SERVER_URL;
      if (!flowServerUrl) {
          throw new Error("GENKIT_FLOW_SERVER_URL is not set in environment variables.");
      }
      
      const genkitEndpoint = `${flowServerUrl}/api/process-document`;
      
      // 5. Authentication: Generate an OIDC token to authenticate this function to the Genkit endpoint.
      const { GoogleAuth } = require("google-auth-library");
      const auth = new GoogleAuth();
      const client = await auth.getIdTokenClient(genkitEndpoint);
      
      // 6. Data Passing: Construct the request body.
      const requestBody = {
        data: {
          placeId,
          documentId,
          storagePath: filePath,
          fileName: fileName,
          uploadedBy: uploadedBy,
        },
      };

      logger.info(`[triggerDocumentAnalysis] Invoking Genkit flow at ${genkitEndpoint} for doc ${documentId}`);

      const response = await client.request({
        url: genkitEndpoint,
        method: "POST",
        data: requestBody,
        headers: { "Content-Type": "application/json" },
      });

      logger.info(`[triggerDocumentAnalysis] Successfully triggered flow. Status: ${response.status}`, { documentId });
      return response.data;

    } catch (error) {
      // 7. Robust Error Handling.
      logger.error(`[triggerDocumentAnalysis] Failed to trigger flow for doc ${documentId}.`, { error });
      // Optionally, update the Firestore document to a 'failed' state here.
      const db = admin.firestore();
      await db.collection('places').doc(placeId).collection('documents').doc(documentId).set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error during trigger.',
      }, { merge: true });
      
      // Re-throw the error to ensure the function is marked as failed.
      throw error;
    }
  }
);