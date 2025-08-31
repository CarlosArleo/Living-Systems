/**
 * @fileoverview A script to run all major Genkit flows with test data.
 * This provides a simple way to validate that all flows are functioning correctly.
 * To run: `npx tsx src/ai/flows/run-all-tests.ts`
 */
'use server';

import { harmonizeDataOnUpload } from './harmonize';
import { integralAssessmentFlow } from './integralAssessment';
import { generateStoryOfPlace } from './story-flow';
import { indexerFlow } from './knowledge';
import { queryRdiKnowledgeBase } from './rag-flow';
import { critiqueCode } from './critiqueCode';
import * as admin from 'firebase-admin';

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
  console.log('Input:');
  console.log(JSON.stringify(data.input, null, 2));
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

  // Test 1: critiqueCode (with empty input to test guard clause)
  try {
    const critiqueInput = { codeToCritique: '', projectConstitution: '...' };
    const critiqueOutput = await critiqueCode(critiqueInput);
    log('Critique Code (Empty)', { input: critiqueInput, output: critiqueOutput });
  } catch (e) {
    logError('Critique Code (Empty)', e);
  }

  // Test 2: harmonizeDataOnUpload (creates the placeholder document)
  try {
    const harmonizeInput = {
      placeId,
      initialCapitalCategory: 'Natural',
      storagePath: `uploads/${userId}/${placeId}/test-file.txt`,
      sourceFile: 'test-file.txt',
      uploadedBy: userId,
    };
    const harmonizeOutput = await harmonizeDataOnUpload(harmonizeInput);
    log('Harmonize Document (Metadata Creation)', { input: harmonizeInput, output: harmonizeOutput });
  } catch (e) {
    logError('Harmonize Document (Metadata Creation)', e);
  }
  
  // Note: Testing `integralAssessmentFlow` is complex in a script because it
  // relies on a file actually existing in Cloud Storage and a Cloud Function trigger.
  // We will skip its automated test here as manual testing via the UI is more practical for it.
  console.log(`\n--- ⏭️ SKIPPING: Integral Assessment Flow ---`);
  console.log('Reason: This flow requires a file in Cloud Storage and is best tested via the app UI or a dedicated integration test.');


  // To test the next flows, we'll manually add some analyzed data.
  console.log(`\nSetting up mock data for story and RAG tests in place: ${placeId}...`);
  const mockAnalysisData = {
      status: 'analyzed',
      overallSummary: 'Mock summary of a document about declining biodiversity in Willow Creek.',
      analysis: {
          naturalCapital: { isPresent: true, summary: 'The creek has high levels of pollutants.', keyDataPoints: ['15% biodiversity decline'], extractedText: 'The full text about pollutants.'},
          socialCapital: { isPresent: true, summary: 'Community trust is low.', keyDataPoints: [], extractedText: 'Full text about trust.'}
      }
  };
  await db.collection('places').doc(placeId).collection('documents').doc(docId).set(mockAnalysisData);
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
