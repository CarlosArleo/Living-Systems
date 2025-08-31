/**
 * @fileOverview The main orchestrator script for the autonomous development cycle.
 */
'use server';

import { generateCode } from '../src/ai/flows/generateCode';
import { critiqueCode } from '../src/ai/flows/critiqueCode';
import { retrieveRelevantContext } from '../src/ai/knowledge-base';
import * as fs from 'fs/promises';
import * as path from 'path';


/**
 * The main function for the Orchestrator Agent.
 */
async function runDevelopmentCycle(taskDescription: string, outputFilePath: string) {
  console.log(`[Orchestrator] Starting development cycle for: "${taskDescription}"`);

  let currentCode: string | undefined;
  let auditReport: string | undefined;
  let verdict: 'PASS' | 'FAIL' = 'FAIL';

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`\n[Orchestrator] Attempt #${attempt}`);

    // Step 1: Generate or Correct Code
    const relevantContextChunks = await retrieveRelevantContext(taskDescription);
    const relevantContext = relevantContextChunks.join('\n---\n');
    console.log(`[Orchestrator] Retrieved ${relevantContextChunks.length} context chunks.`);
    
    console.log('[Orchestrator] Calling Generator Agent...');
    currentCode = await generateCode({
        taskDescription,
        context: relevantContext,
        // On subsequent attempts, pass the failed code and critique
        ...(currentCode && auditReport && { failedCode: currentCode, auditReport: auditReport }),
    });

    if (!currentCode) {
        console.error('[Orchestrator] Generator Agent failed to produce code.');
        continue; // Try again
    }
    console.log('[Orchestrator] Code generated. Submitting for critique...');

    // Step 2: Critique the generated code
    const projectConstitution = await fs.readFile(path.join(process.cwd(), 'CONTEXT.md'), 'utf-8');
    
    // CORRECTED: Call critiqueCode with the right parameters and handle the object response.
    const critiqueResult = await critiqueCode({
      code: currentCode,
      context: projectConstitution,
    });

    verdict = critiqueResult.verdict as 'PASS' | 'FAIL';
    auditReport = critiqueResult.issuesFound;
    
    console.log(`[Orchestrator] Critique Verdict: ${verdict}`);
    
    if (verdict === 'PASS') {
        console.log('[Orchestrator] ✅ Code has passed the audit!');
        break; // Exit the loop on success
    } else {
        console.log('[Orchestrator] ❌ Code failed audit. Preparing for next correction loop...');
        console.log('Issues Found:\n', auditReport);
    }
  }

  if (verdict === 'PASS' && currentCode) {
    console.log(`\n[Orchestrator] Writing final code to ${outputFilePath}`);
    await fs.writeFile(outputFilePath, currentCode);
    console.log('[Orchestrator] ✅ Development cycle complete.');
  } else {
    console.error(`\n[Orchestrator] ❌ Failed to produce passing code after 3 attempts.`);
    process.exit(1);
  }
}

// This allows the script to be run from the command line.
const task = process.argv[2];
const outputFile = process.argv[3];
if (!task || !outputFile) {
  console.error('Usage: npx tsx scripts/orchestrator.ts "<task_description>" <output_file_path>');
  process.exit(1);
}

runDevelopmentCycle(task, outputFile);
