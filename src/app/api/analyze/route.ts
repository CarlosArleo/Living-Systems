
/**
 * @fileOverview API route to trigger ON-DEMAND document analysis.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { ai, googleAI } from '@/ai/genkit';

// --- Initialization ---
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (e) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed!', e);
  }
}
const db = admin.firestore();
const storage = getStorage();

// --- Zod Schemas ---
const AnalyzeRequestSchema = z.object({
  placeId: z.string(),
  docId: z.string(),
});

const CapitalExtractionSchema = z.object({
  isPresent: z.boolean().describe("Set to true if data related to this capital is present in the document, otherwise false."),
  summary: z.string().describe("A 2-3 sentence qualitative summary of the information available for this capital. If not present, state that the document does not contain this information."),
  keyDataPoints: z.array(z.string()).describe("A bulleted list of up to 3 key quantitative or qualitative data points for this capital. If none, return an empty array."),
  extractedText: z.string().describe("The complete, verbatim text of ALL paragraphs and sections from the document that are relevant to this specific capital. Preserve markdown formatting. If no text is relevant, this should be an empty string."),
});

const AIOutputSchema = z.object({
  overallSummary: z.string().describe("A brief, 1-2 sentence overall summary of the document's main purpose."),
  geoJSON: z.any().describe("A valid GeoJSON FeatureCollection object. If no geographic data, return an empty FeatureCollection."),
  analysis: z.object({
    naturalCapital: CapitalExtractionSchema,
    humanCapital: CapitalExtractionSchema,
    socialCapital: CapitalExtractionSchema,
    manufacturedCapital: CapitalExtractionSchema,
    financialCapital: CapitalExtractionSchema,
  }).describe("A detailed breakdown of the analysis for each of the Five Capitals."),
});

// --- Main API Handler ---
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const validation = AnalyzeRequestSchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', issues: validation.error.issues }, { status: 400 });
    }

    const { placeId, docId } = validation.data;
    // CORRECTED: Fetch from the 'documents' subcollection
    const docRef = db.collection('places').doc(placeId).collection('documents').doc(docId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }
    
    await docRef.update({ status: 'analyzing' });

    const docData = docSnapshot.data();
    const storagePath = docData?.storagePath;
    const initialCategory = docData?.initialCapitalCategory || 'Natural'; // Fallback category

    if (!storagePath) {
      await docRef.update({ status: 'failed', error: 'Document is missing a valid storage path.' });
      return NextResponse.json({ error: 'Document is missing a valid storage path.' }, { status: 400 });
    }
    
    const fileRef = storage.bucket().file(storagePath);
    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });

    const dataContent = `{{media url='${signedUrl}'}}`;
    
    const prompt = `
      You are an AI assistant functioning as a Meticulous Librarian and GIS Analyst...
      [Your full Master Prompt for Analysis goes here, same as before]
      DOCUMENT CONTENT:
      ---
      ${dataContent}
      ---
    `;

    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-pro'),
        prompt,
        output: { format: 'json', schema: AIOutputSchema }
    });

    const aiOutput = result.output;
    if (!aiOutput) {
      await docRef.update({ status: 'failed', error: 'The AI model returned an empty or invalid output.' });
      throw new Error("The AI model returned an empty or invalid output.");
    }
    
    // CORRECTED: Write analysis to the correct capital subcollection
    const capitalCategoryLower = initialCategory.toLowerCase();
    const analysisCollectionRef = db.collection('places').doc(placeId).collection(capitalCategoryLower);
    
    await analysisCollectionRef.add({
      sourceDocumentId: docId,
      sourceFile: docData?.sourceFile,
      analysis: aiOutput.analysis,
      overallSummary: aiOutput.overallSummary,
      geoJSON: JSON.stringify(aiOutput.geoJSON),
      analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await docRef.update({
      status: 'analyzed',
      analysisTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: 'Analysis complete and data stored.' });

  } catch (error) {
    console.error('[Analyze API] An unexpected error occurred:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    // Here you would also update the document status to 'failed' in a real scenario
    return NextResponse.json({ error: 'Analysis failed.', details: errorMessage }, { status: 500 });
  }
}
