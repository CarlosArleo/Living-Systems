
/**
 * @fileoverview The "Deep Analyst" flow. This flow is triggered by the onObjectFinalized
 * Cloud Function and performs the heavy, time-consuming AI analysis on a document
 * that has already been cataloged in Firestore.
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
    console.error('Integral Assessment: Firebase Admin SDK initialization failed!', e);
  }
}
const db = admin.firestore();
const storage = getStorage();

// --- Zod Schemas ---
const FlowInputSchema = z.object({
  placeId: z.string().min(1, { message: "placeId cannot be empty." }),
  documentId: z.string().min(1, { message: "documentId cannot be empty." }),
  storagePath: z.string().min(1, { message: "storagePath cannot be empty." }),
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

async function loadPromptTemplate(): Promise<string> {
  const promptPath = path.join(process.cwd(), 'src/ai/prompts/integralAssessment.prompt');
  return await fs.readFile(promptPath, 'utf-8');
}


// --- The Main Analysis Flow ---
export const integralAssessmentFlow = ai.defineFlow(
  {
    name: 'integralAssessmentFlow',
    inputSchema: FlowInputSchema,
    outputSchema: z.object({ documentId: z.string(), status: z.string() }),
  },
  async (input) => {
    const { placeId, documentId, storagePath } = input;
    const docRef = db.collection('places').doc(placeId).collection('documents').doc(documentId);

    try {
      // Step 1: GET the document to ensure it exists before proceeding.
      const docSnapshot = await docRef.get();
      if (!docSnapshot.exists) {
        throw new Error(`Document ${documentId} does not exist in place ${placeId}. Cannot start analysis.`);
      }
      
      const docData = docSnapshot.data()!;

      // Step 2: Update status to 'analyzing'
      await docRef.update({ status: 'analyzing' });

      // Step 3: Perform the analysis
      const fileRef = storage.bucket().file(storagePath);
      const [signedUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000,
      });

      const promptTemplate = await loadPromptTemplate();
      const prompt = promptTemplate
        .replace('{{sourceFile}}', docData.sourceFile || 'Unknown')
        .replace('{{initialCategory}}', docData.initialCapitalCategory || 'Unknown')
        .replace('{{fileUrl}}', signedUrl);

      const result = await ai.generate({
        model: googleAI.model('gemini-1.5-pro'),
        prompt,
        output: { format: 'json', schema: AIOutputSchema },
      });

      const aiOutput = result.output;
      if (!aiOutput) {
        throw new Error("AI model returned an empty or invalid output.");
      }

      // Step 4: Update document with results
      await docRef.update({
        status: 'analyzed',
        analysisTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        analysis: aiOutput.analysis,
        overallSummary: aiOutput.overallSummary,
        geoJSON: JSON.stringify(aiOutput.geoJSON),
      });

      return { documentId, status: 'success' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during processing.';
      console.error(`[integralAssessmentFlow] Failed to process doc: ${documentId}. Error: ${errorMessage}`);
      // Attempt to update the doc status to failed, even if it fails, we still throw
      try {
        await docRef.update({ status: 'failed', error: errorMessage });
      } catch (updateError) {
        console.error(`[integralAssessmentFlow] Additionally failed to update status to 'failed' for doc ${documentId}`, updateError);
      }
      throw error; // Re-throw the original error to ensure the trigger knows about the failure.
    }
  }
);
