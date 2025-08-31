/**
 * @fileoverview A unified Genkit flow to handle the entire document processing pipeline,
 * from metadata creation to AI analysis. This flow is designed to be triggered by
 * the onObjectFinalized Cloud Function.
 */
'use server';

import { ai, googleAI } from '../genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs/promises';
import * as path from 'path';

// --- Initialization ---
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('Unified Flow: Firebase Admin SDK initialization failed!', e);
  }
}
const db = admin.firestore();
const storage = getStorage();

// --- Zod Schemas ---
const FlowInputSchema = z.object({
  placeId: z.string(),
  documentId: z.string(),
  storagePath: z.string(),
  fileName: z.string(),
  uploadedBy: z.string(), // UID of the user who uploaded the file
});

const CapitalExtractionSchema = z.object({
  isPresent: z.boolean().describe("Set to true if data for this capital is in the document."),
  summary: z.string().describe("A 2-3 sentence qualitative summary for this capital."),
  keyDataPoints: z.array(z.string()).describe("Up to 3 key quantitative or qualitative data points."),
  extractedText: z.string().describe("Verbatim text extracted for this capital."),
});

const AIOutputSchema = z.object({
  overallSummary: z.string().describe("A 1-2 sentence summary of the document's purpose."),
  geoJSON: z.any().describe("A valid GeoJSON FeatureCollection object."),
  analysis: z.object({
    naturalCapital: CapitalExtractionSchema,
    humanCapital: CapitalExtractionSchema,
    socialCapital: CapitalExtractionSchema,
    manufacturedCapital: CapitalExtractionSchema,
    financialCapital: CapitalExtractionSchema,
  }),
});

// --- Helper Functions ---
async function loadPromptTemplate(): Promise<string> {
  const promptPath = path.join(process.cwd(), 'src/ai/prompts/integralAssessment.prompt');
  return await fs.readFile(promptPath, 'utf-8');
}

// --- The Unified Flow ---
export const processUploadedDocument = ai.defineFlow(
  {
    name: 'processUploadedDocument',
    inputSchema: FlowInputSchema,
    outputSchema: z.object({
      documentId: z.string(),
      status: z.string(),
      message: z.string(),
    }),
  },
  async ({ placeId, documentId, storagePath, fileName, uploadedBy }) => {
    const docRef = db.collection('places').doc(placeId).collection('documents').doc(documentId);

    try {
      // ** Step 1: Create Metadata Document (The "Librarian" task) **
      // This is the critical step to prevent the race condition.
      console.log(`[processUploadedDocument] Creating metadata for doc: ${documentId}`);
      await docRef.set({
        sourceFile: fileName,
        storagePath: storagePath,
        uploadedBy: uploadedBy,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'processing', // Initial status
      });

      // ** Step 2: Perform Analysis (The "Deep Analyst" task) **
      console.log(`[processUploadedDocument] Starting analysis for doc: ${documentId}`);
      const fileRef = storage.bucket().file(storagePath);
      const [signedUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15-minute expiry
      });

      if (!signedUrl) {
        throw new Error(`Could not generate signed URL for ${storagePath}`);
      }

      const promptTemplate = await loadPromptTemplate();
      const prompt = promptTemplate
        .replace('{{sourceFile}}', fileName)
        .replace('{{fileUrl}}', signedUrl);

      const result = await ai.generate({
          model: googleAI.model('gemini-1.5-pro'),
          prompt,
          output: { format: 'json', schema: AIOutputSchema }
      });
      
      const aiOutput = result.output;
      if (!aiOutput) {
        throw new Error("AI model returned an empty or invalid output.");
      }

      // ** Step 3: Update Document with Analysis **
      console.log(`[processUploadedDocument] Storing analysis results for doc: ${documentId}`);
      await docRef.update({
        status: 'analyzed',
        analysisTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        analysis: aiOutput.analysis,
        overallSummary: aiOutput.overallSummary,
        geoJSON: JSON.stringify(aiOutput.geoJSON),
      });

      return { documentId, status: 'success', message: 'Document processed and analyzed successfully.' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during processing.';
      console.error(`[processUploadedDocument] Failed to process doc: ${documentId}. Error: ${errorMessage}`);
      // Update the document with a 'failed' status for observability.
      await docRef.set({ status: 'failed', error: errorMessage }, { merge: true });
      throw error; // Re-throw to let the Cloud Function trigger know it failed.
    }
  }
);
