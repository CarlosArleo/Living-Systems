/**
 * @fileoverview Genkit flow to perform the "Integral Assessment" on a document.
 * This flow is triggered by the onObjectFinalized Cloud Function.
 */
'use server';

import { ai } from '../genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';

// Re-use initialization from the root index.ts
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


export const integralAssessmentFlow = ai.defineFlow(
  {
    name: 'integralAssessmentFlow',
    inputSchema: FlowInputSchema,
    outputSchema: z.object({
      documentId: z.string(),
      status: z.string(),
      message: z.string(),
    }),
  },
  async ({ placeId, documentId, storagePath }) => {
    const docRef = db.collection('places').doc(placeId).collection('documents').doc(documentId);

    try {
      await docRef.update({ status: 'analyzing' });

      const docSnapshot = await docRef.get();
      const docData = docSnapshot.data();

      if (!docData) {
        throw new Error(`Document ${documentId} not found in place ${placeId}.`);
      }

      const fileRef = storage.bucket().file(storagePath);
      const [signedUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000,
      });

      const prompt = `
        You are an expert data extractor for a Regenerative Development project. Your task is to read the provided document and structure its content into the Five Capitals framework.
        
        DOCUMENT DETAILS:
        - Initial Category Provided by User: "${docData.initialCapitalCategory || 'Unspecified'}"
        - Source File Name: "${docData.sourceFile}"
        - Document Content: {{media url='${signedUrl}'}}

        EXTRACTION REQUIREMENTS:
        1.  Provide a brief, 1-2 sentence overallSummary of the document's main purpose.
        2.  Extract ALL geographic information and format it as a single, valid GeoJSON FeatureCollection.
        3.  For EACH of the five capitals, extract the verbatim text, a summary, key data points, and whether data is present.
        4.  Return a single, valid JSON object that strictly follows the required Zod schema.
      `;

      const result = await ai.generate({
        model: googleAI.model('gemini-1.5-pro'),
        prompt,
        output: { format: 'json', schema: AIOutputSchema },
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
      await docRef.update({ status: 'failed', error: errorMessage });
      throw error; // Re-throw to let the trigger know it failed.
    }
  }
);