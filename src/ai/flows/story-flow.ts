
/**
 * @fileOverview A flow for synthesizing a "Story of Place" narrative from
 *               all available document summaries for a given place.
 */
'use server';

import { ai } from '../genkit';
import { googleAI } from '@genkit-ai/googleai';
import {
  StoryInputSchema,
  StoryOutputSchema,
  type StoryInput,
  type StoryOutput,
} from './story-schemas';
import * as admin from 'firebase-admin';
import { projectConfig } from '../config';

// --- Robust Firebase Admin SDK Initialization ---
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      storageBucket: projectConfig.storageBucket,
    });
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed!', e);
    throw new Error('Firebase Admin SDK could not be initialized.');
  }
}
const db = admin.firestore();


const generateStoryOfPlaceFlow = ai.defineFlow(
  {
    name: 'generateStoryOfPlaceFlow',
    inputSchema: StoryInputSchema,
    outputSchema: StoryOutputSchema,
  },
  async (input: StoryInput) => {
    console.log(`[generateStoryOfPlaceFlow] Starting for placeId: ${input.placeId}`);

    const documentsSnapshot = await db
      .collection('places')
      .doc(input.placeId)
      .collection('documents')
      .where('status', '==', 'analyzed')
      .get();

    if (documentsSnapshot.empty) {
      throw new Error('No analyzed documents found for this place. Cannot generate a story.');
    }

    const contextPieces: string[] = [];
    documentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.overallSummary) {
        contextPieces.push(`From document '${data.sourceFile}': ${data.overallSummary}`);
      }
      if (data.analysis && typeof data.analysis === 'object') {
        for (const capitalKey in data.analysis) {
            const capital = data.analysis[capitalKey];
            if (capital && capital.summary) {
                contextPieces.push(`[${capitalKey}] ${capital.summary}`);
            }
             if (capital && Array.isArray(capital.keyDataPoints)) {
                contextPieces.push(`[${capitalKey} Key Data] ${capital.keyDataPoints.join(', ')}`);
            }
        }
      }
    });
    
    if (contextPieces.length === 0) {
        throw new Error('No document summaries available to generate a story.');
    }

    const prompt = `
        You are a master storyteller and a wise regenerative development expert. Your task is to synthesize the following collection of document summaries and data points into a single, coherent, and compelling "Story of Place." This story should weave the different threads from the summaries together into a flowing narrative that reveals the unique identity and core organizing patterns of this place.

        **CRITICAL DIRECTIVE: Conclude your narrative with a section titled "Latent Potential".** This section MUST identify opportunities and underutilized assets based on the provided context. Do not only describe problems.

        CONTEXT & DATA POINTS:
        ---
        ${contextPieces.join('\n---\n')}
        ---

        Based on the context above, generate the "Story of Place."
    `;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      prompt: prompt,
      output: { format: 'text' },
      config: { temperature: 0.5 },
    });

    const story = llmResponse.text;
    const now = new Date();

    await db.collection('places').doc(input.placeId).update({
      storyOfPlace: story,
      storyUpdatedAt: now,
    });
    
    console.log(`[generateStoryOfPlaceFlow] Successfully generated and saved story for placeId: ${input.placeId}`);

    return {
      story,
      updatedAt: now.toISOString(),
    };
  }
);

export async function generateStoryOfPlace(
  input: StoryInput
): Promise<StoryOutput> {
  return generateStoryOfPlaceFlow(input);
}
