/**
 * @fileoverview A robust script to run all major Genkit flows with test data.
 * This provides a simple way to validate that all flows are functioning correctly.
 * To run: `npx tsx src/ai/flows/run-all-tests.ts`
 */
'use server';

import { generateCode } from './generateCode';
import { critiqueCode } from './critiqueCode';
import { generateMasterPrompt } from './meta-prompter';
import { embedText } from './embed';
import * as fs from 'fs/promises';
import * as path from 'path';

// A simple logger to make output clear
const log = (title: string, data: any) => {
  console.log(`\n--- 🧪 Testing: ${title} ---`);
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

  const projectConstitution = await fs.readFile(path.join(process.cwd(), 'CONTEXT.md'), 'utf-8');

  // Test 1: embedText
  try {
    const input = "This is a test sentence.";
    const output = await embedText(input);
    log('embedText', { output });
  } catch (e) {
    logError('embedText', e);
  }

  // Test 2: generateMasterPrompt
  try {
    const input = "Create a React component that fetches user data.";
    const output = await generateMasterPrompt(input);
    log('generateMasterPrompt', { output });
  } catch (e) {
    logError('generateMasterPrompt', e);
  }

  // Test 3: critiqueCode
  try {
    const input = { 
        codeToCritique: 'function add(a, b) { return a + b; }', 
        projectConstitution: 'All functions must have TypeScript types.' 
    };
    const output = await critiqueCode(input);
    log('critiqueCode', { output });
  } catch (e) {
    logError('critiqueCode', e);
  }

  // Test 4: generateCode (Initial Generation)
  try {
      const input = {
          taskDescription: "A simple function to add two numbers.",
          context: ["All functions must use TypeScript and have JSDoc comments."],
      };
      const output = await generateCode(input);
      log('generateCode (Initial)', { output });
  } catch (e) {
      logError('generateCode (Initial)', e);
  }
  
  console.log('\n\n✅ All tests complete.');
}

runTests();
