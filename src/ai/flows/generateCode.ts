
/**
 * @fileOverview The "Generator Agent" for the RDI Platform.
 * This flow is responsible for writing the initial draft of code based on a task description.
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
 * A Genkit flow that generates or corrects code based on a task description.
 * It dynamically adjusts its prompt based on whether it's a new task or a correction.
 */
export const generateCode = ai.defineFlow(
  {
    name: 'generateCode',
    inputSchema: FlowInputSchema,
    outputSchema: z.string().describe('The generated code as a string.'),
  },
  async (input: FlowInput) => {
    let prompt: string;

    // Check if this is a correction task by looking for the 'failedCode' property
    if ('failedCode' in input && input.failedCode && input.critique) {
      // This is a correction prompt.
      console.log('[GeneratorAgent] Received correction request. Engaging Mandatory Compliance Protocol.');
      
      // THE DEFINITIVE FIX: Using the user-architected, robust correction prompt.
      prompt = `
# CRITICAL: CORRECTION MODE - NOT GENERATION MODE

You are in DEBUG AND FIX mode. Your ONLY objective is to fix specific violations.

## FAILED CODE:
\`\`\`
${input.failedCode}
\`\`\`

## AUDIT VIOLATIONS (MANDATORY TO FIX):
${input.critique}

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

## OUTPUT FORMAT:
First provide your analysis and plan, then the corrected code, then your verification. Use this exact structure:

### VIOLATION ANALYSIS:
1. [List each specific violation from audit] → [What exact change is needed for each]
2. [Violation 2] → [Change for violation 2]

### CORRECTED CODE:
\`\`\`typescript
[Your fixed code here]
\`\`\`

### VERIFICATION:
- [x] Violation 1 fixed by [describe the specific change you made].
- [x] Violation 2 fixed by [describe the specific change you made].

BEGIN CORRECTION PROTOCOL NOW.
      `;
    } else {
      // This is an initial generation prompt.
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
      prompt: prompt,
      output: { format: 'text' }, // We expect raw code output
      config: { temperature: 0.1 }, // Low temperature for more deterministic code
    });

    // The new correction prompt includes analysis headers. We need to strip them
    // to return only the pure code.
    const responseText = llmResponse.text;
    const codeMatch = responseText.match(/### CORRECTED CODE:\s*```(?:typescript|tsx|)\n([\s\S]+)\n```/);

    if (codeMatch && codeMatch[1]) {
        // If it was a correction, return just the code block.
        return codeMatch[1].trim();
    } else {
        // Otherwise, it was an initial generation, return the whole text.
        return responseText.trim();
    }
  }
);
