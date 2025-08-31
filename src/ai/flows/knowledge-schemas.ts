/**
 * @fileOverview Schemas and retriever definitions for the knowledge and RAG flows.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { defineFirestoreRetriever } from '@genkit-ai/firebase';
import * as admin from 'firebase-admin';

// This file does not re-initialize firebase-admin, it assumes it's been
// initialized elsewhere for server-side code. It provides a db handle
// for schema definitions that need it.
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed in knowledge-schemas!', e);
  }
}
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
export type IndexerInput = z.infer<typeof IndexerInputSchema>;


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


// --- Retriever Definition ---

/**
 * Defines a generic retriever for the 'knowledge' collection in Firestore.
 * This is the modern, correct API usage for Genkit v1.18.0.
 * Filtering by placeId is handled dynamically in the RAG flow itself.
 */
// CORRECTED: Pass the `ai` instance as the first argument.
export const knowledgeRetriever = defineFirestoreRetriever(ai, {
  name: `knowledgeRetriever`,
  label: 'RDI Knowledge Base',
  firestore: db,
  collection: 'knowledge',
  contentField: 'text',
  vectorField: 'embedding',
  embedder: googleAI.embedder('text-embedding-004'),
});
