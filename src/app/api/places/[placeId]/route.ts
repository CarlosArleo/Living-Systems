
/**
 * @fileOverview API route to fetch a holistic, aggregated summary for a specific place.
 * This route enforces the "Enforce Wholeness" directive by querying multiple capital collections.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// --- Robust Firebase Admin SDK Initialization ---
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized successfully for place summary route.');
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed!', e);
  }
}
const db = admin.firestore();

/**
 * Handles GET requests to fetch aggregated data for a specific place.
 * @param request The incoming Next.js request object.
 * @param params Contains the dynamic route parameter `placeId`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { placeId: string } }
) {
  try {
    // 1. Authentication: Validate the user's Firebase Auth session.
    const idToken = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
    }
    await getAuth().verifyIdToken(idToken);

    const { placeId } = params;
    if (!placeId) {
      return NextResponse.json({ error: 'Invalid request: Missing placeId.' }, { status: 400 });
    }

    console.log(`[Place Summary API] Fetching holistic data for placeId: ${placeId}`);

    // 2. Wholeness Directive: Perform queries to multiple collections.
    const placeDocRef = db.collection('places').doc(placeId);
    
    // Query 1: The root 'places' document.
    const placeDocPromise = placeDocRef.get();
    
    // Query 2: The most recent 'natural' capital analysis document.
    const naturalCapitalQuery = placeDocRef.collection('natural')
      .orderBy('analyzedAt', 'desc')
      .limit(1)
      .get();
      
    // Query 3: The most recent 'social' capital analysis document.
    const socialCapitalQuery = placeDocRef.collection('social')
      .orderBy('analyzedAt', 'desc')
      .limit(1)
      .get();

    // Execute all queries in parallel for efficiency.
    const [placeDoc, naturalSnapshot, socialSnapshot] = await Promise.all([
      placeDocPromise,
      naturalCapitalQuery,
      socialCapitalQuery
    ]);

    if (!placeDoc.exists) {
      return NextResponse.json({ error: 'Place not found.' }, { status: 404 });
    }

    // 3. Aggregate the data.
    const aggregatedData = {
      placeInfo: placeDoc.data(),
      latestNaturalCapital: naturalSnapshot.empty ? null : naturalSnapshot.docs[0].data(),
      latestSocialCapital: socialSnapshot.empty ? null : socialSnapshot.docs[0].data(),
    };

    return NextResponse.json(aggregatedData);

  } catch (error) {
    // 4. Robust Error Handling.
    console.error('[Place Summary API] An unexpected error occurred:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json(
      { error: 'Failed to fetch place summary.', details: errorMessage },
      { status: 500 }
    );
  }
}
