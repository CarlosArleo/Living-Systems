
/**
 * @fileOverview API route to trigger ON-DEMAND document analysis.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { getAuth } from 'firebase-admin/auth';

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
    const idToken = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await getAuth().verifyIdToken(idToken);

    const json = await req.json();
    const validation = AnalyzeRequestSchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', issues: validation.error.issues }, { status: 400 });
    }

    const { placeId, docId } = validation.data;
    const docRef = db.collection('places').doc(placeId).collection('documents').doc(docId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }
    
    await docRef.update({ status: 'analyzing' });

    const docData = docSnapshot.data();
    const storagePath = docData?.storagePath;
    const initialCategory = docData?.initialCapitalCategory || 'Natural';
    const sourceFile = docData?.sourceFile || 'Unknown file';

    if (!storagePath) {
      await docRef.update({ status: 'failed', error: 'Document is missing a valid storage path.' });
      return NextResponse.json({ error: 'Document is missing a valid storage path.' }, { status: 400 });
    }
    
    const fileRef = storage.bucket().file(storagePath);
    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });
    
    const prompt = `
      You are an expert data extractor for a Regenerative Development project. Your persona is a meticulous librarian crossed with a GIS analyst. Your task is to read the provided document and sort its content into the Five Capitals framework, and to extract any and all geospatial data.

      CRITICAL INSTRUCTIONS:
      1.  You MUST use ONLY the information within the provided DOCUMENT CONTENT to answer. Do not use external knowledge or make assumptions.
      2.  Your primary job is EXTRACTION, not interpretation. You must pull the full, verbatim text for each relevant section.
      3.  If the document does not contain information for a specific capital, state that clearly in the summary and leave the extractedText field empty.
      4.  For GeoJSON, if you find a location (like an address, intersection, or place name) but no exact coordinates, you are NOT to invent coordinates. Instead, create a feature with null geometry and add a "note" property explaining the location description, e.g., { "note": "New Park at Elm and Oak" }.

      DOCUMENT DETAILS:
      - Initial Category Provided by User: "${initialCategory}"
      - Source File Name: "${sourceFile}"
      - Document Content: {{media url='${signedUrl}'}}

      EXTRACTION REQUIREMENTS:
      1.  Read the entire document content.
      2.  Provide a brief, 1-2 sentence overallSummary of the document's main purpose.
      3.  Extract ALL geographic information and format it as a single, valid GeoJSON FeatureCollection in the geoJSON field.
      4.  Perform a detailed analysis for EACH of the five capitals (Natural, Human, Social, Manufactured, Financial):
          a.  extractedText: Find and copy the complete, verbatim text of ALL paragraphs, sentences, or data tables from the document that are relevant to this specific capital. Preserve all original formatting. THIS IS THE MOST IMPORTANT STEP.
          b.  isPresent: Based on the text you extracted, set this boolean flag to true or false.
          c.  summary: AFTER extracting the text, write a 2-3 sentence qualitative summary based ONLY on the content in the 'extractedText' field for this capital.
          d.  keyDataPoints: From the 'extractedText', identify up to 3 of the most important specific, quantitative facts or statements.
      5.  Return a single, valid JSON object that strictly follows the required Zod schema.
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
    
    await docRef.update({
      status: 'analyzed',
      analysisTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      analysis: aiOutput.analysis,
      overallSummary: aiOutput.overallSummary,
      geoJSON: JSON.stringify(aiOutput.geoJSON), // Store GeoJSON as a string
    });

    return NextResponse.json({ message: 'Analysis complete and data stored.', analysis: aiOutput });

  } catch (error) {
    console.error('[Analyze API] An unexpected error occurred:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    
    // Attempt to update doc status to failed, but don't let this block the error response
    try {
      const { placeId, docId } = AnalyzeRequestSchema.parse(JSON.parse(await new Response(req.body).text()));
      const docRef = db.collection('places').doc(placeId).collection('documents').doc(docId);
      await docRef.update({ status: 'failed', error: errorMessage });
    } catch (updateError) {
      console.error('[Analyze API] Failed to update document status to "failed":', updateError);
    }

    return NextResponse.json({ error: 'Analysis failed.', details: errorMessage }, { status: 500 });
  }
}
