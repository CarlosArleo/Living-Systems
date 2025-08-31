
/**
 * @fileoverview A script to run all major Genkit flows with test data.
 * This provides a simple way to validate that all flows are functioning correctly.
 * To run: `npx tsx src/ai/flows/run-all-tests.ts`
 */
'use server';

import { generateCode } from './generateCode';
import { critiqueCode } from './critiqueCode';
import { generateStoryOfPlace } from './story-flow';
import { indexerFlow } from './knowledge';
import { queryRdiKnowledgeBase } from './rag-flow';
import * as admin from 'firebase-admin';
import * as fs from 'fs/promises';
import * as path from 'path';

// --- Initialization ---
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('Test Runner: Firebase Admin SDK initialization failed!', e);
  }
}
const db = admin.firestore();

// A simple logger to make output clear
const log = (title: string, data: any) => {
  console.log(`\n--- 🧪 Testing: ${title} ---`);
  // console.log('Input:');
  // console.log(JSON.stringify(data.input, null, 2));
  console.log('\nOutput:');
  console.log(JSON.stringify(data.output, null, 2));
  console.log(`--- ✅ End Test: ${title} ---`);
};

const logError = (title: string, error: any) => {
    console.log(`\n--- 🧪 Testing: ${title} ---`);
    console.error(`--- ❌ FAILED: ${title} ---`);
    console.error(error);
    console.log(`--- End Test: ${title} ---`);
};


async function runTests() {
  console.log('🚀 Starting RDI Platform Flow Validation Script...');

  const placeId = `test-place-${Date.now()}`;
  const docId = `test-doc-${Date.now()}`;
  const userId = 'test-user-id';
  const projectConstitution = await fs.readFile(path.join(process.cwd(), 'CONTEXT.md'), 'utf-8');


  // Test 1: critiqueCode (with valid input to test logic)
  try {
    const critiqueInput = { 
        codeToCritique: 'function add(a, b) { return a + b; }', 
        projectConstitution: 'All functions must have TypeScript types.' 
    };
    const critiqueOutput = await critiqueCode(critiqueInput);
    log('Critique Code', { input: critiqueInput, output: critiqueOutput });
  } catch (e) {
    logError('Critique Code', e);
  }

  // Test 2: generateCode (initial generation)
  try {
      const genCodeInput = {
          taskDescription: "A simple function to add two numbers.",
          context: ["All functions must use TypeScript and have JSDoc comments."],
      };
      const genCodeOutput = await generateCode(genCodeInput);
      log('Generate Code (Initial)', { input: genCodeInput, output: genCodeOutput });
  } catch (e) {
      logError('Generate Code (Initial)', e);
  }


  // To test the next flows, we'll manually add some analyzed data.
  console.log(`\nSetting up mock data for story and RAG tests in place: ${placeId}...`);
  const mockAnalysisData = {
      status: 'analyzed',
      overallSummary: 'Mock summary of a document about declining biodiversity in Willow Creek.',
      analysis: {
          naturalCapital: { isPresent: true, summary: 'The creek has high levels of pollutants.', keyDataPoints: ['15% biodiversity decline'], extractedText: 'The full text about pollutants.'},
          socialCapital: { isPresent: true, summary: 'Community trust is low.', keyDataPoints: [], extractedText: 'Full text about trust.'}
      },
      sourceFile: 'mock_report.pdf',
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection('places').doc(placeId).collection('documents').doc(docId).set(mockAnalysisData);
  await db.collection('places').doc(placeId).set({ name: 'Test Place for Integration Suite' });
  console.log('Mock data created.');


  // Test 3: generateStoryOfPlace
  try {
    const storyInput = { placeId };
    const storyOutput = await generateStoryOfPlace(storyInput);
    log('Generate Story of Place', { input: storyInput, output: storyOutput });
  } catch(e) {
    logError('Generate Story of Place', e);
  }

  // Test 4: indexerFlow
  try {
    const indexerInput = { placeId, texts: ['The water quality is poor.', 'Biodiversity is declining rapidly.'] };
    const indexerOutput = await indexerFlow(indexerInput);
    log('Indexer Flow', { input: indexerInput, output: indexerOutput });
  } catch(e) {
    logError('Indexer Flow', e);
  }

  // Test 5: ragQueryFlow
  try {
    const ragInput = { placeId, query: 'What is the state of the water?' };
    const ragOutput = await queryRdiKnowledgeBase(ragInput);
    log('RAG Inquiry', { input: ragInput, output: ragOutput });
  } catch(e) {
    logError('RAG Inquiry', e);
  }
  
  console.log('\n\n✅ All tests complete.');
}

runTests();
