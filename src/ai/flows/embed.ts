/**
 * @fileOverview A simple Genkit flow for generating text embeddings.
 */
'use server';

import { ai, googleAI } from '@/ai/genkit';
import { z } from 'zod';

export const embedText = ai.defineFlow(
  {
    name: 'embedText',
    inputSchema: z.string(),
    outputSchema: z.array(z.number()),
  },
  async (text) => {
    // The ai.embed() function always returns an array of results,
    // even for a single input, to support batching.
    const embeddingResponse = await ai.embed({
      embedder: googleAI.embedder('text-embedding-004'),
      content: text,
    });

    // THE FIX:
    // 1. Check if the response array has at least one result.
    // 2. Access the first element of the array (`embeddingResponse[0]`).
    // 3. Access the `.embedding` property of that first element.
    if (embeddingResponse && embeddingResponse.length > 0) {
      return embeddingResponse[0].embedding;
    }

    // If for some reason the embedding fails, throw an error
    // instead of returning undefined, which provides a clearer error message.
    throw new Error(`Failed to generate embedding for text: "${text.substring(0, 50)}..."`);
  }
);
