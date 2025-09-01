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
export type CorrectCodeInput = z.infer<typeof CorrectCodeInputSchema>;

/**
 * Extracts the first fenced code block from an LLM response.
 * Falls back to the whole response if no fence is found.
 */
function extractCode(responseText: string): string {
  const fence = /```(?:typescript|tsx|javascript|js)?\s*\n([\s\S]+?)\n```/i;
  const match = responseText.match(fence);
  if (match?.[1]) return match[1].trim();
  return responseText.trim();
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

You are an expert software engineer acting as a debugger. Your only goal is to produce a corrected version of the code that *passes* the audit against the Project Constitution (CONTEXT.md). Follow this protocol strictly:

1. Read the ORIGINAL TASK to understand intent and required feature boundaries.
2. Read the FAILED CODE and the AUDIT REPORT (critique). Identify every failure.
3. Apply minimal, surgical changes to fix ALL issues. Preserve style and structure unless refactors are required by the Constitution (security, transactions, backend-only writes, etc.).
4. **Final Output**: Return ONLY the complete, corrected code inside a single fenced code block. Do not include commentary, analysis, or markdown formatting outside of the code block itself.

## ORIGINAL TASK
${originalTask}

## AUDIT REPORT
${critique}

## FAILED CODE
\`\`\`typescript
${failedCode}
\`\`\`

BEGIN CORRECTION PROTOCOL NOW.`;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: correctionPrompt,
      output: { format: 'text' },
      config: { temperature: 0.0 },
    });

    const text = typeof llmResponse.text === 'string' ? llmResponse.text : String(llmResponse.text ?? '');
    const code = extractCode(text);

    if (!code) {
      throw new Error('[DebuggingAgent] No code returned by model.');
    }

    return code;
  }
);
