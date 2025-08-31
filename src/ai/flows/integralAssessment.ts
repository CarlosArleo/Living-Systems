
/**
 * @fileoverview Genkit flow to perform the "Integral Assessment" on a document.
 * This flow is designed to be triggered by a Cloud Function when a new file is uploaded.
 */

'use server';

import { ai, googleAI } from '../genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs/promises';
import * as path from 'path';

// This flow runs in the backend context where the Admin SDK is appropriate.
// Initialization should be handled by the entry point (dev.ts or Cloud Functions index).
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('integralAssessmentFlow: Firebase Admin SDK initialization failed!', e);
  }
}
const db = admin.firestore();
const storage = getStorage();


// --- Zod Schemas ---
const FlowInputSchema = z.object({
  placeId: z.string(),
  documentId: z.string(),
  storagePath: z.string(),
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

const FlowOutputSchema = z.object({
  documentId: z.string(),
  status: z.string(),
  message: z.string(),
});

// Helper to load the prompt template from the file system.
async function loadPromptTemplate(): Promise<string> {
  // This path assumes the script is run from the project root.
  const promptPath = path.join(process.cwd(), 'src/ai/prompts/integralAssessment.prompt');
  return await fs.readFile(promptPath, 'utf-8');
}


export const integralAssessmentFlow = ai.defineFlow(
  {
    name: 'integralAssessmentFlow',
    inputSchema: FlowInputSchema,
    outputSchema: FlowOutputSchema,
  },
  async ({ placeId, documentId, storagePath }) => {
    return ai.run('integral-assessment-steps', async () => {
      const docRef = db.collection('places').doc(placeId).collection('documents').doc(documentId);
      
      try {
        // CORRECTED LOGIC: First, get the document to ensure it exists.
        const docSnapshot = await docRef.get();
        if (!docSnapshot.exists) {
          throw new Error(`Document ${documentId} not found in place ${placeId}. This flow requires the document metadata to exist before running.`);
        }
        
        // Now that we know it exists, update the status.
        await docRef.update({ status: 'analyzing' });

        const docData = docSnapshot.data()!;

        const fileRef = storage.bucket().file(storagePath);
        const [signedUrl] = await fileRef.getSignedUrl({
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000,
        });

        if (!signedUrl) {
          throw new Error(`Could not generate signed URL for ${storagePath}`);
        }

        const promptTemplate = await loadPromptTemplate();

        // Dynamically replace placeholders in the template.
        const prompt = promptTemplate
          .replace('{{initialCapitalCategory}}', docData.initialCapitalCategory || 'Unspecified')
          .replace('{{sourceFile}}', docData.sourceFile || 'Unknown')
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

        await docRef.update({
          status: 'analyzed',
          analysisTimestamp: admin.firestore.FieldValue.serverTimestamp(),
          analysis: aiOutput.analysis,
          overallSummary: aiOutput.overallSummary,
          geoJSON: JSON.stringify(aiOutput.geoJSON),
        });

        return { documentId, status: 'success', message: 'Analysis complete.' };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during analysis.';
        // Update the document with a 'failed' status for observability.
        await docRef.update({ status: 'failed', error: errorMessage });
        throw error;
      }
    });
  }
);
