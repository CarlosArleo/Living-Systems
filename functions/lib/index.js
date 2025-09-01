"use strict";
/**
 * @fileoverview Cloud Functions for the RDI Platform.
 * This file contains the event-driven triggers that integrate Firebase services
 * and orchestrate the backend Genkit AI flows.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerProactiveRefactor = exports.triggerDocumentAnalysisOnUpload = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const firestore_1 = require("firebase-functions/v2/firestore");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
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
exports.triggerDocumentAnalysisOnUpload = (0, storage_1.onObjectFinalized)({
    // Best practice: Be specific about the bucket if possible.
    // Using an environment variable for flexibility.
    bucket: process.env.FIREBASE_STORAGE_BUCKET || "",
    cpu: "gcf_gen1", // Specify a valid CPU allocation
}, async (event) => {
    const filePath = event.data.name;
    firebase_functions_1.logger.info(`[triggerDocumentAnalysis] Event received for file: ${filePath}`);
    // 1. Idempotency Check: Exit if this is a metadata-only update.
    // THE FIX: Compare against the number 1, not the string "1".
    if (event.data.metageneration !== 1) {
        firebase_functions_1.logger.log(`[triggerDocumentAnalysis] Ignoring metadata update for ${filePath}.`);
        return;
    }
    // 2. Path Validation: Ensure the file is in a valid `uploads` directory.
    // Example path: uploads/{userId}/{placeId}/{docId}_{fileName}
    const pathRegex = /^uploads\/([^/]+)\/([^/]+)\/([^/]+)_(.*)$/;
    const match = filePath.match(pathRegex);
    if (!match) {
        firebase_functions_1.logger.log(`[triggerDocumentAnalysis] File path ${filePath} does not match the required 'uploads/{userId}/{placeId}/{docId}_{fileName}' pattern. Skipping.`);
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
        firebase_functions_1.logger.info(`[triggerDocumentAnalysis] Invoking analysis endpoint at ${analysisEndpoint} for doc ${docId}`);
        const response = await client.request({
            url: analysisEndpoint,
            method: "POST",
            data: requestBody,
            headers: { "Content-Type": "application/json" },
        });
        firebase_functions_1.logger.info(`[triggerDocumentAnalysis] Successfully triggered analysis flow. Status: ${response.status}`, { documentId: docId });
        return response.data;
    }
    catch (error) {
        // 8. Robust Error Handling.
        firebase_functions_1.logger.error(`[triggerDocumentAnalysis] Failed to trigger analysis for doc ${docId}.`, { error });
        const db = admin.firestore();
        const docRef = db.collection('places').doc(placeId).collection('documents').doc(docId);
        await docRef.set({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error during trigger.',
            analysisTriggerError: true,
        }, { merge: true });
        throw error;
    }
});
/**
 * The "Immune System" for the RDI Platform.
 * Triggers when a health issue is logged by the Monitor Agent. It constructs
 * a task for the Orchestrator Agent to attempt a self-healing refactor.
 */
exports.triggerProactiveRefactor = (0, firestore_1.onDocumentCreated)("system_health/{issueId}", (event) => {
    firebase_functions_1.logger.info(`[Proactive Refactor] New system health issue detected: ${event.params.issueId}`);
    try {
        const issueData = event.data?.data();
        if (!issueData || typeof issueData.metric !== 'string' || typeof issueData.resourceName !== 'string') {
            firebase_functions_1.logger.warn("[Proactive Refactor] Document is missing required fields (metric, resourceName). Skipping.");
            return;
        }
        const { metric, threshold, measuredValue, resourceName } = issueData;
        const taskDescription = `Refactor the code at '${resourceName}' to fix a performance bottleneck. The '${metric}' is ${measuredValue}, which violates the constitutional limit of ${threshold}. Analyze the code for inefficient patterns and generate a more performant version.`;
        const commandToRun = `npx tsx scripts/orchestrator.ts "${taskDescription}" "${resourceName}"`;
        firebase_functions_1.logger.info("[Proactive Refactor] A task has been generated for the Orchestrator Agent. To attempt an automatic fix, run the following command:", {
            issueId: event.params.issueId,
            detectedMetric: metric,
            violatingResource: resourceName,
            suggestedCommand: commandToRun,
        });
    }
    catch (error) {
        firebase_functions_1.logger.error(`[Proactive Refactor] Failed to process health issue ${event.params.issueId}.`, { error });
    }
});
//# sourceMappingURL=index.js.map