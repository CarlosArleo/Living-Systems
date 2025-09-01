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
