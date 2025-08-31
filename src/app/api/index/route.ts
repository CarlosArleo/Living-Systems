/**
 * @fileOverview API route to trigger the knowledge base indexing for a specific Place.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { indexerFlow } from '@/ai/flows/knowledge';
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

    // Query documents from both 'documents' and all capital-specific subcollections.
    // This provides a richer context for the knowledge base.
    const documentCollectionRef = db.collection('places').doc(placeId).collection('documents');
    const documentsSnapshot = await documentCollectionRef.where('status', '==', 'analyzed').get();

    const textsToIndex: string[] = [];
    documentsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.overallSummary) textsToIndex.push(data.overallSummary);

      if (data.analysis) {
        Object.values(data.analysis).forEach((capital: any) => {
          if (capital.summary) textsToIndex.push(capital.summary);
          if (capital.extractedText) textsToIndex.push(capital.extractedText);
        });
      }
    });

    if (textsToIndex.length === 0) {
        console.log(`[Index API] No text found to index for placeId: ${placeId}.`);
        return NextResponse.json({ message: 'No text content found to index.' });
    }
    
    console.log(`[Index API] Found ${textsToIndex.length} text chunks to index. Calling indexerFlow...`);

    // Call the indexerFlow with the collected texts AND the placeId.
    const result = await indexerFlow({
      placeId: placeId, // Pass the required placeId
      texts: textsToIndex,
    });

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
