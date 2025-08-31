/**
 * @fileOverview Schemas and non-server objects for the knowledge and RAG flows.
 *               This file is safe to import on the client.
 */

import { z } from 'zod';
import { ai, googleAI } from '../genkit';
import { defineFirestoreRetriever } from '@genkit-ai/firebase';
import * as admin from 'firebase-admin';

// This file does not re-initialize firebase-admin, it assumes it's been
// initialized elsewhere for server-side code. It provides a db handle
// for schema definitions that need it.
const db = admin.firestore();

// --- Schemas for Knowledge Indexing ---
// Every document in our knowledge base is now tagged with a placeId.
export const KnowledgeSchema = z.object({
  placeId: z.string(),
  text: z.string(),
  embedding: z.array(z.number()),
});

export const IndexerInputSchema = z.object({
  placeId: z.string(),
  texts: z.array(z.string()),
});


// --- Schemas for RAG Flow ---
export const RagQueryInputSchema = z.object({
  placeId: z.string(),
  query: z.string(),
});
export type RagQueryInput = z.infer<typeof RagQueryInputSchema>;

export const RagQueryOutputSchema = z.object({
  answer: z.string(),
  context: z.array(z.string()),
});
export type RagQueryOutput = z.infer<typeof RagQueryOutputSchema>;


// --- Retrievers ---

/**
 * Creates a configured Firestore retriever for a specific place.
 * This function allows us to generate retrievers on-the-fly that
 * are scoped to the user's currently selected place.
 */
export function createPlaceSpecificRetriever(placeId: string) {
  const knowledgeCollection = db.collection('knowledge');
  
  // The query is updated to filter by the provided placeId.
  const placeSpecificQuery = knowledgeCollection.where('placeId', '==', placeId);

  // CORRECTED: Updated to the modern Genkit API for defineFirestoreRetriever.
  // The function now takes 'ai' as the first parameter, and the configuration
  // object is structured with top-level properties.
  return defineFirestoreRetriever(ai, {
    name: `knowledgeRetriever_${placeId}`,
    firestore: db,
    collection: 'knowledge', // collection name as string
    query: placeSpecificQuery,
    contentField: 'text',
    vectorField: 'embedding',
    embedder: googleAI.embedder('text-embedding-004'),
  });
}
