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
 * A helper function to parse the verdict from the critique report.
 * @param report The Markdown report from the critique agent.
 * @returns 'PASS' or 'FAIL'.
 */
function parseVerdict(report: string): 'PASS' | 'FAIL' {
    const match = report.match(/\*\*3\. Verdict:\*\*\s*(PASS|FAIL)/i);
    if (match && match[1]) {
        return match[1].toUpperCase() as 'PASS' | 'FAIL';
    }
    console.warn("[Orchestrator] Could not parse verdict from critique report. Defaulting to FAIL.");
    return 'FAIL';
}


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

    if (verdict === 'FAIL') {
        const relevantContext = await retrieveRelevantContext(taskDescription);
        console.log(`[Orchestrator] Retrieved ${relevantContext.length} context chunks.`);

        console.log('[Orchestrator] Calling Generator Agent...');
        currentCode = await generateCode({
            taskDescription,
            context: relevantContext,
            // On subsequent attempts, pass the failed code and critique
            ...(currentCode && auditReport && { failedCode: currentCode, critique: auditReport }),
        });

        if (!currentCode) {
            console.error('[Orchestrator] Generator Agent failed to produce code.');
            continue; // Try again
        }
        console.log('[Orchestrator] Code generated. Submitting for critique...');
    }

    const projectConstitution = await fs.readFile(path.join(process.cwd(), 'CONTEXT.md'), 'utf-8');
    auditReport = await critiqueCode({
        codeToCritique: currentCode!,
        projectConstitution: projectConstitution,
    });

    verdict = parseVerdict(auditReport);
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
