
/**
 * @fileOverview A flow for synthesizing a "Story of Place" narrative from
 *               all available document summaries for a given place.
 */
'use server';

import { ai, googleAI } from '../genkit';
import {
  StoryInputSchema,
  StoryOutputSchema,
  type StoryInput,
  type StoryOutput,
} from './story-schemas';
import * as admin from 'firebase-admin';

// --- Robust Firebase Admin SDK Initialization ---
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
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
  async (input) => {
    console.log(`[generateStoryOfPlaceFlow] Starting for placeId: ${input.placeId}`);

    const capitalsSnapshot = await db
      .collection('places')
      .doc(input.placeId)
      .collection('capitals')
      .get();

    if (capitalsSnapshot.empty) {
      throw new Error('No documents found for this place. Cannot generate a story.');
    }

    const contextPieces: string[] = [];
    capitalsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Add the overall summary of the document
      if (data.overallSummary) {
        contextPieces.push(`From document '${data.sourceFile}': ${data.overallSummary}`);
      }
      // Add the qualitative summaries from each capital analysis
      if (data.analysis && typeof data.analysis === 'object') {
        for (const capitalKey in data.analysis) {
            const capital = data.analysis[capitalKey];
            if (capital && capital.qualitativeSummary) {
                contextPieces.push(`[${capitalKey}] ${capital.qualitativeSummary}`);
            }
        }
      }
    });
    
    if (contextPieces.length === 0) {
        throw new Error('No document summaries available to generate a story.');
    }

    const prompt = `
        You are a master storyteller and regenerative development expert.
        Your task is to synthesize the following collection of document summaries and data points into a single, coherent, and compelling "Story of Place."
        This story should capture the unique identity, core patterns, and evolutionary potential of the place.
        Weave the different threads from the summaries together into a flowing narrative. Do not just list the summaries.

        CONTEXT & DATA POINTS:
        ---
        ${contextPieces.join('\n---\n')}
        ---

        Based on this context, generate the "Story of Place."
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
