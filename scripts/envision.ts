/**
 * @fileOverview The Architectural Potential Agent ("Envision Agent").
 * This script allows an architect to ask strategic questions of the codebase.
 */
import { run } from '@genkit-ai/core';
import { getCodebaseContext } from '../src/ai/vision/code-retriever';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * The main function for the Envision Agent.
 */
async function envision(question: string) {
  console.log(`[Envision Agent] Received strategic question: "${question}"`);

  try {
    // Step 1: Intelligently retrieve only relevant codebase context.
    console.log('[Envision Agent] Retrieving relevant code context...');
    const codebaseContext = await getCodebaseContext(question);

    if (!codebaseContext || codebaseContext.trim() === '') {
      console.error('❌ [Envision Agent] Failed to retrieve any relevant code context. Aborting.');
      return;
    }

    // Step 2: Call the Genkit flow with the question and the relevant context.
    console.log('[Envision Agent] Calling the envisionNewFeature flow...');
    const proposal = await run('envisionNewFeature', () => Promise.resolve({ question, codebaseContext }));

    // Step 3: Save and display the proposal.
    const outputPath = path.join(process.cwd(), 'docs', `PROPOSAL-${Date.now()}.md`);
    await fs.writeFile(outputPath, String((await proposal as any).finalCode));

    console.log(`\n✅ [Envision Agent] Success! Architectural proposal generated.`);
    console.log(`   View the proposal at: ${outputPath}`);

  } catch (error) {
    console.error('❌ [Envision Agent] A critical error occurred:', error);
    process.exit(1);
  }
}

// --- Script Execution ---
const question = process.argv[2];
if (!question) {
  console.error('Usage: npx tsx scripts/envision.ts "<your_strategic_question>"');
  process.exit(1);
}

envision(question);
