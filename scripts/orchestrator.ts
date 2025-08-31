// scripts/orchestrator.ts

import { configure } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { retrieveRelevantContext } from '../src/ai/knowledge-base';
import { generateCode } from '../src/ai/flows/generateCode';
import { critiqueCode } from '../src/ai/flows/critiqueCode';
import * as fs from 'fs/promises';
import * as path from 'path';

// Configure Genkit for this script's execution context
configure({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

/**
 * Parses the verdict from the critique agent's markdown report.
 * @param report The markdown report string.
 * @returns 'PASS' or 'FAIL'.
 */
function parseVerdict(report: string): 'PASS' | 'FAIL' {
    const match = report.match(/\*\*Verdict:\*\*\s*(PASS|FAIL)/);
    if (match && match[1]) {
        return match[1] as 'PASS' | 'FAIL';
    }
    console.warn("[Orchestrator] Could not parse verdict from critique report. Defaulting to FAIL.");
    return 'FAIL';
}


/**
 * The main function for the Orchestrator Agent.
 * Automates the Generate -> Critique -> Correct loop.
 */
async function runDevelopmentCycle(taskDescription: string, outputFilePath: string) {
  console.log(`[Orchestrator] Starting development cycle for: "${taskDescription}"`);

  let currentCode: string | undefined;
  let finalCode: string | undefined;
  let critique: string | undefined;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n[Orchestrator] Attempt #${attempt}`);

    // 1. Retrieve relevant context
    console.log('[Orchestrator] Retrieving relevant context from knowledge base...');
    const relevantContext = await retrieveRelevantContext(taskDescription);
    console.log('[Orchestrator] Context retrieved successfully.');

    // 2. Generate or Correct Code
    console.log(currentCode ? '[Orchestrator] Calling Generator Agent for correction...' : '[Orchestrator] Calling Generator Agent for initial generation...');
    
    const generatorInput = currentCode && critique 
      ? { taskDescription, context: relevantContext, failedCode: currentCode, critique } 
      : { taskDescription, context: relevantContext };
      
    currentCode = await generateCode(generatorInput);

    if (!currentCode) {
      console.error('[Orchestrator] Generator Agent failed to produce code.');
      continue; // Try again
    }
    console.log('[Orchestrator] Code generated. Submitting for critique...');

    // 3. Critique Code
    const fullConstitution = await fs.readFile(path.join(process.cwd(), 'CONTEXT.md'), 'utf-8');
    const critiqueReport = await critiqueCode({ codeToCritique: currentCode, projectConstitution: fullConstitution });
    critique = critiqueReport; // Store critique for next loop

    if (!critiqueReport) {
        console.error('[Orchestrator] Critique Agent failed to produce a report.');
        continue; // Try again
    }

    const verdict = parseVerdict(critiqueReport);
    console.log(`[Orchestrator] Critique Verdict: ${verdict}`);

    // 4. Decision
    if (verdict === 'PASS') {
      console.log('[Orchestrator] ✅ Code has passed the audit!');
      finalCode = currentCode;
      break; // Exit the loop
    } else {
      console.log('[Orchestrator] ❌ Code failed audit. Preparing for correction loop...');
      console.log('Issues Found:\n', critiqueReport);
    }
  }

  if (finalCode) {
    console.log(`\n[Orchestrator] Writing final code to ${outputFilePath}`);
    await fs.writeFile(outputFilePath, finalCode);
    console.log('[Orchestrator] ✅ Development cycle complete.');
  } else {
    console.error(`\n[Orchestrator] ❌ Failed to produce passing code after ${maxAttempts} attempts.`);
    process.exit(1);
  }
}

// Example of how to run it from the command line
const task = process.argv[2];
const outputFile = process.argv[3];
if (!task || !outputFile) {
  console.error('Usage: npx tsx scripts/orchestrator.ts "<task_description>" <output_file_path>');
  process.exit(1);
}

runDevelopmentCycle(task, outputFile).catch(console.error);
