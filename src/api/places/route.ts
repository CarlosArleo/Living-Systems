/**
 * @fileOverview API route to securely handle the creation of new 'place' documents.
 * This enforces the security mandate that all writes must go through a validated backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { projectConfig } from '@/ai/config';

// --- Initialization ---
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: projectConfig.projectId,
    });
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed in Places API!', e);
  }
}
const db = admin.firestore();

// --- Zod Schema for Validation ---
const CreatePlaceSchema = z.object({
  name: z.string().min(3, 'Place name must be at least 3 characters.').max(100),
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
    const validation = CreatePlaceSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: validation.error.issues },
        { status: 400 }
      );
    }
    const { name } = validation.data;

    // 3. Create Document with Secure Fields
    const placeData = {
      name,
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('places').add(placeData);
    console.log(`[Places API] Successfully created place "${name}" with ID: ${docRef.id}`);

    // 4. Return Success Response
    return NextResponse.json({
      message: 'Place created successfully.',
      placeId: docRef.id,
      ...placeData
    }, { status: 201 });

  } catch (error) {
    console.error('[Places API] An unexpected error occurred:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json(
      { error: 'Failed to create place.', details: errorMessage },
      { status: 500 }
    );
  }
}
