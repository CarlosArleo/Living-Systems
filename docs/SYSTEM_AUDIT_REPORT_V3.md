# SYSTEM AUDIT REPORT v3: The Orchestrator Process & Agent Paradox

This document contains the complete source code for all scripts and flows involved in the autonomous development orchestrator. It serves as a single source of truth for auditing the entire agentic "assembly line".

It also documents the critical insight gained from debugging the orchestrator's repeated failures: **The Agent Paradox**.

## The Agent Paradox: How Success Caused Failure

Our shared intuition was correct: the system was failing *because* a component was succeeding. The Critique Agent, after being made more pragmatic, correctly issued a `PASS` verdict for simple code. However, this exposed a latent flaw in the `generateCode` agent's correction logic.

The `generateCode` agent's prompt for "correction mode" was built entirely around the assumption that it would receive a `FAIL` verdict with a list of violations to fix. When it received a `PASS` verdict, it became confused and returned an empty or invalid response. The `orchestrator` script, seeing this invalid response, then correctly declared the entire process a failure.

**The system was punishing itself for success.**

## The Definitive Fix

The solution required two key changes to align the agents' behavior and the orchestrator's logic:

1.  **Smarter Correction Agent (`generateCode`):** The correction prompt was upgraded to include a specific protocol for handling a `PASS` verdict. It is now explicitly instructed to recognize a `PASS` and simply return the original code, acknowledging that no changes are needed.
2.  **Smarter Orchestrator (`orchestrator.ts`):** The orchestrator script was refined to immediately break its loop and proceed to the final file-writing step as soon as a `PASS` verdict is received, preventing it from initiating a pointless correction attempt on already-correct code.

These changes resolve the paradox and create a truly aligned and intelligent system.

---

## 1. Entry Point: `scripts/orchestrator.ts`

This script is the main entry point, initiated by the human developer. It manages the Generate -> Critique -> Correct loop.

```typescript
/**
 * @fileOverview The main orchestrator script for the autonomous development cycle.
 * This script can either:
 * 1. Generate new code from a task description.
 * 2. Audit and correct an existing file.
 * It now features a robust journaling system to log every step of the process.
 */
import 'dotenv/config';
'use server';

import { generateCode } from '../src/ai/flows/generateCode';
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
    return text
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric characters except hyphens
        .slice(0, 50); // Truncate to a reasonable length
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
    if (!outputFilePath) {
      outputFilePath = taskOrFilePath;
    }
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

    // This is the core logic for the Generate -> Critique -> Correct loop
    if (attempt === 1 && !isAuditMode) {
        // --- INITIAL GENERATION ---
        const relevantContextChunks = await retrieveRelevantContext(taskDescription);
        console.log(`[Orchestrator] Retrieved ${relevantContextChunks.length} context chunks for initial generation.`);
        await appendToJournal(`### Retrieved Context (RAG)\n\n${relevantContextChunks.map((c, i) => `**Chunk ${i+1}:**\n\`\`\`\n${c}\n\`\`\``).join('\n\n')}`);
        
        console.log('[Orchestrator] Calling Generator Agent for first draft...');
        currentCode = await generateCode({ taskDescription, context: relevantContextChunks });
        await appendToJournal(`### Generated Code (Attempt #${attempt})\n\n\`\`\`typescript\n${currentCode}\n\`\`\``);

    } else if (currentCode && auditReport) {
        // --- CORRECTION ATTEMPT ---
        console.log('[Orchestrator] Calling Generator Agent for correction...');
        
        const correctionContext = [projectConstitution];
        
        const correctedCode = await generateCode({
            taskDescription,
            context: correctionContext,
            failedCode: currentCode,
            critique: auditReport,
        });
        
        currentCode = correctedCode;

        await appendToJournal(`### Corrected Code (Attempt #${attempt})\n\n\`\`\`typescript\n${currentCode}\n\`\`\``);
    }


    if (!currentCode) {
        const errorMsg = '[Orchestrator] No code available to critique. Aborting.';
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

runDevelopmentCycle(taskOrFilePath, outputFilePath);
```

---

## 2. Context Retriever: `src/ai/knowledge-base.ts`

```typescript
/**
 * @fileOverview A utility for retrieving relevant context from the project's
 * knowledge base using vector embeddings and cosine similarity.
 */
'use server';

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { promises as fs } from 'fs';
import path from 'path';

type KnowledgeChunk = {
  text: string;
  embedding: number[];
};

let knowledgeBase: KnowledgeChunk[] | null = null;

async function loadKnowledgeBase(): Promise<KnowledgeChunk[]> {
  if (knowledgeBase) {
    return knowledgeBase;
  }
  const filePath = path.join(process.cwd(), 'rag-memory.json');
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    knowledgeBase = JSON.parse(fileContent);
    return knowledgeBase!;
  } catch (error) {
    console.error('Failed to load or parse rag-memory.json:', error);
    return [];
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function retrieveRelevantContext(
  taskDescription: string,
  topK: number = 5
): Promise<string[]> {
  const base = await loadKnowledgeBase();
  if (base.length === 0) return [];
  
  const embeddingResponse = await ai.embed({
      embedder: googleAI.embedder('text-embedding-004'),
      content: taskDescription,
  });
  
  const queryEmbedding = embeddingResponse[0]?.embedding;
  if (!queryEmbedding) throw new Error("Failed to generate an embedding for the query.");

  const similarities = base.map((chunk) => ({
    text: chunk.text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  similarities.sort((a, b) => b.score - a.score);
  return similarities.slice(0, topK).map((item) => item.text);
}
```

---

## 3. Vectorization Utility: `src/ai/flows/embed.ts`

```typescript
/**
 * @fileOverview A simple Genkit flow for generating text embeddings.
 */
'use server';

import { ai } from '../genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

export const embedText = ai.defineFlow(
  {
    name: 'embedText',
    inputSchema: z.string(),
    outputSchema: z.array(z.number()),
  },
  async (text: string) => {
    const embeddingResponse = await ai.embed({
      embedder: googleAI.embedder('text-embedding-004'),
      content: text,
    });
    if (embeddingResponse && embeddingResponse.length > 0) {
      return embeddingResponse[0].embedding;
    }
    throw new Error(`Failed to generate embedding for text: "${text.substring(0, 50)}..."`);
  }
);
```

---

## 4. Generator Agent: `src/ai/flows/generateCode.ts`

```typescript
/**
 * @fileOverview The "Generator Agent" for the RDI Platform.
 * This flow is responsible for both initial code generation and self-correction based on audit reports.
 */
'use server';

import { ai } from '../genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

const GenerateCodeInputSchema = z.object({
  taskDescription: z.string().describe('The high-level task to be accomplished.'),
  context: z.array(z.string()).describe('Relevant sections from the knowledge base to guide generation.'),
});

const CorrectCodeInputSchema = z.object({
  taskDescription: z.string(),
  context: z.array(z.string()),
  failedCode: z.string().describe('The previous version of the code that failed the audit.'),
  critique: z.string().describe('The audit report detailing the reasons for failure.'),
});

const FlowInputSchema = z.union([GenerateCodeInputSchema, CorrectCodeInputSchema]);
type FlowInput = z.infer<typeof FlowInputSchema>;

function extractCodeFromResponse(responseText: string, isCorrection: boolean): string {
  if (!isCorrection) {
    const match = responseText.match(/```(?:typescript|tsx|javascript|js)?\s*\n([\s\S]+?)\n```/);
    return (match && match[1]) ? match[1].trim() : responseText.trim();
  }
  const patterns = [
    /###\s*CORRECTED CODE:\s*```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/i,
    /##\s*CORRECTED CODE:\s*```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/i,
    /```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/,
  ];
  for (const pattern of patterns) {
    const match = responseText.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return responseText.trim();
}

export const generateCode = ai.defineFlow(
  {
    name: 'generateCode',
    inputSchema: FlowInputSchema,
    outputSchema: z.string().describe('The generated code as a string.'),
  },
  async (input: FlowInput) => {
    let prompt: string;
    const isCorrection = 'failedCode' in input && typeof input.failedCode === 'string' && typeof input.critique === 'string';

    if (isCorrection) {
      const { failedCode, critique } = input;
      console.log('[GeneratorAgent] Received correction request. Engaging Mandatory Compliance Protocol.');
      prompt = `
# CRITICAL: CORRECTION MODE
You are in DEBUG AND FIX mode. Your ONLY objective is to either fix specific violations or confirm a PASS.
## PREVIOUS CODE VERSION:
\`\`\`typescript
${failedCode}
\`\`\`
## AUDIT REPORT:
${critique}
## CORRECTION PROTOCOL:
1.  **Analyze the Verdict**: First, find the "Verdict:" line in the audit report.
2.  **Handle PASS Verdict**: If the verdict is "PASS", your task is simple: **IGNORE all other instructions and output ONLY the original "PREVIOUS CODE VERSION" exactly as it was provided to you, inside a "CORRECTED CODE" block.**
3.  **Handle FAIL Verdict**: If the verdict is "FAIL", you MUST fix every single material violation listed in the audit.
## REQUIRED OUTPUT FORMAT:
You MUST use this EXACT structure:
### VIOLATION ANALYSIS:
(Your analysis of the violations. If PASS, state "No material violations found.")
### CORRECTED CODE:
\`\`\`typescript
[Your fixed code here. If PASS, this is identical to PREVIOUS CODE VERSION.]
\`\`\`
### VERIFICATION:
(Your verification that violations are resolved or none existed.)
BEGIN CORRECTION PROTOCOL NOW.`;
    } else {
      console.log('[GeneratorAgent] Received initial generation request.');
      prompt = `
        You are an expert software engineer. Your task is to write code that accomplishes the following task.
        You must adhere to all principles and standards outlined in the provided context.
        TASK:
        ---
        ${input.taskDescription}
        ---
        RELEVANT CONTEXT FROM KNOWLEDGE BASE:
        ---
        ${input.context.join('\n---\n')}
        ---
        Generate the code that performs this task. Only output the raw code, with no explanations or markdown.
      `;
    }

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt,
      output: { format: 'text' },
      config: { temperature: 0.1 },
    });

    return extractCodeFromResponse(llmResponse.text, isCorrection);
  }
);
```

---

## 5. Critique Agent: `src/ai/flows/critiqueCode.ts`

```typescript
/**
 * @fileOverview The "Critique Agent" for the RDI Platform.
 * This flow audits generated code against the project constitution.
 */
'use server';

import { ai } from '../genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

const CritiqueInputSchema = z.object({
  codeToCritique: z.string().describe('The generated code that needs to be audited.'),
  projectConstitution: z.string().describe('The full content of the CONTEXT.md file.'),
});
type CritiqueInput = z.infer<typeof CritiqueInputSchema>;

export const critiqueCode = ai.defineFlow(
  {
    name: 'critiqueCode',
    inputSchema: CritiqueInputSchema,
    outputSchema: z.string().describe('A structured Markdown report of the audit findings.'),
  },
  async ({ codeToCritique, projectConstitution }: CritiqueInput) => {
    if (!codeToCritique || codeToCritique.trim() === '') {
      return `
### Code Audit Report
**1. Material Issues Found:**
- No code was provided to critique.
**2. Suggested Improvements:**
- Please provide the code that needs to be audited.
**3. Verdict:**
FAIL
      `;
    }

    const critiquePrompt = `
      You are an expert, hyper-critical but pragmatic code auditor and security analyst. Your sole purpose is to review the provided code and identify any and all material flaws.
      CRITICAL DIRECTIVE: Your goal is to help the system ship high-quality, secure code, NOT to achieve theoretical perfection.
      A material flaw is one that:
      1.  Directly violates a CRITICAL or non-negotiable rule written in the CONSTITUTION.
      2.  Introduces a clear and exploitable security vulnerability.
      3.  Causes a fatal logical error that will prevent the code from compiling or running.
      You MUST IGNORE minor issues or stylistic preferences. If the code is simple but correctly and securely fulfills the request, it MUST PASS.
      Analyze the provided CODE TO CRITIQUE against the CONSTITUTION.
      Output Format:
      You MUST provide your feedback in the following structured Markdown format.
      ### Code Audit Report
      **1. Material Issues Found:**
      (A numbered list of every material issue you identified. If none, you MUST state "No material issues found.")
      **2. Suggested Improvements:**
      (A bulleted list of recommendations to fix the issues. If none, state "None.")
      **3. Verdict:**
      (A single word: PASS or FAIL. The verdict is FAIL only if a material issue is found.)
      ---
      CONSTITUTION:
      ${projectConstitution}
      ---
      CODE TO CRITIQUE:
      ${codeToCritique}
      ---
    `;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: critiquePrompt,
      output: { format: 'text' },
      config: { temperature: 0.0 },
    });

    return llmResponse.text;
  }
);
```

---
