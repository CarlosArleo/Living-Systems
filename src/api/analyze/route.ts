/**
 * @fileOverview API route to trigger ON-DEMAND document analysis.
 * This is now the primary entry point for kicking off the AI processing after a
 * document's metadata has been created.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processUploadedDocument } from '@/ai/flows/processing'; // CORRECT: Use the new unified flow
import { getAuth } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// --- Initialization ---
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed in Analyze API!', e);
  }
}
const db = getFirestore();


// --- Zod Schema ---
// This schema validates the incoming request from the client.
const AnalyzeApiInputSchema = z.object({
  placeId: z.string().min(1, 'placeId is required.'),
  docId: z.string().min(1, 'docId is required.'),
});


// --- Main API Handler ---
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const idToken = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2. Body Validation
    const json = await req.json();
    const validation = AnalyzeApiInputSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: validation.error.issues },
        { status: 400 }
      );
    }
    const { placeId, docId } = validation.data;

    // 3. Fetch Document Metadata
    const docRef = db.collection('places').doc(placeId).collection('documents').doc(docId);
    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    const docData = docSnapshot.data()!;


    // 4. Asynchronously Trigger the Unified Flow
    // We pass all the necessary info for the flow to do its work.
    // We DON'T `await` this, allowing the API to respond immediately.
    processUploadedDocument({
      placeId,
      documentId: docId,
      storagePath: docData.storagePath,
      fileName: docData.sourceFile,
      uploadedBy: uid,
    }).catch(flowError => {
        // Log any errors from the background flow execution
        console.error(`[Analyze API] Background flow execution failed for docId ${docId}:`, flowError);
    });

    // 5. Return Immediate Success Response
    return NextResponse.json({
      message: 'Document analysis has been initiated. The results will appear automatically when ready.',
      documentId: docId,
    });

  } catch (error) {
    console.error('[Analyze API] An unexpected error occurred:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json(
      { error: 'Failed to start the analysis process.', details: errorMessage },
      { status: 500 }
    );
  }
}
