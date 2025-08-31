
/**
 * @fileoverview This file mirrors the main integralAssessmentFlow from the `src` directory.
 * It is required here so that the Cloud Function in `functions/src/index.ts` can import
 * and call it directly. This avoids complex cross-package imports in a serverless environment.
 */
'use server';

import { ai, googleAI } from './genkit-config'; // Use local genkit config
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs/promises';
import * as path from 'path';

// --- This file does NOT initialize firebase-admin, it assumes it's already done ---
const db = admin.firestore();
const storage = getStorage();

const FlowInputSchema = z.object({
  placeId: z.string().min(1, { message: "placeId cannot be empty." }),
  documentId: z.string().min(1, { message: "documentId cannot be empty." }),
  storagePath: z.string().min(1, { message: "storagePath cannot be empty." }),
});

const CapitalExtractionSchema = z.object({
  isPresent: z.boolean(),
  summary: z.string(),
  keyDataPoints: z.array(z.string()),
  extractedText: z.string(),
});

const AIOutputSchema = z.object({
  overallSummary: z.string(),
  geoJSON: z.any(),
  analysis: z.object({
    naturalCapital: CapitalExtractionSchema,
    humanCapital: CapitalExtractionSchema,
    socialCapital: CapitalExtractionSchema,
    manufacturedCapital: CapitalExtractionSchema,
    financialCapital: CapitalExtractionSchema,
  }),
});

async function loadPromptTemplate(): Promise<string> {
    // Note: The path needs to be relative to the executing function's root
    const promptPath = path.join(__dirname, '..', '..', 'src/ai/prompts/integralAssessment.prompt');
    try {
        return await fs.readFile(promptPath, 'utf-8');
    } catch(e) {
        console.error("Error reading prompt template from: ", promptPath);
        // Fallback prompt
        return "Analyze the document at {{fileUrl}} for the Five Capitals.";
    }
}

export const integralAssessmentFlow = ai.defineFlow(
  {
    name: 'integralAssessmentFlow',
    inputSchema: FlowInputSchema,
    outputSchema: z.object({ documentId: z.string(), status: z.string() }),
    // Add required environment variables for this function
    requiredEnvironment: ['GCLOUD_PROJECT'],
  },
  async (input) => {
    const { placeId, documentId, storagePath } = input;
    const docRef = db.collection('places').doc(placeId).collection('documents').doc(documentId);

    try {
      const docSnapshot = await docRef.get();
      if (!docSnapshot.exists) {
        throw new Error(`Document ${documentId} does not exist.`);
      }
      
      const docData = docSnapshot.data()!;
      await docRef.update({ status: 'analyzing' });

      const fileRef = storage.bucket().file(storagePath);
      const [signedUrl] = await fileRef.getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 });

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
      if (!aiOutput) throw new Error("AI model returned empty output.");

      await docRef.update({
        status: 'analyzed',
        analysisTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        analysis: aiOutput.analysis,
        overallSummary: aiOutput.overallSummary,
        geoJSON: JSON.stringify(aiOutput.geoJSON),
      });

      return { documentId, status: 'success' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
      await docRef.set({ status: 'failed', error: errorMessage }, { merge: true });
      throw error;
    }
  }
);
