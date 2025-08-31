
/**
 * @fileOverview A flow for harmonizing and structuring uploaded data.
 * This flow's ONLY responsibility is to create a metadata document in the
 * 'documents' subcollection after a file is uploaded to Cloud Storage.
 * The actual analysis is triggered on-demand by the user from the frontend.
 */
'use server';

import { ai, googleAI } from '../genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';

// --- Robust Firebase Admin SDK Initialization ---
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed!', e);
    throw new Error('Firebase Admin SDK could not be initialized.');
  }
}
const db = admin.firestore();

// --- Zod Schemas ---
const HarmonizeDataInputSchema = z.object({
  placeId: z.string().min(1, 'placeId cannot be empty.'),
  capitalCategory: z.enum(['Natural', 'Human', 'Social', 'Manufactured', 'Financial']),
  storagePath: z.string().min(1, 'storagePath cannot be empty.'),
  sourceFile: z.string(),
});
type HarmonizeDataInput = z.infer<typeof HarmonizeDataInputSchema>;

const HarmonizeDataOutputSchema = z.object({
  documentId: z.string(),
  message: z.string(),
});
type HarmonizeDataOutput = z.infer<typeof HarmonizeDataOutputSchema>;

// --- The Main Genkit Flow (Now Simplified) ---
const harmonizeDataFlow = ai.defineFlow(
  {
    name: 'harmonizeDataFlow',
    inputSchema: HarmonizeDataInputSchema,
    outputSchema: HarmonizeDataOutputSchema,
  },
  async (input) => {
    console.log(`[harmonizeDataFlow] Creating document metadata for placeId: ${input.placeId}, file: ${input.sourceFile}`);

    // This flow's only job is to save the reference to the file in Cloud Storage.
    const docRef = await db
      .collection('places')
      .doc(input.placeId)
      // CORRECTED: Use the 'documents' subcollection as per architecture.
      .collection('documents')
      .add({
        initialCapitalCategory: input.capitalCategory,
        sourceFile: input.sourceFile,
        storagePath: input.storagePath,
        status: 'uploaded', // New status field
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    const successMessage = `Successfully created document metadata for '${input.sourceFile}'.`;
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
