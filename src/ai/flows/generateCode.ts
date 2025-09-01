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
 * FIX #3: Enhanced function to extract code from LLM response, handling various formatting inconsistencies.
 * @param responseText The full text output from the LLM.
 * @param isCorrection A boolean indicating if this is a correction attempt.
 * @returns The cleaned, extracted code string.
 */
function extractCodeFromResponse(responseText: string, isCorrection: boolean): string {
  if (!isCorrection) {
    const match = responseText.match(/```(?:typescript|tsx|javascript|js)?\s*\n([\s\S]+?)\n```/);
    return (match && match[1]) ? match[1].trim() : responseText.trim();
  }
  
  // Enhanced patterns for correction mode
  const patterns = [
    /###\s*CORRECTED CODE:\s*```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/i,
    /##\s*CORRECTED CODE:\s*```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/i,
    /```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/, // Fallback
  ];
  
  for (const pattern of patterns) {
    const match = responseText.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  
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
      // FIX #1: New, more robust correction prompt
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
      prompt,
      output: { format: 'text' },
      config: { temperature: 0.1 },
    });

    return extractCodeFromResponse(llmResponse.text, isCorrection);
  }
);
