
/**
 * @fileOverview The main orchestrator script for the autonomous development cycle.
 * This script can either:
 * 1. Generate new code from a task description.
 * 2. Audit and correct an existing file.
 */
import 'dotenv/config'; // CRITICAL: Load environment variables at the very start.
'use server';

import { generateCode } from '../src/ai/flows/generateCode';
import { critiqueCode } from '../src/ai/flows/critiqueCode';
import { retrieveRelevantContext } from '../src/ai/knowledge-base';
import * as fs from 'fs/promises';
import * as path from 'path';


/**
 * The main function for the Orchestrator Agent.
 * @param taskOrFilePath A high-level task description or a path to an existing file to audit.
 * @param outputFilePath The path to write the final code to.
 */
async function runDevelopmentCycle(taskOrFilePath: string, outputFilePath?: string) {
  let initialCode: string | undefined;
  let taskDescription: string;
  const isAuditMode = await fs.stat(taskOrFilePath).then(s => s.isFile()).catch(() => false);

  if (isAuditMode) {
    console.log(`[Orchestrator] Starting in "Audit & Correct" mode for file: ${taskOrFilePath}`);
    initialCode = await fs.readFile(taskOrFilePath, 'utf-8');
    taskDescription = `Audit and correct the following code file: ${taskOrFilePath}`;
    if (!outputFilePath) {
      outputFilePath = taskOrFilePath; // Overwrite the original file if no output is specified
    }
  } else {
    taskDescription = taskOrFilePath;
    console.log(`[Orchestrator] Starting in "Generate" mode for task: "${taskDescription}"`);
    if (!outputFilePath) {
        console.error('[Orchestrator] FATAL: An output file path must be provided for generation tasks.');
        process.exit(1);
    }
  }

  let currentCode: string | undefined = initialCode;
  let auditReport: string | undefined;
  let verdict: 'PASS' | 'FAIL' = 'FAIL';

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`\n[Orchestrator] Attempt #${attempt}`);

    // If it's the first attempt in generation mode, generate the initial code.
    if (attempt === 1 && !isAuditMode) {
        const relevantContextChunks = await retrieveRelevantContext(taskDescription);
        console.log(`[Orchestrator] Retrieved ${relevantContextChunks.length} context chunks for initial generation.`);
        
        // DEBUG LOGGING: Log retrieved context
        console.log('\n--- [DEBUG] CONTEXT RETRIEVED ---');
        relevantContextChunks.forEach((chunk, i) => {
            console.log(`Chunk ${i + 1}: ${chunk.substring(0, 100).replace(/\n/g, ' ')}...`);
        });
        console.log('---------------------------------\n');

        console.log('[Orchestrator] Calling Generator Agent for first draft...');
        currentCode = await generateCode({ taskDescription, context: relevantContextChunks });
    }

    if (!currentCode) {
        console.error('[Orchestrator] No code available to critique. Aborting.');
        return;
    }

    // Step 2: Critique the current code
    console.log('[Orchestrator] Submitting code for critique...');
    const projectConstitution = await fs.readFile(path.join(process.cwd(), 'CONTEXT.md'), 'utf-8');
    const rawCritiqueReport = await critiqueCode({
      codeToCritique: currentCode,
      projectConstitution: projectConstitution,
    });
    
    const verdictMatch = rawCritiqueReport.match(/\\*\\*Verdict:\\*\\*\\s*(PASS|FAIL)/i);
    verdict = (verdictMatch ? verdictMatch[1].toUpperCase() : 'FAIL') as 'PASS' | 'FAIL';
    auditReport = rawCritiqueReport;
    
    console.log(`[Orchestrator] Critique Verdict: ${verdict}`);
    
    if (verdict === 'PASS') {
        console.log('[Orchestrator] ✅ Code has passed the audit!');
        break; 
    } else {
        console.log('[Orchestrator] ❌ Code failed audit. Preparing for correction loop...');
        console.log('Issues Found:\n', auditReport);
        
        const relevantContextChunks = await retrieveRelevantContext(taskDescription);
        
        // DEBUG LOGGING: Log the exact correction prompt
        const correctionPromptForLogging = `
        You are an expert software engineer. The previous code you generated failed its quality and security audit.
        Your task is to rewrite the code to address every issue identified in the audit report below.
        You must not introduce any new functionality or deviate from the original requirements.
        The rewritten code must be of the highest quality and designed to pass the audit.

        ORIGINAL TASK:
        ---
        ${taskDescription}
        ---
        
        RELEVANT CONTEXT FROM KNOWLEDGE BASE:
        ---
        ${relevantContextChunks.join('\n---\n')}
        ---

        FAILED CODE:
        ---
        ${currentCode}
        ---

        AUDIT REPORT:
        ---
        ${auditReport}
        ---

        Now, provide the corrected and improved version of the code. Only output the raw code, with no explanations or markdown.
      `;
        console.log('\n--- [DEBUG] CORRECTION PROMPT ---');
        console.log(correctionPromptForLogging);
        console.log('---------------------------------\n');
        
        currentCode = await generateCode({
            taskDescription,
            context: relevantContextChunks,
            failedCode: currentCode,
            critique: auditReport,
        });
    }
  }

  if (verdict === 'PASS' && currentCode) {
    // DEBUG LOGGING: Log the final passing code
    console.log('\n--- [DEBUG] FINAL PASSING CODE ---');
    console.log(currentCode);
    console.log('----------------------------------\n');
    
    console.log(`[Orchestrator] Writing final, audited code to ${outputFilePath}`);
    await fs.writeFile(outputFilePath!, currentCode);
    console.log('[Orchestrator] ✅ Development cycle complete.');
  } else {
    console.error(`\n[Orchestrator] ❌ Failed to produce passing code after 3 attempts.`);
    process.exit(1);
  }
}

// This allows the script to be run from the command line.
const argument = process.argv[2];
const outputFile = process.argv[3];

if (!argument) {
  console.error('Usage:');
  console.error('  Generate: npx tsx scripts/orchestrator.ts "<task_description>" <output_file_path>');
  console.error('  Audit:    npx tsx scripts/orchestrator.ts <path_to_existing_file>');
  process.exit(1);
}

runDevelopmentCycle(argument, outputFile);
