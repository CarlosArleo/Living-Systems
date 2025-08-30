
/**
 * @fileOverview API route to trigger the "Story of Place" generation flow.
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateStoryOfPlace } from '@/ai/flows/story-flow';
import { StoryInputSchema } from '@/ai/flows/story-schemas';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed in API route!', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const idToken = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
    }
    // This verifies the user is logged in, which is critical.
    await getAuth().verifyIdToken(idToken);

    const json = await req.json();
    const validation = StoryInputSchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const result = await generateStoryOfPlace(validation.data);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Story API] An unexpected error occurred:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json(
      { error: 'Failed to generate the Story of Place.', details: errorMessage },
      { status: 500 }
    );
  }
}
