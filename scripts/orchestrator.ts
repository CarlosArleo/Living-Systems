/**
 * @fileOverview The Master Orchestrator Agent script.
 * This script automates the full Generate -> Critique -> Correct development cycle.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { retrieveRelevantContext } from '../src/ai/knowledge-base';
import { generateCode } from '../src/ai/flows/generateCode';
import { critiqueCode } from '../src/ai/flows/critiqueCode';
import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Genkit for standalone script usage
configureGenkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY,
    }),
  ],
  logLevel: 'silent',
  enableTracingAndMetrics: false,
});

const MAX_RETRIES = 3;

/**
 * Parses the verdict from a critique report.
 * @param report The full Markdown report from the critique agent.
 * @returns 'PASS', 'FAIL', or 'UNKNOWN'.
 */
function parseVerdict(report: string): 'PASS' | 'FAIL' | 'UNKNOWN' {
  const match = report.match(/\*\*3\. Verdict:\*\*\s*\n(PASS|FAIL)/);
  if (match && match[1]) {
    return match[1] as 'PASS' | 'FAIL';
  }
  return 'UNKNOWN';
}

/**
 * Executes the full Generate -> Critique -> Correct development cycle for a given task.
 * @param taskDescription A high-level description of the development task.
 * @returns The final, audited code that has passed the critique.
 */
export async function runDevelopmentCycle(taskDescription: string): Promise<string> {
  console.log(`🚀 Starting new development cycle for task: "${taskDescription}"`);

  // 1. Context Retrieval
  console.log('Step 1: Retrieving relevant context from knowledge base...');
  const relevantContext = await retrieveRelevantContext(taskDescription);
  console.log(`- Found ${relevantContext.length} relevant context chunks.`);

  // 2. Initial Generation
  console.log('\nStep 2: Generating initial code draft...');
  let currentCode = await generateCode({
    taskDescription,
    context: relevantContext,
  });
  console.log('- Initial draft generated.');
  
  // Load the full project constitution for the critique agent
  const constitutionPath = path.join(process.cwd(), 'CONTEXT.md');
  const projectConstitution = await fs.readFile(constitutionPath, 'utf-8');

  // 3. Critique and Correction Loop
  for (let i = 0; i < MAX_RETRIES; i++) {
    console.log(`\nStep 3: Audit Cycle ${i + 1}/${MAX_RETRIES}`);
    console.log('- Auditing generated code against project constitution...');

    const critiqueReport = await critiqueCode({
      codeToCritique: currentCode,
      projectConstitution,
    });
    
    console.log('--- AUDIT REPORT ---');
    console.log(critiqueReport);
    console.log('--------------------');

    const verdict = parseVerdict(critiqueReport);
    console.log(`- Critique Verdict: ${verdict}`);

    if (verdict === 'PASS') {
      console.log('\n✅ Code has passed the audit. Development cycle complete.');
      return currentCode;
    }

    if (verdict === 'FAIL') {
      if (i < MAX_RETRIES - 1) {
        console.log('- Code failed audit. Initiating correction...');
        currentCode = await generateCode({
          taskDescription,
          context: relevantContext,
          failedCode: currentCode,
          critique: critiqueReport,
        });
        console.log('- Corrected code draft generated.');
      } else {
        console.error(`\n❌ FAILED: Code did not pass audit after ${MAX_RETRIES} attempts.`);
        throw new Error('Failed to produce satisfactory code after multiple correction cycles.');
      }
    } else {
        throw new Error('Could not parse verdict from critique report.');
    }
  }

  throw new Error('Development cycle failed to complete within the retry limit.');
}

// Example usage: To run this script from the command line, you could add:
// runDevelopmentCycle("Create a Firestore security rule that allows users to read their own data.").then(code => {
//   console.log("\n\n=== FINAL APPROVED CODE ===\n", code);
// }).catch(err => {
//   console.error(err);
// });
