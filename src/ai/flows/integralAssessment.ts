/**
 * @fileoverview Genkit flow to perform the "Integral Assessment" on a document.
 * This flow is designed to be triggered by a Cloud Function when a new file is uploaded.
 */
'use server';

import { ai, googleAI } from '../genkit';
import { z } from 'zod';
import { defineFlow, run } from 'genkit';
import { firebase } from '@genkit-ai/firebase';
import { dotprompt } from '@genkit-ai/dotprompt';

// Define the Zod schema for the flow's input
const FlowInputSchema = z.object({
  placeId: z.string(),
  documentId: z.string(),
  storagePath: z.string(),
});

// Define the Zod schema for the final output of the flow
const FlowOutputSchema = z.object({
  documentId: z.string(),
  status: z.string(),
  message: z.string(),
});

// Register the prompt from the .prompt file
dotprompt.register('integralAssessmentPrompt', {
  source: '../prompts/integralAssessment.prompt',
  model: googleAI.model('gemini-1.5-pro'),
});

export const integralAssessmentFlow = defineFlow(
  {
    name: 'integralAssessmentFlow',
    inputSchema: FlowInputSchema,
    outputSchema: FlowOutputSchema,
  },
  async ({ placeId, documentId, storagePath }) => {
    // Use a run span for better tracing in the Genkit UI
    return run('integral-assessment-steps', async () => {
      const docRef = `places/${placeId}/documents/${documentId}`;
      
      try {
        // Step 1: Update the document status to 'analyzing'
        await firebase.updateDoc(docRef, { status: 'analyzing' });

        // Step 2: Get the document data to pass to the prompt
        const docData = await firebase.getDoc(docRef);
        if (!docData) {
          throw new Error(`Document ${documentId} not found in place ${placeId}.`);
        }

        // Step 3: Generate a signed URL for the AI to access the file
        const signedUrl = await firebase.generateSignedUrl({
            path: storagePath,
            expiration: '15m'
        });

        if (!signedUrl) {
            throw new Error(`Could not generate signed URL for ${storagePath}`);
        }

        // Step 4: Render the prompt and call the AI model
        const filledPrompt = await dotprompt.render('integralAssessmentPrompt', {
          initialCategory: docData.initialCapitalCategory || 'Unspecified',
          sourceFile: docData.sourceFile,
          signedUrl: signedUrl,
        });
        
        const llmResponse = await ai.generate(filledPrompt);
        const aiOutput = llmResponse.output();
        if (!aiOutput) {
            throw new Error("AI model returned an empty or invalid output.");
        }

        // Step 5: Update the Firestore document with the analysis results
        await firebase.updateDoc(docRef, {
            status: 'analyzed',
            analysisTimestamp: new Date().toISOString(), // Use ISO string for server-agnostic timestamp
            analysis: aiOutput.analysis,
            overallSummary: aiOutput.overallSummary,
            geoJSON: JSON.stringify(aiOutput.geoJSON),
        });

        return { documentId, status: 'success', message: 'Analysis complete.' };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during analysis.';
        
        // Attempt to update the document status to 'failed'
        await firebase.updateDoc(docRef, { status: 'failed', error: errorMessage }).catch(e => {
            console.error(`[integralAssessmentFlow] FATAL: Could not even update doc to failed status.`, e)
        });

        // Re-throw the original error to let the calling function (Cloud Function) know it failed
        throw error;
      }
    });
  }
);
