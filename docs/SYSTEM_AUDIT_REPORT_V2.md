# SYSTEM AUDIT REPORT v2: The Orchestrator Process

This document contains the complete source code for all scripts and flows involved in the autonomous development orchestrator. It serves as a single source of truth for auditing the entire agentic "assembly line".

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
        
        // ** THE DEFINITIVE FIX **
        // On correction attempts, we provide the FULL CONSTITUTION as context, not just the RAG chunks.
        // This gives the Generator the same worldview as the Critic, allowing it to understand the critique fully.
        const correctionContext = [projectConstitution];
        
        await appendToJournal(`### Correction Prompt (Attempt #${attempt})\n\n\`\`\`\n${'You are an expert software engineer... (Correction prompt content)'}\n\`\`\``);
        
        // Call the agent with the full constitution as its context.
        currentCode = await generateCode({
            taskDescription,
            context: correctionContext,
            failedCode: currentCode,
            critique: auditReport,
        });

        await appendToJournal(`### Generated Code (Attempt #${attempt})\n\n\`\`\`typescript\n${currentCode}\n\`\`\``);
    }


    if (!currentCode) {
        const errorMsg = '[Orchestrator] No code available to critique. Aborting.';
        console.error(errorMsg);
        await appendToJournal(`## Final Outcome\n\n**STATUS:** ❌ FAIL\n**REASON:** ${errorMsg}`);
        return;
    }

    console.log('[Orchestrator] Submitting code for critique...');
    // The Critique Agent ALWAYS gets the full constitution.
    const rawCritiqueReport = await critiqueCode({
      codeToCritique: currentCode,
      projectConstitution: projectConstitution,
    });
    
    await appendToJournal(`### Critique Report (Attempt #${attempt})\n\n${rawCritiqueReport}`);
    
    // We now have a more robust verdict parsing logic
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

This utility is responsible for finding relevant context from the knowledge base to guide the Generator agent.

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

/**
 * Loads the knowledge base from the JSON file into memory.
 * Caches the result to avoid repeated file reads.
 */
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
    // Return an empty array on error to prevent crashes
    return [];
  }
}

/**
 * Calculates the cosine similarity between two vectors.
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @returns The cosine similarity score.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Retrieves the most relevant text chunks from the knowledge base for a given query.
 *
 * @param taskDescription The user's query or task description.
 * @param topK The number of top results to return.
 * @returns A promise that resolves to an array of the most relevant text chunks.
 */
export async function retrieveRelevantContext(
  taskDescription: string,
  topK: number = 5
): Promise<string[]> {
  const base = await loadKnowledgeBase();
  if (base.length === 0) {
    console.warn('Knowledge base is empty. Cannot retrieve context.');
    return [];
  }

  // DEFINITIVE FIX: The `ai.embed` function returns an array of embeddings.
  // We need to access the first element and its `embedding` property.
  const embeddingResponse = await ai.embed({
      embedder: googleAI.embedder('text-embedding-004'),
      content: taskDescription,
  });
  
  // The embedding response is an array of results, even for one input.
  const queryEmbedding = embeddingResponse[0]?.embedding;

  if (!queryEmbedding) {
      throw new Error("Failed to generate an embedding for the query.");
  }

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

This is the core utility flow that converts text into a vector, enabling semantic search.

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
    // The ai.embed() function always returns an array of results,
    // even for a single input, to support batching.
    const embeddingResponse = await ai.embed({
      embedder: googleAI.embedder('text-embedding-004'),
      content: text,
    });

    // THE FIX:
    // 1. Check if the response array has at least one result.
    // 2. Access the first element of the array (`embeddingResponse[0]`).
    // 3. Access the `.embedding` property of that first element.
    if (embeddingResponse && embeddingResponse.length > 0) {
      return embeddingResponse[0].embedding;
    }

    // If for some reason the embedding fails, throw an error
    // instead of returning undefined, which provides a clearer error message.
    throw new Error(`Failed to generate embedding for text: "${text.substring(0, 50)}..."`);
  }
);
```

---

## 4. Generator Agent: `src/ai/flows/generateCode.ts`

This agent is responsible for both initial code generation and self-correction based on audit reports. It now uses a superior "Mandatory Compliance" prompt for corrections.

```typescript
/**
 * @fileOverview The "Generator Agent" for the RDI Platform.
 * This flow is responsible for both initial code generation and self-correction based on audit reports.
 */
'use server';

import { ai } from '../genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

// Schema for a standard code generation request
const GenerateCodeInputSchema = z.object({
  taskDescription: z.string().describe('The high-level task to be accomplished.'),
  context: z.array(z.string()).describe('Relevant sections from the knowledge base to guide generation.'),
});

// Schema for a correction request, which includes the previous failed attempt and the critique
const CorrectCodeInputSchema = z.object({
  taskDescription: z.string(),
  context: z.array(z.string()),
  failedCode: z.string().describe('The previous version of the code that failed the audit.'),
  critique: z.string().describe('The audit report detailing the reasons for failure.'),
});

// The flow can accept either a generation or a correction request
const FlowInputSchema = z.union([GenerateCodeInputSchema, CorrectCodeInputSchema]);
type FlowInput = z.infer<typeof FlowInputSchema>;


/**
 * Robust function to extract code from LLM response, handling various formatting inconsistencies
 */
function extractCodeFromResponse(responseText: string, isCorrection: boolean): string {
  if (!isCorrection) {
    return responseText.trim();
  }

  const patterns = [
    /###\s*CORRECTED CODE:\s*```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/i,
    /##\s*CORRECTED CODE:\s*```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/i,
    /###\s*Corrected Code:\s*```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/i,
    /(?:corrected|fixed|updated)[\s\S]*?```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/i,
    /```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/,
  ];

  for (const pattern of patterns) {
    const match = responseText.match(pattern);
    if (match?.[1]?.trim()) {
      console.log('[GeneratorAgent] Successfully extracted corrected code using pattern');
      return match[1].trim();
    }
  }

  const headerMatch = responseText.match(/###?\s*(?:CORRECTED CODE|Corrected Code):\s*\n([\s\S]+?)(?:\n###|$)/i);
  if (headerMatch?.[1]) {
    const cleanCode = headerMatch[1]
      .replace(/```[\s\S]*?\n/, '')
      .replace(/\n```[\s\S]*$/, '')
      .trim();

    if (cleanCode) {
      console.log('[GeneratorAgent] Extracted code using header fallback method');
      return cleanCode;
    }
  }

  console.error('[GeneratorAgent] CRITICAL: Failed to extract code from correction response');
  console.error('[GeneratorAgent] Response preview:', responseText.substring(0, 200) + '...');
  console.error('[GeneratorAgent] Returning full response - this will likely cause audit failure');

  return responseText.trim();
}

/**
 * A Genkit flow that generates or corrects code based on a task description.
 */
export const generateCode = ai.defineFlow(
  {
    name: 'generateCode',
    inputSchema: FlowInputSchema,
    outputSchema: z.string().describe('The generated code as a string.'),
  },
  async (input: FlowInput) => {
    let prompt: string;
    const isCorrection =
      'failedCode' in input && typeof input.failedCode === 'string' && typeof input.critique === 'string';

    if (isCorrection) {
      // TS now knows input is the correction type inside this block
      const { failedCode, critique } = input;

      console.log('[GeneratorAgent] Received correction request. Engaging Mandatory Compliance Protocol.');

      prompt = `
# CRITICAL: CORRECTION MODE - NOT GENERATION MODE

You are in DEBUG AND FIX mode. Your ONLY objective is to fix specific violations.

## FAILED CODE:
\`\`\`
${failedCode}
\`\`\`

## AUDIT VIOLATIONS (MANDATORY TO FIX):
${critique}

## CORRECTION PROTOCOL:
1. **ANALYZE**: List every specific violation mentioned in the audit.
2. **PRIORITIZE**: Order violations by severity (constitutional violations first).
3. **PLAN**: For each violation, state exactly what code change is needed.
4. **EXECUTE**: Make those exact changes, no more, no less.
5. **VERIFY**: Check that each violation is resolved.

## MANDATORY CONSTRAINTS:
- You MUST address EVERY SINGLE violation listed in the audit.
- You MUST NOT make changes unrelated to the violations.
- You MUST NOT reinterpret the original task - just fix what's broken.
- If unsure about a fix, choose the most conservative approach that directly addresses the critique.

## REQUIRED OUTPUT FORMAT:
You MUST use this EXACT structure. Do not deviate:

### VIOLATION ANALYSIS:
1. [List each specific violation from audit] → [What exact change is needed for each]

### CORRECTED CODE:
\`\`\`typescript
[Your fixed code here - ONLY the code, no comments about changes]
\`\`\`

### VERIFICATION:
- [x] Violation 1 fixed by [describe the specific change you made].

CRITICAL: The code between the \`\`\`typescript and \`\`\` markers will be extracted and used directly. Ensure it is complete, executable code with no additional commentary.

BEGIN CORRECTION PROTOCOL NOW.
      `;
    } else {
      console.log('[GeneratorAgent] Received initial generation request.');
      prompt = `
        You are an expert software engineer. Your task is to write code that accomplishes the following task.
        You must adhere to all principles and standards outlined in the provided context.

        CRITICAL INSTRUCTION: If the task asks for a file with a '.prompt' extension, you MUST generate the raw text content for that file. DO NOT generate TypeScript code for '.prompt' files. For all other files (e.g., '.ts', '.tsx'), generate the appropriate TypeScript/TSX code.

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

    const extractedCode = extractCodeFromResponse(llmResponse.text, isCorrection);

    if (isCorrection) {
      const { failedCode } = input; // safe due to narrowing above

      if (extractedCode === failedCode) {
        console.warn('[GeneratorAgent] WARNING: Corrected code appears identical to failed code');
      }

      if (
        extractedCode.length < 50 ||
        (!extractedCode.includes('import') &&
          !extractedCode.includes('function') &&
          !extractedCode.includes('const'))
      ) {
        console.warn('[GeneratorAgent] WARNING: Extracted code appears to be incomplete or malformed');
        console.warn('[GeneratorAgent] Extracted:', extractedCode.substring(0, 100) + '...');
      }
    }

    return extractedCode;
  }
);
```

---

## 5. Critique Agent: `src/ai/flows/critiqueCode.ts`

This agent audits code generated by the Generator Agent, ensuring it adheres to the project constitution. It has been tuned to be more pragmatic.

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

/**
 * A Genkit flow that acts as a meticulous code auditor.
 * It analyzes code for correctness, security, performance, and adherence to project standards.
 */
export const critiqueCode = ai.defineFlow(
  {
    name: 'critiqueCode',
    inputSchema: CritiqueInputSchema,
    outputSchema: z.string().describe('A structured Markdown report of the audit findings.'),
  },
  async ({ codeToCritique, projectConstitution }: CritiqueInput) => {
    // Add a guard clause to handle empty or whitespace-only code input.
    if (!codeToCritique || codeToCritique.trim() === '') {
      return `
### Code Audit Report

**1. Issues Found:**
- No code was provided to critique.

**2. Suggested Improvements:**
- Please provide the code that needs to be audited.

**3. Verdict:**
FAIL
      `;
    }


    // This is the Critique-Bot Playbook prompt, now tuned for pragmatism.
    const prompt = `
      You are an expert, hyper-critical but pragmatic code auditor and security analyst. Your sole purpose is to review the provided code and identify any and all flaws, weaknesses, and deviations from best practices.

      IMPORTANT: Your primary goal is to find MATERIAL flaws. A material flaw is one that:
      1. Directly violates an explicit rule written in the CONSTITUTION (e.g., using a forbidden library, incorrect error handling pattern).
      2. Introduces a clear security vulnerability (e.g., prompt injection, missing authentication).
      3. Causes a logical error that will prevent the code from functioning as requested.
      
      You must be forgiving of minor stylistic preferences, overly theoretical edge cases not relevant to the task, or code that is "too simple" if it correctly and safely fulfills the request. Your critique must be pragmatic and actionable.

      Analyze the provided CODE TO CRITIQUE against the following five criteria:

      1.  **Correctness & Logic:** Does the code correctly and completely implement the requested logic? Are there any bugs, race conditions, or logical fallacies?
      2.  **Adherence to Constitution:** Does the code violate any architectural patterns, coding standards, or explicit directives defined in the CONSTITUTION? (SPECIAL CHECK: If the code imports from a '.prompt' file, ensure that the corresponding file being created is NOT a TypeScript file.)
      3.  **Security Vulnerabilities:** Perform a security scan. Look for common vulnerabilities such as lack of input validation, potential for injection attacks, insecure direct object references, or improper handling of secrets.
      4.  **Performance Bottlenecks:** Identify any inefficient code patterns that could lead to poor performance or excessive cost at scale.
      5.  **Readability & Maintainability:** Is the code clear, well-commented (explaining the 'why'), and idiomatic for the language?

      Output Format:
      You MUST provide your feedback in the following structured Markdown format. Be objective, specific, and provide actionable recommendations.

      ### Code Audit Report

      **1. Issues Found:**
      (A numbered list of every material issue you identified. If no material issues are found, state "No material issues found.")

      **2. Suggested Improvements:**
      (A bulleted list of concrete, actionable recommendations to fix the identified issues. If no issues, state "None.")

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
      prompt: prompt,
      output: { format: 'text' },
      config: { temperature: 0.0 }, // Zero temperature for objective, fact-based critique
    });

    return llmResponse.text;
  }
);
```

---
