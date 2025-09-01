# SYSTEM AUDIT REPORT v4: Agent Separation of Powers

This document contains the final, definitive analysis and solution for the orchestrator's repeated failures. It serves as the single source of truth for the new, corrected agentic architecture.

## The V4 Audit: The "Agent Identity Crisis"

Previous audits correctly identified the symptoms (the "Agent Paradox") but failed to address the root cause. The core problem was a flaw in the design of the `generateCode` agent itself. It was tasked with being both a creative "Generator" and a logical "Corrector." This dual identity caused it to fail during correction attempts. When given a critique, it would often get confused and default back to its primary generation task, ignoring the specific fixes required by the audit report. This resulted in it submitting the same flawed code repeatedly.

## The Definitive Solution: Separation of Powers

The solution is to architect a true "Separation of Powers" within the AI system, giving each agent a single, clear responsibility.

1.  **The Generator Agent (`generateCode`):** This agent's role is now limited to **initial code generation only**. It is the creative engine.

2.  **The Debugging Agent (`correctCode`) - NEW:** A new, specialized flow is created. Its **sole purpose is to correct code.** Its prompt is stripped of all creative instructions and is focused exclusively on analyzing a critique and fixing the provided code.

3.  **The Orchestrator (`orchestrator.ts`):** The orchestrator is updated to be a smarter manager. It calls `generateCode` for the first attempt and the new `correctCode` flow for all subsequent correction attempts.

This new architecture is simpler, more robust, and fully aligns with the "Generator-Critique" mandate in the `CONTEXT.md`. It resolves the agent identity crisis and ensures the correction loop is effective.

---

## 1. New Flow: `src/ai/flows/correctCode.ts` (The Debugging Agent)

This is the new, hyper-focused agent responsible only for correcting flawed code.

```typescript
/**
 * @fileOverview The "Debugging Agent" for the RDI Platform.
 * This flow's only purpose is to correct code based on a critique.
 */
'use server';

import { ai } from '../genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

// Input schema for the correction flow
export const CorrectCodeInputSchema = z.object({
  failedCode: z.string().describe('The previous version of the code that failed the audit.'),
  critique: z.string().describe('The audit report detailing the reasons for failure.'),
  originalTask: z.string().describe('The original task description for context.')
});
type CorrectCodeInput = z.infer<typeof CorrectCodeInputSchema>;

// Utility to extract only the code block from the LLM's response.
function extractCode(responseText: string): string {
    const match = responseText.match(/```(?:typescript|tsx|javascript|js)?\s*\n([\s\S]+?)\n```/);
    return match?.[1]?.trim() ?? responseText.trim();
}

export const correctCode = ai.defineFlow(
  {
    name: 'correctCode',
    inputSchema: CorrectCodeInputSchema,
    outputSchema: z.string().describe('The corrected code as a string.'),
  },
  async ({ failedCode, critique, originalTask }: CorrectCodeInput) => {
    console.log('[DebuggingAgent] Received correction request. Engaging Mandatory Compliance Protocol.');

    const correctionPrompt = `
# CRITICAL: CODE CORRECTION & DEBUGGING MODE

You are an expert software engineer acting as a debugger. Your ONLY objective is to fix the specific violations in the provided code based on the given audit report.

## ORIGINAL TASK:
${originalTask}

## FAILED CODE VERSION:
\`\`\`typescript
${failedCode}
\`\`\`

## AUDIT VIOLATIONS (MANDATORY TO FIX):
${critique}

## CORRECTION PROTOCOL:
1.  **Analyze Violations**: Carefully read every issue listed in the audit report.
2.  **Plan Changes**: For each violation, determine the precise code change required to fix it.
3.  **Execute Fixes**: Rewrite the code, applying ONLY the necessary changes. Do not add new features or refactor code that was not flagged in the audit.
4.  **Final Output**: Return ONLY the complete, corrected code block. Do not include any explanations, analysis, or markdown formatting outside of the code block itself.

BEGIN CORRECTION PROTOCOL NOW.
    `;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: correctionPrompt,
      output: { format: 'text' },
      config: { temperature: 0.0 }, // Zero temperature for precise, logical fixes
    });

    return extractCode(llmResponse.text);
  }
);
```
---

## 2. Updated Orchestrator: `scripts/orchestrator.ts`

The orchestrator now calls the appropriate agent for each stage of the process.

```typescript
/**
 * @fileOverview The main orchestrator script for the autonomous development cycle.
 * This script now uses specialized agents for generation and correction.
 */
import 'dotenv/config';
'use server';

// UPDATED: Import both agents
import { generateCode } from '../src/ai/flows/generateCode';
import { correctCode } from '../src/ai/flows/correctCode'; 
import { critiqueCode } from '../src/ai/flows/critiqueCode';
import { retrieveRelevantContext } from '../src/ai/knowledge-base';
import * as fs from 'fs/promises';
import * as path from 'path';

// ... (sanitizeForFilename function remains the same) ...
function sanitizeForFilename(text: string): string {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
}


async function runDevelopmentCycle(taskOrFilePath: string, outputFilePath?: string) {
  // ... (Journaling setup remains the same) ...
  const logDir = path.join(process.cwd(), 'logs', 'orchestrator');
  await fs.mkdir(logDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const sanitizedTask = sanitizeForFilename(taskOrFilePath);
  const logFileName = `${timestamp}-${sanitizedTask}.md`;
  const logFilePath = path.join(logDir, logFileName);
  const appendToJournal = (content: string) => fs.appendFile(logFilePath, content + '\n\n');
  await appendToJournal(`# Orchestrator Run Log: ${new Date().toLocaleString()}`);


  let initialCode: string | undefined;
  let taskDescription: string;
  const isAuditMode = await fs.stat(taskOrFilePath).then(s => s.isFile()).catch(() => false);
  const projectConstitution = await fs.readFile(path.join(process.cwd(), 'CONTEXT.md'), 'utf-8');

  if (isAuditMode) {
    taskDescription = `Audit and correct the following code file: ${taskOrFilePath}`;
    initialCode = await fs.readFile(taskOrFilePath, 'utf-8');
    if (!outputFilePath) outputFilePath = taskOrFilePath;
  } else {
    taskDescription = taskOrFilePath;
    if (!outputFilePath) {
        console.error('[Orchestrator] FATAL: An output file path must be provided for generation tasks.');
        process.exit(1);
    }
  }
  
  await appendToJournal(`## Task Description\n\n\`\`\`\n${taskDescription}\n\`\`\``);

  let currentCode: string | undefined = initialCode;
  let auditReport: string | undefined;
  let verdict: 'PASS' | 'FAIL' = 'FAIL';

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`\n[Orchestrator] Attempt #${attempt}`);
    await appendToJournal(`## Attempt #${attempt}`);

    if (attempt === 1 && !isAuditMode) {
        // --- INITIAL GENERATION ---
        console.log('[Orchestrator] Calling Generator Agent for first draft...');
        const relevantContextChunks = await retrieveRelevantContext(taskDescription);
        currentCode = await generateCode({ taskDescription, context: relevantContextChunks });
        await appendToJournal(`### Generated Code (Attempt #${attempt})\n\n\`\`\`typescript\n${currentCode}\n\`\`\``);

    } else if (currentCode && auditReport) {
        // --- CORRECTION ---
        // UPDATED: Call the new, specialized correctCode agent
        console.log('[Orchestrator] Calling Debugging Agent for correction...');
        currentCode = await correctCode({
            failedCode: currentCode,
            critique: auditReport,
            originalTask: taskDescription
        });
        await appendToJournal(`### Corrected Code (Attempt #${attempt})\n\n\`\`\`typescript\n${currentCode}\n\`\`\``);
    }

    if (!currentCode) {
      const errorMsg = '[Orchestrator] Agent returned no code. Aborting.';
      console.error(errorMsg);
      await appendToJournal(`## Final Outcome\n\n**STATUS:** ❌ FAIL\n**REASON:** ${errorMsg}`);
      return;
    }

    console.log('[Orchestrator] Submitting code for critique...');
    const rawCritiqueReport = await critiqueCode({
      codeToCritique: currentCode,
      projectConstitution: projectConstitution,
    });
    
    await appendToJournal(`### Critique Report (Attempt #${attempt})\n\n${rawCritiqueReport}`);
    
    const verdictMatch = rawCritiqueReport.match(/(\n|\r\n)3\. Verdict:\s*(\w+)/i);
    verdict = (verdictMatch && verdictMatch[2].toUpperCase() === 'PASS') ? 'PASS' : 'FAIL';
    auditReport = rawCritiqueReport;
    
    console.log(`[Orchestrator] Critique Verdict: ${verdict}`);
    
    if (verdict === 'PASS') {
        console.log('[Orchestrator] ✅ Code has passed the audit!');
        break; 
    } else if (attempt < 3) {
        console.log('[Orchestrator] ❌ Code failed audit. Preparing for correction loop...');
    }
  }

  // Final Outcome Logic (remains the same)
  if (verdict === 'PASS' && currentCode) {
    // ... success logic ...
     if (!outputFilePath) {
      console.error('[Orchestrator] FATAL: Output file path is missing for a successful run.');
      process.exit(1);
    }
    await appendToJournal(`## Final Outcome\n\n**STATUS:** ✅ PASS\n**File Path:** \`${outputFilePath}\``);
    await appendToJournal(`## Final Code\n\n\`\`\`typescript\n${currentCode}\n\`\`\``);
    
    console.log(`[Orchestrator] Writing final, audited code to ${outputFilePath}`);
    const outputDir = path.dirname(outputFilePath);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputFilePath, currentCode);
    console.log(`[Orchestrator] ✅ Development cycle complete. See full log at: ${logFilePath}`);
  } else {
    // ... failure logic ...
    const finalMessage = `❌ Failed to produce passing code after 3 attempts.`;
    await appendToJournal(`## Final Outcome\n\n**STATUS:** ❌ FAIL\n**REASON:** ${finalMessage}`);
    console.error(`\n[Orchestrator] ${finalMessage}`);
    console.log(`[Orchestrator] See full log of failed attempts at: ${logFilePath}`);
    process.exit(1);
  }
}


// --- Script Execution (remains the same) ---
const taskOrFilePath = process.argv[2];
const outputFilePath = process.argv[3];
if (!taskOrFilePath) {
  console.error('Usage: ...');
  process.exit(1);
}
runDevelopmentCycle(taskOrFilePath, outputFilePath);

```
---
```
    </content>
  </change>
  <change>
    <file>/home/user/studio/scripts/orchestrator.ts</file>
    <content><![CDATA[/**
 * @fileOverview The main orchestrator script for the autonomous development cycle.
 * This script now uses specialized agents for generation and correction.
 */
import 'dotenv/config';
'use server';

// UPDATED: Import both agents
import { generateCode } from '../src/ai/flows/generateCode';
import { correctCode } from '../src/ai/flows/correctCode'; 
import { critiqueCode } from '../src/ai/flows/critiqueCode';
import { retrieveRelevantContext } from '../src/ai/knowledge-base';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Sanitizes a string to be safe for use as a filename.
 * @param text The input string.
 * @returns A sanitized string.
 */
function sanitizeForFilename(text: string): string {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
}

/**
 * The main function for the Orchestrator Agent.
 * @param taskOrFilePath A high-level task description or a path to an existing file to audit.
 * @param outputFilePath The path to write the final code to.
 */
async function runDevelopmentCycle(taskOrFilePath: string, outputFilePath?: string) {
  // --- Journaling Setup ---
  const logDir = path.join(process.cwd(), 'logs', 'orchestrator');
  await fs.mkdir(logDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const sanitizedTask = sanitizeForFilename(taskOrFilePath);
  const logFileName = `${timestamp}-${sanitizedTask}.md`;
  const logFilePath = path.join(logDir, logFileName);
  const appendToJournal = (content: string) => fs.appendFile(logFilePath, content + '\n\n');
  await appendToJournal(`# Orchestrator Run Log: ${new Date().toLocaleString()}`);

  let initialCode: string | undefined;
  let taskDescription: string;
  const isAuditMode = await fs.stat(taskOrFilePath).then(s => s.isFile()).catch(() => false);
  const projectConstitution = await fs.readFile(path.join(process.cwd(), 'CONTEXT.md'), 'utf-8');

  if (isAuditMode) {
    taskDescription = `Audit and correct the following code file: ${taskOrFilePath}`;
    console.log(`[Orchestrator] Starting in "Audit & Correct" mode for file: ${taskOrFilePath}`);
    initialCode = await fs.readFile(taskOrFilePath, 'utf-8');
    if (!outputFilePath) outputFilePath = taskOrFilePath;
  } else {
    taskDescription = taskOrFilePath;
    console.log(`[Orchestrator] Starting in "Generate" mode for task: "${taskDescription}"`);
    if (!outputFilePath) {
        console.error('[Orchestrator] FATAL: An output file path must be provided for generation tasks.');
        process.exit(1);
    }
  }
  
  await appendToJournal(`## Task Description\n\n\`\`\`\n${taskDescription}\n\`\`\``);

  let currentCode: string | undefined = initialCode;
  let auditReport: string | undefined;
  let verdict: 'PASS' | 'FAIL' = 'FAIL';

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`\n[Orchestrator] Attempt #${attempt}`);
    await appendToJournal(`## Attempt #${attempt}`);

    if (attempt === 1 && !isAuditMode) {
        // --- INITIAL GENERATION ---
        console.log('[Orchestrator] Calling Generator Agent for first draft...');
        const relevantContextChunks = await retrieveRelevantContext(taskDescription);
        await appendToJournal(`### Retrieved Context (RAG)\n\n${relevantContextChunks.map((c, i) => `**Chunk ${i+1}:**\n\`\`\`\n${c}\n\`\`\``).join('\n\n')}`);
        currentCode = await generateCode({ taskDescription, context: relevantContextChunks });
        await appendToJournal(`### Generated Code (Attempt #${attempt})\n\n\`\`\`typescript\n${currentCode}\n\`\`\``);

    } else if (currentCode && auditReport) {
        // --- CORRECTION ---
        // UPDATED: Call the new, specialized correctCode agent
        console.log('[Orchestrator] Calling Debugging Agent for correction...');
        currentCode = await correctCode({
            failedCode: currentCode,
            critique: auditReport,
            originalTask: taskDescription
        });
        await appendToJournal(`### Corrected Code (Attempt #${attempt})\n\n\`\`\`typescript\n${currentCode}\n\`\`\``);
    }

    if (!currentCode || currentCode.trim() === '') {
      const errorMsg = '[Orchestrator] Agent returned no code. Aborting.';
      console.error(errorMsg);
      await appendToJournal(`## Final Outcome\n\n**STATUS:** ❌ FAIL\n**REASON:** ${errorMsg}`);
      return;
    }

    console.log('[Orchestrator] Submitting code for critique...');
    const rawCritiqueReport = await critiqueCode({
      codeToCritique: currentCode,
      projectConstitution: projectConstitution,
    });
    
    await appendToJournal(`### Critique Report (Attempt #${attempt})\n\n${rawCritiqueReport}`);
    
    const verdictMatch = rawCritiqueReport.match(/(\n|\r\n)3\. Verdict:\s*(\w+)/i);
    verdict = (verdictMatch && verdictMatch[2].toUpperCase() === 'PASS') ? 'PASS' : 'FAIL';
    auditReport = rawCritiqueReport;
    
    console.log(`[Orchestrator] Critique Verdict: ${verdict}`);
    
    if (verdict === 'PASS') {
        console.log('[Orchestrator] ✅ Code has passed the audit!');
        break; 
    } else if (attempt < 3) {
        console.log('[Orchestrator] ❌ Code failed audit. Preparing for correction loop...');
    }
  }

  if (verdict === 'PASS' && currentCode) {
    if (!outputFilePath) {
      console.error('[Orchestrator] FATAL: Output file path is missing for a successful run.');
      process.exit(1);
    }
    await appendToJournal(`## Final Outcome\n\n**STATUS:** ✅ PASS\n**File Path:** \`${outputFilePath}\``);
    await appendToJournal(`## Final Code\n\n\`\`\`typescript\n${currentCode}\n\`\`\``);
    
    console.log(`[Orchestrator] Writing final, audited code to ${outputFilePath}`);
    const outputDir = path.dirname(outputFilePath);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputFilePath, currentCode);
    console.log(`[Orchestrator] ✅ Development cycle complete. See full log at: ${logFilePath}`);
  } else {
    const finalMessage = `❌ Failed to produce passing code after 3 attempts.`;
    await appendToJournal(`## Final Outcome\n\n**STATUS:** ❌ FAIL\n**REASON:** ${finalMessage}`);
    console.error(`\n[Orchestrator] ${finalMessage}`);
    console.log(`[Orchestrator] See full log of failed attempts at: ${logFilePath}`);
    process.exit(1);
  }
}

// --- Script Execution ---
const taskOrFilePath = process.argv[2];
const outputFilePath = process.argv[3];

if (!taskOrFilePath) {
  console.error('Usage:');
  console.error('  Generate: npx tsx scripts/orchestrator.ts "<task_description>" <output_file_path>');
  console.error('  Audit:    npx tsx scripts/orchestrator.ts <path_to_existing_file> [<output_file_path>]');
  process.exit(1);
}

runDevelopmentCycle(taskOrFilePath, outputFilePath).catch(err => {
    console.error('[Orchestrator] A fatal, unhandled exception occurred:', err);
    process.exit(1);
});
