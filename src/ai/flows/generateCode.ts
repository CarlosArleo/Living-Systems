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
 * Robust function to extract code from LLM response, handling various formatting inconsistencies.
 * This is the upgraded, more resilient version.
 * @param responseText The full text output from the LLM.
 * @param isCorrection A boolean indicating if this is a correction attempt.
 * @returns The cleaned, extracted code string.
 */
function extractCodeFromResponse(responseText: string, isCorrection: boolean): string {
  // For initial generation, the entire response is the code.
  if (!isCorrection) {
    // Also handle cases where the generation might be wrapped in backticks
    const match = responseText.match(/```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return responseText.trim();
  }

  // For corrections, the model provides analysis headers. We must find the code block.
  const patterns = [
    // Standard pattern with or without language specifier
    /###\s*CORRECTED CODE:\s*```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/i,
    // Variations in header casing or spacing
    /##\s*CORRECTED CODE:\s*```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/i,
    // Fallback for just finding a code block after some keywords
    /(?:corrected|fixed|updated)[\s\S]*?```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/i,
    // The most generic fallback: find the first multi-line code block.
    /```(?:typescript|tsx?|javascript|js)?\s*\n([\s\S]+?)\n```/,
  ];

  for (const pattern of patterns) {
    const match = responseText.match(pattern);
    if (match?.[1]?.trim()) {
      console.log('[GeneratorAgent] Successfully extracted corrected code using pattern.');
      return match[1].trim();
    }
  }

  // Last-ditch effort if no code block is found but the header exists.
  // This handles cases where the LLM forgets the closing backticks.
  const headerMatch = responseText.match(/###?\s*(?:CORRECTED CODE|Corrected Code):\s*\n([\s\S]+?)(?:\n###|$)/i);
  if (headerMatch?.[1]) {
    const cleanCode = headerMatch[1]
      .replace(/```[\s\S]*?\n/, '') // Remove opening backticks
      .replace(/\n```[\s\S]*$/, '') // Remove closing backticks
      .trim();

    if (cleanCode) {
      console.log('[GeneratorAgent] Extracted code using header fallback method.');
      return cleanCode;
    }
  }

  console.error('[GeneratorAgent] CRITICAL: Failed to extract code from correction response.');
  console.error('[GeneratorAgent] Response preview:', responseText.substring(0, 250) + '...');
  console.error('[GeneratorAgent] Returning full response - this will likely cause audit failure.');
  
  // Return the raw response as a final fallback.
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
    
    // Add sanity checks for the extracted code.
    if (isCorrection) {
      const { failedCode } = input; // safe due to narrowing above

      if (extractedCode === failedCode) {
        console.warn('[GeneratorAgent] WARNING: Corrected code appears identical to failed code.');
      }
      
      if (
        extractedCode.length < 50 &&
        (!extractedCode.includes('import') &&
          !extractedCode.includes('function') &&
          !extractedCode.includes('const'))
      ) {
        console.warn('[GeneratorAgent] WARNING: Extracted code appears to be incomplete or malformed.');
        console.warn('[GeneratorAgent] Extracted:', extractedCode.substring(0, 100) + '...');
      }
    }


    return extractedCode;
  }
);
