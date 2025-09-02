/**
 * @fileoverview A unified Genkit flow to handle the entire document processing pipeline,
 * from metadata creation to AI analysis. This flow is designed to be triggered by
 * the onObjectFinalized Cloud Function.
 */
'use server';

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getFirestore } from 'firebase-admin/firestore';
import { projectConfig } from '../config'; // Import the validated config

// --- Initialization ---
if (!admin.apps.length) {
  try {
    // Use the validated config for initialization
    admin.initializeApp({
        storageBucket: projectConfig.storageBucket,
    });
  } catch (e) {
    console.error('Unified Flow: Firebase Admin SDK initialization failed!', e);
  }
}
const db = getFirestore();
const storage = getStorage();

// --- Hardened Zod Schemas ---
const FlowInputSchema = z.object({
  placeId: z.string().min(1, { message: "placeId cannot be empty." }),
  documentId: z.string().min(1, { message: "documentId cannot be empty." }),
  storagePath: z.string().min(1, { message: "storagePath cannot be empty." }),
  fileName: z.string(),
  uploadedBy: z.string().min(1, { message: "uploadedBy UID cannot be empty." }),
});
type FlowInput = z.infer<typeof FlowInputSchema>;

const CapitalExtractionSchema = z.object({
  isPresent: z.boolean().describe("Set to true if data for this capital is in the document."),
  summary: z.string().describe("A 2-3 sentence qualitative summary for this capital."),
  keyDataPoints: z.array(z.string()).describe("Up to 3 key quantitative or qualitative data points."),
  extractedText: z.string().describe("Verbatim text extracted for this capital."),
});

const AIOutputSchema = z.object({
  overallSummary: z.string().describe("A 1-2 sentence summary of the document's purpose."),
  geoJSON: z.any().describe("A valid GeoJSON FeatureCollection object."),
  analysis: z.object({
    naturalCapital: CapitalExtractionSchema,
    humanCapital: CapitalExtractionSchema,
    socialCapital: CapitalExtractionSchema,
    manufacturedCapital: CapitalExtractionSchema,
    financialCapital: CapitalExtractionSchema,
  }),
});

// --- Helper Functions ---
async function loadPromptTemplate(): Promise<string> {
  const promptPath = path.join(process.cwd(), 'docs', 'Prompts', 'AI Prompt Engineering Framework for the RDI Platform (The Implementation).md');
  try {
      const frameworkContent = await fs.readFile(promptPath, 'utf-8');
      const match = frameworkContent.match(/# MASTER PROMPT: DOCUMENT ANALYSIS & FIVE CAPITALS HARMONIZATION([\s\S]*?)---DOCUMENT START---/);
      if (match && match[1]) {
        return match[1].trim();
      }
      throw new Error("Could not find the Master Prompt in the framework document.");
  } catch (e) {
      console.warn(`Could not load prompt from ${promptPath}. Using default. Error: ${e}`)
      return `
          You are an expert data extractor for a Regenerative Development project. Your task is to read the provided document and structure its content into the Five Capitals framework, and to extract any and all geospatial data.
          
          DOCUMENT DETAILS:
          - Source File Name: "{{sourceFile}}"
          - Document Content: {{media url='{{fileUrl}}'}}

          Return a single, valid JSON object that strictly follows the Zod schema provided by the system.
      `;
  }
}

// --- The Unified Flow ---
export const processUploadedDocument = ai.defineFlow(
  {
    name: 'processUploadedDocument',
    inputSchema: FlowInputSchema,
    outputSchema: z.object({
      documentId: z.string(),
      status: z.string(),
      message: z.string(),
    }),
  },
  async (input: FlowInput) => {
    const { placeId, documentId, storagePath, fileName, uploadedBy } = input;
    
    const docRef = db.collection('places').doc(placeId).collection('documents').doc(documentId);

    try {
      // Step 1: Create Metadata
      console.log(`[processUploadedDocument] Creating metadata for doc: ${documentId}`);
      await docRef.set({
        sourceFile: fileName,
        storagePath: storagePath,
        uploadedBy: uploadedBy,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'processing',
      });

      // Step 2: Perform Analysis
      console.log(`[processUploadedDocument] Starting analysis for doc: ${documentId}`);
      
      const bucket = storage.bucket(projectConfig.storageBucket);
      const fileRef = bucket.file(storagePath);
      
      const [signedUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000,
      });

      if (!signedUrl) {
        throw new Error(`Could not generate signed URL for ${storagePath}`);
      }

      const promptTemplate = await loadPromptTemplate();
      // Replace placeholders in the prompt template
      const prompt = promptTemplate
        .replace('{{sourceFile}}', fileName)
        .replace('{{fileUrl}}', signedUrl);

      const result = await ai.generate({
          model: googleAI.model('gemini-1.5-pro'),
          prompt,
          output: { format: 'json', schema: AIOutputSchema }
      });
      
      const aiOutput = result.output;
      if (!aiOutput) {
        throw new Error("AI model returned an empty or invalid output.");
      }

      // Step 3: Update Document with Analysis
      console.log(`[processUploadedDocument] Storing analysis results for doc: ${documentId}`);
      await docRef.update({
        status: 'analyzed',
        analysisTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        analysis: aiOutput.analysis,
        overallSummary: aiOutput.overallSummary,
        geoJSON: JSON.stringify(aiOutput.geoJSON), // Store GeoJSON as a string
      });

      return { documentId, status: 'success', message: 'Document processed and analyzed successfully.' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during processing.';
      console.error(`[processUploadedDocument] Failed to process doc: ${documentId}. Error: ${errorMessage}`);
      // Use .set with merge:true to create the doc if it failed before creation
      await docRef.set({ status: 'failed', error: errorMessage }, { merge: true });
      // Re-throw the error to ensure the calling function knows about the failure.
      throw error;
    }
  }
);
