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
 * Creates a generic Firestore retriever for the 'knowledge' collection.
 * Filtering by placeId is now handled in the RAG flow itself.
 */
export function createKnowledgeRetriever() {
  return defineFirestoreRetriever(ai, {
    name: `knowledgeRetriever`,
    firestore: db,
    collection: 'knowledge',
    contentField: 'text',
    vectorField: 'embedding',
    embedder: googleAI.embedder('text-embedding-004'),
  });
}
