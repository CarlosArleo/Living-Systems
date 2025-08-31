/**
 * @fileOverview API route to securely handle feedback submissions.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { projectConfig } from '@/ai/config';

// This initialization should be shared, but for safety, we ensure it runs.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: projectConfig.projectId,
      storageBucket: projectConfig.storageBucket,
    });
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed in API route!', e);
  }
}
const db = admin.firestore();

// Schema to validate the incoming feedback from the client.
const FeedbackApiInputSchema = z.object({
  placeId: z.string().min(1),
  comment: z.string().min(1).max(2000), // Add length validation
  authorName: z.string().min(1),
  authorAvatarUrl: z.string().url().optional().or(z.literal('')),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the request
    const idToken = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
    }
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // 2. Validate the request body
    const json = await req.json();
    const validation = FeedbackApiInputSchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: validation.error.issues },
        { status: 400 }
      );
    }
    
    const { placeId, comment, authorName, authorAvatarUrl } = validation.data;

    // 3. Create the feedback document with server-side data
    const feedbackData = {
      authorId: uid, // Use the verified UID from the token
      authorName,
      authorAvatarUrl,
      comment,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp
      tags: [], // Placeholder for future tagging functionality
      targetElement: 'storyOfPlace', // Default target
    };
    
    // 4. Save to the correct subcollection in Firestore
    const feedbackRef = await db
      .collection('places')
      .doc(placeId)
      .collection('feedback')
      .add(feedbackData);

    console.log(`[Feedback API] Successfully created feedback document: ${feedbackRef.id}`);

    return NextResponse.json({
      message: 'Feedback submitted successfully.',
      feedbackId: feedbackRef.id,
    });

  } catch (error) {
    console.error('[Feedback API] An unexpected error occurred:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json(
      { error: 'Failed to submit feedback.', details: errorMessage },
      { status: 500 }
    );
  }
}
