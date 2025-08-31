
/**
 * @fileOverview A utility for retrieving relevant context from the project's
 * knowledge base using vector embeddings and cosine similarity.
 */
'use server';

import { ai } from './genkit';
import { googleAI } from '@genkit-ai/googleai';
import { promises as fs } from 'fs';
import path from 'path';

type KnowledgeChunk = {
  text: string;
  embedding: number[];
};

let knowledgeBase: KnowledgeChunk[] | null = null;

/**
 * Loads the knowledge base from the JSON file into memory.
 * Caches the result to avoid repeated file reads.
 */
async function loadKnowledgeBase(): Promise<KnowledgeChunk[]> {
  if (knowledgeBase) {
    return knowledgeBase;
  }

  const filePath = path.join(process.cwd(), 'rag-memory.json');
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    knowledgeBase = JSON.parse(fileContent);
    return knowledgeBase!;
  } catch (error) {
    console.error('Failed to load or parse rag-memory.json:', error);
    // Return an empty array on error to prevent crashes
    return [];
  }
}

/**
 * Calculates the cosine similarity between two vectors.
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @returns The cosine similarity score.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Retrieves the most relevant text chunks from the knowledge base for a given query.
 *
 * @param taskDescription The user's query or task description.
 * @param topK The number of top results to return.
 * @returns A promise that resolves to an array of the most relevant text chunks.
 */
export async function retrieveRelevantContext(
  taskDescription: string,
  topK: number = 5
): Promise<string[]> {
  const base = await loadKnowledgeBase();
  if (base.length === 0) {
    console.warn('Knowledge base is empty. Cannot retrieve context.');
    return [];
  }

  const embeddingResponse = await ai.embed({
      embedder: googleAI.embedder('text-embedding-004'),
      content: taskDescription,
  });
  
  const queryEmbedding = embeddingResponse;

  if (!queryEmbedding) {
      throw new Error("Failed to generate an embedding for the query.");
  }

  const similarities = base.map((chunk) => ({
    text: chunk.text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  similarities.sort((a, b) => b.score - a.score);

  return similarities.slice(0, topK).map((item) => item.text);
}
