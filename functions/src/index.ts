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
 * `/api/analyze` endpoint in our Next.js application.
 */
export const triggerDocumentAnalysisOnUpload = onObjectFinalized(
  {
    // Best practice: Be specific about the bucket if possible.
    // Using an environment variable for flexibility.
    bucket: process.env.FIREBASE_STORAGE_BUCKET || "",
    cpu: "gcf_gen1", // Specify a valid CPU allocation
  },
  async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    logger.info(`[triggerDocumentAnalysis] Event received for file: ${filePath}`, {
      contentType,
      bucket: fileBucket,
    });

    // 3. Idempotency Check: Exit if this is a metadata-only update.
    if (event.data.metageneration !== "1") {
      logger.log(`[triggerDocumentAnalysis] Ignoring metadata update for ${filePath}.`);
      return;
    }

    // 2. Path Validation: Ensure the file is in a valid `places` directory.
    // Example path: uploads/{userId}/{placeId}/{docId}_{fileName}
    const pathRegex = /^uploads\/([^/]+)\/([^/]+)\/([^/]+)_(.*)$/;
    const match = filePath.match(pathRegex);

    if (!match) {
      logger.log(`[triggerDocumentAnalysis] File path ${filePath} does not match the required pattern. Skipping.`);
      return;
    }
    
    const [, userId, placeId, docId, fileName] = match;

    // 7. Simplicity and Separation of Concerns: This function only triggers the flow.
    try {
      // 4. Flow Invocation: The target is the Next.js app's API route.
      const nextJsAppUrl = process.env.NEXT_JS_APP_URL;
      if (!nextJsAppUrl) {
          throw new Error("NEXT_JS_APP_URL environment variable is not set.");
      }
      
      const analysisEndpoint = `${nextJsAppUrl}/api/analyze`;
      
      // 5. Authentication: Generate an OIDC token to authenticate this function to the API route.
      // The google-auth-library is part of the default Cloud Functions environment.
      const { GoogleAuth } = require("google-auth-library");
      const auth = new GoogleAuth();
      const client = await auth.getIdTokenClient(analysisEndpoint);
      
      // 6. Data Passing: Construct the request body for the `/api/analyze` route.
      const requestBody = {
        placeId,
        docId,
      };

      logger.info(`[triggerDocumentAnalysis] Invoking analysis endpoint at ${analysisEndpoint} for doc ${docId}`);

      const response = await client.request({
        url: analysisEndpoint,
        method: "POST",
        data: requestBody,
        headers: { "Content-Type": "application/json" },
      });

      logger.info(`[triggerDocumentAnalysis] Successfully triggered analysis flow. Status: ${response.status}`, { documentId: docId });
      return response.data;

    } catch (error) {
      // 8. Robust Error Handling.
      logger.error(`[triggerDocumentAnalysis] Failed to trigger analysis for doc ${docId}.`, { error });
      
      const db = admin.firestore();
      const docRef = db.collection('places').doc(placeId).collection('documents').doc(docId);
      
      await docRef.set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error during trigger.',
      }, { merge: true });
      
      // Re-throw the error to ensure the function is marked as failed for monitoring.
      throw error;
    }
  }
);
