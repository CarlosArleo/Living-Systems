/**
 * @fileOverview API route to trigger the initial data harmonization (metadata creation) flow.
 * This is called by the client immediately after uploading a file to Cloud Storage.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// CORRECTED: Import the new unified flow
import { processUploadedDocument } from '@/ai/flows/processing'; 
import { getAuth } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
      admin.initializeApp();
    } catch (e) {
      console.error('CRITICAL: Firebase Admin SDK initialization failed in API route!', e);
    }
}
const db = admin.firestore();

// This schema validates the incoming request from the client.
const HarmonizeApiInputSchema = z.object({
  placeId: z.string().min(1, 'placeId is required.'),
  initialCapitalCategory: z.string(),
  storagePath: z.string().min(1, 'storagePath is required.'),
  sourceFile: z.string().min(1, 'sourceFile is required.'),
});

export async function POST(req: NextRequest) {
  try {
    const idToken = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;


    const json = await req.json();
    const validation = HarmonizeApiInputSchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: validation.error.issues },
        { status: 400 }
      );
    }
    
    // Create a new document ID on the server to pass to the flow
    const documentId = db.collection('places').doc().id;

    // IMPORTANT: Asynchronously trigger the full processing flow.
    // We do NOT await the result here. This makes the API return instantly,
    // and the heavy AI work happens in the background.
    processUploadedDocument({ 
        ...validation.data,
        uploadedBy: uid,
        documentId: documentId
     });

    // Return an immediate success response to the client.
    return NextResponse.json({ 
        message: 'Document processing initiated.',
        documentId: documentId 
    });

  } catch (error) {
    console.error('[Harmonize API] An unexpected error occurred:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json(
      { error: 'Failed to process the harmonization request.', details: errorMessage },
      { status: 500 }
    );
  }
}
