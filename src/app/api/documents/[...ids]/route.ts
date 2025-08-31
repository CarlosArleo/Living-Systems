
/**
 * @fileOverview API route to handle deleting a source document and its associated analyses.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { projectConfig } from '@/ai/config';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      storageBucket: projectConfig.storageBucket,
    });
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed in API route!', e);
  }
}
const db = admin.firestore();
const storage = getStorage();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { ids: string[] } }
) {
  try {
    const idToken = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
    }
    await getAuth().verifyIdToken(idToken);
    
    const [placeId, docId] = params.ids;

    if (!placeId || !docId) {
      return NextResponse.json({ error: 'Invalid request: Missing placeId or docId.' }, { status: 400 });
    }

    const docRef = db.collection('places').doc(placeId).collection('documents').doc(docId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnapshot.data();
    
    // Start a Firestore batch for atomic deletion
    const batch = db.batch();

    // 1. Delete the document metadata from the 'documents' collection
    batch.delete(docRef);
    console.log(`[Delete API] Staged deletion for document metadata: ${docRef.path}`);

    // 2. Delete the associated file from Cloud Storage if it exists
    if (docData?.storagePath) {
        const bucket = storage.bucket(projectConfig.storageBucket);
        const fileRef = bucket.file(docData.storagePath);
        await fileRef.delete().catch(err => console.error(`Failed to delete file from storage, but continuing: ${err.message}`));
        console.log(`[Delete API] Deleted file from Storage: ${docData.storagePath}`);
    }

    // 3. Delete any analysis documents linked to this source document
    const capitalCollections = ['natural', 'human', 'social', 'manufactured', 'financial'];
    for (const collectionName of capitalCollections) {
        const analysisQuery = db.collection('places').doc(placeId).collection(collectionName).where('sourceDocumentId', '==', docId);
        const analysisSnapshot = await analysisQuery.get();
        if (!analysisSnapshot.empty) {
            analysisSnapshot.docs.forEach(doc => {
                console.log(`[Delete API] Staged deletion for analysis doc: ${doc.ref.path}`);
                batch.delete(doc.ref);
            });
        }
    }
    
    // Commit all batched deletions
    await batch.commit();

    console.log(`[Delete API] Successfully completed deletion process for document: ${docId}`);

    return NextResponse.json({ message: 'Document and all associated analyses deleted successfully.' });

  } catch (error) {
    console.error('[Delete API] An unexpected error occurred:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json(
      { error: 'Failed to delete the document.', details: errorMessage },
      { status: 500 }
    );
  }
}
