/**
 * @fileOverview A flow for indexing and storing knowledge in Firestore.
 */
import { ai } from '../genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { IndexerInputSchema, KnowledgeSchema, type IndexerInput } from './knowledge-schemas';


// Ensure Firebase is initialized only once.
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed!', e);
  }
}
const db = admin.firestore();


/**
 * An idempotent flow that takes an array of texts for a specific placeId,
 * deletes any old knowledge for that place, generates new embeddings,
 * and writes them to the Firestore 'knowledge' collection.
 */
export const indexerFlow = ai.defineFlow(
  {
    name: 'indexerFlow',
    inputSchema: IndexerInputSchema,
    outputSchema: z.object({
      indexedCharacters: z.number(),
      documentsWritten: z.number(),
      documentsDeleted: z.number(),
    }),
  },
  async ({ placeId, texts }: IndexerInput) => {
    
    // 1. Delete all existing knowledge documents for this placeId.
    // This makes the indexing operation idempotent.
    console.log(`[indexerFlow] Deleting old knowledge for placeId: ${placeId}`);
    const knowledgeCollection = db.collection('knowledge');
    const oldDocsQuery = knowledgeCollection.where('placeId', '==', placeId);
    const oldDocsSnapshot = await oldDocsQuery.get();
    
    const deleteBatch = db.batch();
    oldDocsSnapshot.docs.forEach(doc => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
    const deletedCount = oldDocsSnapshot.size;
    console.log(`[indexerFlow] Deleted ${deletedCount} old documents.`);


    if (texts.length === 0) {
      return { indexedCharacters: 0, documentsWritten: 0, documentsDeleted: deletedCount };
    }

    // 2. Generate embeddings for the new text chunks.
    console.log(`[indexerFlow] Generating embeddings for ${texts.length} new text chunks.`);
    const embeddingResponses = await ai.embed({
      embedder: googleAI.embedder('text-embedding-004'),
      // CORRECTED: The 'content' property expects a simple array of strings for batch embedding.
      content: texts,
    });

    // 3. Write the new documents to Firestore.
    console.log(`[indexerFlow] Writing ${embeddingResponses.length} new documents to Firestore...`);
    const writeBatch = db.batch();
    let totalChars = 0;
    embeddingResponses.forEach((response, i) => {
      const docRef = knowledgeCollection.doc();
      const docData: z.infer<typeof KnowledgeSchema> = {
        placeId, // Tag with placeId
        text: texts[i],
        // The individual response for each text is the embedding array itself.
        embedding: response,
      };
      writeBatch.set(docRef, docData);
      totalChars += texts[i].length;
    });

    await writeBatch.commit();
    console.log('[indexerFlow] Batch write to Firestore successful.');

    return {
      indexedCharacters: totalChars,
      documentsWritten: embeddingResponses.length,
      documentsDeleted: deletedCount,
    };
  }
);
