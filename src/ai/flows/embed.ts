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
    const embeddingResponse = await ai.embed({
      embedder: googleAI.embedder('text-embedding-004'),
      content: text,
    });

    // CORRECTED: The embedding is directly on the response object, not in an array.
    return embeddingResponse.embedding;
  }
);
