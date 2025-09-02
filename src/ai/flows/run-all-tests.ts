/**
 * @fileOverview A robust script to run all major Genkit flows with test data.
 * This provides a simple way to validate that all flows are functioning correctly.
 * To run: `npx tsx src/ai/flows/run-all-tests.ts`
 */
'use server';

import { generateFlow } from './generate';
import { critiqueFlow } from './critique';
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
    const pass = Array.isArray(output) && output.length > 0 && typeof output[0] === 'number';
    testResults.push({ 
      name: 'embedText', 
      status: pass ? '✅ PASS' : '❌ FAIL', 
      details: pass ? `Returned embedding of length ${output.length}` : 'Output was not a valid embedding array.' 
    });
  } catch (e: any) {
    testResults.push({ name: 'embedText', status: '❌ FAIL', details: e.message });
  }

  // Test 2: generateMasterPrompt
  try {
    const input = "Create a React component that fetches user data.";
    const output = await generateMasterPrompt(input);
    const pass = typeof output === 'string' && output.length > 50;
    testResults.push({ 
      name: 'generateMasterPrompt', 
      status: pass ? '✅ PASS' : '❌ FAIL', 
      details: pass ? `Generated prompt of length ${output.length}` : 'Generated prompt was too short or not a string.'
    });
  } catch (e: any) {
    testResults.push({ name: 'generateMasterPrompt', status: '❌ FAIL', details: e.message });
  }

  // Test 3: critiqueCode
  try {
    const input = {
        code: 'function add(a, b) { return a + b; }',
        projectConstitution: 'All functions must have TypeScript types.'
    };
    const output = await critiqueFlow(input);
    const pass = !output.pass && output.feedback.includes('FAIL');
    testResults.push({ 
        name: 'critiqueCode', 
        status: pass ? '✅ PASS' : '❌ FAIL', 
        details: pass ? 'Correctly identified flaws and returned a FAIL verdict.' : 'Failed to identify flaws or return a FAIL verdict.'
    });
  } catch (e: any) {
    testResults.push({ name: 'critiqueCode', status: '❌ FAIL', details: e.message });
  }

  // Test 4: generateCode (Initial Generation)
  try {
      const input = {
          prompt: "A simple function to add two numbers. All functions must use TypeScript and have JSDoc comments.",
      };
      const output = await generateFlow(input);
      const pass = output.code.includes('function add(a: number, b: number): number');
      testResults.push({ 
        name: 'generateCode (Initial)', 
        status: pass ? '✅ PASS' : '❌ FAIL', 
        details: pass ? 'Generated plausible TypeScript code.' : 'Did not generate expected TypeScript code.'
      });
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

  const failures = testResults.filter(r => r.status === '❌ FAIL').length;
  if (failures > 0) {
    console.log(`\n🚨 Found ${failures} failing flow(s). Please review the details above.`);
  } else {
    console.log('\n🎉 All core flows passed the basic validation check!');
  }
  console.log('--- ✅ End of Report ---');
}

runTests();
