
/**
 * @fileoverview Genkit flow to perform the "Integral Assessment" on a document.
 * This flow is designed to be triggered by a Cloud Function when a new file is uploaded.
 */

'use server';

import { ai, googleAI } from '../genkit';
import { z } from 'zod';
import { firebase } from '@genkit-ai/firebase';
import { dotprompt } from '@genkit-ai/dotprompt';
import { defineDotprompt } from '@genkit-ai/dotprompt';

// Register the prompt so Genkit knows about it.
defineDotprompt({
    name: 'integralAssessmentPrompt',
    source: '../prompts/integralAssessment.prompt',
    model: googleAI.model('gemini-1.5-pro'),
});

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

export const integralAssessmentFlow = ai.defineFlow(
  {
    name: 'integralAssessmentFlow',
    inputSchema: FlowInputSchema,
    outputSchema: FlowOutputSchema,
  },
  async ({ placeId, documentId, storagePath }) => {
    return ai.run('integral-assessment-steps', async () => {
      const docRefPath = `places/${placeId}/documents/${documentId}`;
      
      try {
        await firebase.updateDoc(docRefPath, { status: 'analyzing' });

        const docData = await firebase.getDoc(docRefPath);
        if (!docData) {
          throw new Error(`Document ${documentId} not found in place ${placeId}.`);
        }

        const signedUrl = await firebase.generateSignedUrl({
          path: storagePath,
          method: 'GET',
          expires: Date.now() + 15 * 60 * 1000,
        });
        if (!signedUrl) {
          throw new Error(`Could not generate signed URL for ${storagePath}`);
        }

        const prompt = await dotprompt.render('integralAssessmentPrompt', {
            input: {
                initialCapitalCategory: docData.initialCapitalCategory || 'Unspecified',
                sourceFile: docData.sourceFile,
                fileUrl: signedUrl,
            },
            output: {
                schema: AIOutputSchema,
                format: 'json',
            }
        });

        const result = await ai.generate(prompt);
        
        const aiOutput = result.output;
        if (!aiOutput) {
          throw new Error("AI model returned an empty or invalid output.");
        }

        await firebase.updateDoc(docRefPath, {
          status: 'analyzed',
          analysisTimestamp: new Date().toISOString(),
          analysis: aiOutput.analysis,
          overallSummary: aiOutput.overallSummary,
          geoJSON: JSON.stringify(aiOutput.geoJSON),
        });

        return { documentId, status: 'success', message: 'Analysis complete.' };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during analysis.';
        await firebase.updateDoc(docRefPath, { status: 'failed', error: errorMessage });
        throw error;
      }
    });
  }
);
