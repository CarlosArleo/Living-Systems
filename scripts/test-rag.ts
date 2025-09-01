/**
 * @fileOverview A simple test script to validate the RAG knowledge base retriever.
 * This script ensures that the `retrieveRelevantContext` function can successfully
 * query the vector store and return relevant chunks of the CONTEXT.md file.
 * To run: `npx tsx scripts/test-rag.ts`
 */
import { retrieveRelevantContext } from '../src/ai/knowledge-base';

/**
 * The main test function.
 */
async function runRagTest() {
  console.log('--- RAG Knowledge Base Test ---');

  // This query is specifically designed to test if the retriever can find
  // the sections on Firestore security rules and data modeling.
  const testQuery = "Create a secure Firestore rule for the users collection that only allows a user to update their own displayName.";

  console.log(`[i] Querying with: "${testQuery}"\n`);

  try {
    // Retrieve the top 3 most relevant chunks for this query.
    const relevantChunks = await retrieveRelevantContext(testQuery, 3);

    if (relevantChunks.length === 0) {
      console.warn('⚠️  Test Result: No relevant context chunks were found. The knowledge base might be empty or the query might not be matching.');
      console.warn('   Ensure you have run `npm run build:context` first.');
      return;
    }

    console.log('✅ Test Result: Successfully retrieved the following context chunks:\n');

    relevantChunks.forEach((chunk, index) => {
      console.log(`--- CHUNK ${index + 1} ---`);
      console.log(chunk.trim());
      console.log('-----------------\n');
    });

  } catch (error) {
    console.error('❌ An error occurred during the RAG test:', error);
    process.exit(1);
  }
}

// Execute the test.
runRagTest();
