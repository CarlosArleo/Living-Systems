
/**
 * @fileOverview The "Librarian" flow for the RDI Platform.
 * This flow is designed to be called by the client immediately after a file
 * upload to Cloud Storage is complete. Its ONLY responsibility is to create
 * the initial metadata document in Firestore with a status of 'uploaded'.
 * This provides immediate feedback to the user while the heavier analysis
 * happens in the background.
 */
'use server';

import { ai } from '../genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';

// --- Robust Firebase Admin SDK Initialization ---
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed!', e);
    throw new Error('Firebase Admin SDK could not be initialized.');
  }
}
const db = admin.firestore();

// --- Zod Schemas ---
const HarmonizeDataInputSchema = z.object({
  placeId: z.string().min(1, 'placeId cannot be empty.'),
  initialCapitalCategory: z.string(), // Changed from capitalCategory for clarity
  storagePath: z.string().min(1, 'storagePath cannot be empty.'),
  sourceFile: z.string(),
  uploadedBy: z.string().min(1, 'uploadedBy UID cannot be empty.'),
});
type HarmonizeDataInput = z.infer<typeof HarmonizeDataInputSchema>;

const HarmonizeDataOutputSchema = z.object({
  documentId: z.string(),
  message: z.string(),
});
type HarmonizeDataOutput = z.infer<typeof HarmonizeDataOutputSchema>;

/**
 * Creates the initial metadata document in Firestore for a newly uploaded file.
 */
const harmonizeDataFlow = ai.defineFlow(
  {
    name: 'harmonizeDataFlow',
    inputSchema: HarmonizeDataInputSchema,
    outputSchema: HarmonizeDataOutputSchema,
  },
  async ({ placeId, initialCapitalCategory, storagePath, sourceFile, uploadedBy }) => {
    console.log(`[harmonizeDataFlow] Creating document metadata for placeId: ${placeId}, file: ${sourceFile}`);

    const docRef = await db
      .collection('places')
      .doc(placeId)
      .collection('documents')
      .add({
        initialCapitalCategory: initialCapitalCategory,
        sourceFile: sourceFile,
        storagePath: storagePath,
        status: 'uploaded', // The critical initial status
        uploadedBy: uploadedBy,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    const successMessage = `Successfully created document metadata for '${sourceFile}'.`;
    console.log(`[harmonizeDataFlow] ${successMessage} Doc ID: ${docRef.id}`);

    return {
      documentId: docRef.id,
      message: successMessage,
    };
  }
);

// --- Exported Server Action ---
export async function harmonizeDataOnUpload(input: HarmonizeDataInput): Promise<HarmonizeDataOutput> {
  return harmonizeDataFlow(input);
}
