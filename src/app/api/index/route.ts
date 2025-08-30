/**
 * @fileOverview API route to trigger the knowledge base indexing for a specific Place.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { indexerFlow } from '@/ai/flows/knowledge';
import { IndexerInputSchema } from '@/ai/flows/knowledge-schemas';
import { z } from 'zod';

// This initialization should be shared, but for safety, we ensure it runs.
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed in API route!', e);
  }
}
const db = admin.firestore();

const IndexApiInputSchema = z.object({
  placeId: z.string().min(1, 'placeId cannot be empty.'),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const validation = IndexApiInputSchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: validation.error.issues },
        { status: 400 }
      );
    }
    
    const { placeId } = validation.data;
    console.log(`[Index API] Received request to build knowledge base for placeId: ${placeId}`);

    // 1. Query all documents in the 'capitals' sub-collection for the given placeId.
    const capitalsSnapshot = await db.collection('places').doc(placeId).collection('capitals').get();

    if (capitalsSnapshot.empty) {
      console.log(`[Index API] No documents found in capitals collection for placeId: ${placeId}. Nothing to index.`);
      return NextResponse.json({ message: 'No documents found to index.' });
    }

    // 2. Extract the 'summary' text from each document.
    const textsToIndex = capitalsSnapshot.docs.map(doc => {
      const data = doc.data();
      // Ensure we only include documents that have a non-empty summary.
      return data.summary && typeof data.summary === 'string' ? data.summary : null;
    }).filter((text): text is string => text !== null); // Filter out any nulls

    if (textsToIndex.length === 0) {
        console.log(`[Index API] Documents were found, but none had a valid 'summary' field to index.`);
        return NextResponse.json({ message: 'No text content found to index.' });
    }
    
    console.log(`[Index API] Found ${textsToIndex.length} text summaries to index. Calling indexerFlow...`);

    // 3. Call the indexerFlow with the collected texts.
    const result = await indexerFlow({ texts: textsToIndex });

    console.log(`[Index API] indexerFlow completed successfully.`, result);
    return NextResponse.json({
      message: 'Knowledge base indexing completed successfully.',
      ...result,
    });

  } catch (error) {
    console.error('[Index API] An unexpected error occurred:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json(
      { error: 'Failed to build the knowledge base.', details: errorMessage },
      { status: 500 }
    );
  }
}
