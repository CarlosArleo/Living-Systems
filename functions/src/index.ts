/**
 * @fileoverview Cloud Functions for the RDI Platform.
 * This file contains the event-driven triggers that integrate Firebase services
 * and orchestrate the backend Genkit AI flows.
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

// Since Genkit flows are now part of the Next.js app, we can't directly
// import them here. The correct architectural pattern is for this Cloud Function
// to make a secure, authenticated HTTP request to the Next.js API endpoint
// that exposes the Genkit flow.

// Initialize Firebase Admin SDK if it hasn't been already.
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * A Cloud Function that triggers when a new file is uploaded to Cloud Storage.
 * Its sole purpose is to validate the event and securely invoke the
 * `/api/analyze` endpoint in our Next.js application, which in turn runs the Genkit flow.
 */
export const triggerDocumentAnalysisOnUpload = onObjectFinalized(
  {
    // Best practice: Be specific about the bucket if possible.
    // Using an environment variable for flexibility.
    bucket: process.env.FIREBASE_STORAGE_BUCKET || "",
    cpu: "gcf_gen1", // Specify a valid CPU allocation
  },
  async (event) => {
    const filePath = event.data.name;
    logger.info(`[triggerDocumentAnalysis] Event received for file: ${filePath}`);

    // 1. Idempotency Check: Exit if this is a metadata-only update.
    // THE FIX: Compare against the number 1, not the string "1".
    if (event.data.metageneration !== 1) {
      logger.log(`[triggerDocumentAnalysis] Ignoring metadata update for ${filePath}.`);
      return;
    }

    // 2. Path Validation: Ensure the file is in a valid `uploads` directory.
    // Example path: uploads/{userId}/{placeId}/{docId}_{fileName}
    const pathRegex = /^uploads\/([^/]+)\/([^/]+)\/([^/]+)_(.*)$/;
    const match = filePath.match(pathRegex);

    if (!match) {
      logger.log(`[triggerDocumentAnalysis] File path ${filePath} does not match the required 'uploads/{userId}/{placeId}/{docId}_{fileName}' pattern. Skipping.`);
      return;
    }
    
    const [, userId, placeId, docId, fileName] = match;

    try {
      // 4. Flow Invocation: The target is the Next.js app's API route.
      // THE FIX: This architecture is now correct. The Cloud Function's job is to
      // securely call the API endpoint that wraps the Genkit flow.
      const nextJsAppUrl = process.env.NEXT_JS_APP_URL;
      if (!nextJsAppUrl) {
          throw new Error("NEXT_JS_APP_URL environment variable is not set.");
      }
      
      const analysisEndpoint = `${nextJsAppUrl}/api/analyze`;
      
      // 5. Authentication: Generate an OIDC token to authenticate this function to the API route.
      const { GoogleAuth } = require("google-auth-library");
      const auth = new GoogleAuth();
      const client = await auth.getIdTokenClient(analysisEndpoint);
      
      const requestBody = {
        placeId,
        docId,
        storagePath: filePath,
        fileName,
        uploadedBy: userId,
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
        analysisTriggerError: true,
      }, { merge: true });
      
      throw error;
    }
  }
);


/**
 * The "Immune System" for the RDI Platform.
 * Triggers when a health issue is logged by the Monitor Agent. It constructs
 * a task for the Orchestrator Agent to attempt a self-healing refactor.
 */
export const triggerProactiveRefactor = onDocumentCreated(
  "system_health/{issueId}",
  (event) => {
    logger.info(`[Proactive Refactor] New system health issue detected: ${event.params.issueId}`);
    try {
      const issueData = event.data?.data();

      if (!issueData || typeof issueData.metric !== 'string' || typeof issueData.resourceName !== 'string') {
        logger.warn("[Proactive Refactor] Document is missing required fields (metric, resourceName). Skipping.");
        return;
      }
      
      const { metric, threshold, measuredValue, resourceName } = issueData;

      const taskDescription = `Refactor the code at '${resourceName}' to fix a performance bottleneck. The '${metric}' is ${measuredValue}, which violates the constitutional limit of ${threshold}. Analyze the code for inefficient patterns and generate a more performant version.`;
      
      const commandToRun = `npx tsx scripts/orchestrator.ts "${taskDescription}" "${resourceName}"`;
      
      logger.info(
        "[Proactive Refactor] A task has been generated for the Orchestrator Agent. To attempt an automatic fix, run the following command:",
        {
          issueId: event.params.issueId,
          detectedMetric: metric,
          violatingResource: resourceName,
          suggestedCommand: commandToRun,
        }
      );

    } catch (error) {
      logger.error(`[Proactive Refactor] Failed to process health issue ${event.params.issueId}.`, { error });
    }
  }
);
