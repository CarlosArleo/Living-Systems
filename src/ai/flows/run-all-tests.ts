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

// Define a type for our test results
type TestResult = {
  name: string;
  status: '✅ PASS' | '❌ FAIL';
  details: string;
};

async function runTests() {
  console.log('🚀 Starting RDI Platform Flow Validation Script...');
  const testResults: TestResult[] = [];

  const projectConstitution = await fs.readFile(path.join(process.cwd(), 'CONTEXT.md'), 'utf-8');

  // Test 1: embedText
  try {
    const input = "This is a test sentence.";
    const output = await embedText(input);
    testResults.push({ name: 'embedText', status: '✅ PASS', details: `Returned embedding of length ${output.length}` });
  } catch (e: any) {
    testResults.push({ name: 'embedText', status: '❌ FAIL', details: e.message });
  }

  // Test 2: generateMasterPrompt
  try {
    const input = "Create a React component that fetches user data.";
    const output = await generateMasterPrompt(input);
    testResults.push({ name: 'generateMasterPrompt', status: '✅ PASS', details: `Generated prompt of length ${output.length}` });
  } catch (e: any) {
    testResults.push({ name: 'generateMasterPrompt', status: '❌ FAIL', details: e.message });
  }

  // Test 3: critiqueCode
  try {
    const input = {
        codeToCritique: 'function add(a, b) { return a + b; }',
        projectConstitution: 'All functions must have TypeScript types.'
    };
    const output = await critiqueCode(input);
    const status = output.includes('FAIL') ? '✅ PASS' : '❌ FAIL';
    const details = status === '✅ PASS' ? 'Correctly identified flaws.' : 'Failed to identify flaws.';
    testResults.push({ name: 'critiqueCode', status, details });
  } catch (e: any) {
    testResults.push({ name: 'critiqueCode', status: '❌ FAIL', details: e.message });
  }

  // Test 4: generateCode (Initial Generation)
  try {
      const input = {
          taskDescription: "A simple function to add two numbers.",
          context: ["All functions must use TypeScript and have JSDoc comments."],
      };
      const output = await generateCode(input);
      const status = output.includes('function add(a: number, b: number): number') ? '✅ PASS' : '❌ FAIL';
      const details = status === '✅ PASS' ? 'Generated valid TypeScript code.' : 'Generated invalid code.';
      testResults.push({ name: 'generateCode (Initial)', status, details });
  } catch (e: any) {
      testResults.push({ name: 'generateCode (Initial)', status: '❌ FAIL', details: e.message });
  }

  // Print the final summary report
  console.log('\n\n--- 📊 FLOW TEST SUMMARY ---');
  const maxNameLength = Math.max(...testResults.map(r => r.name.length));
  
  testResults.forEach(result => {
    const paddedName = result.name.padEnd(maxNameLength);
    console.log(`${paddedName} | ${result.status.padEnd(8)} | ${result.details}`);
  });
  console.log('--- ✅ End of Report ---');
}

runTests();
