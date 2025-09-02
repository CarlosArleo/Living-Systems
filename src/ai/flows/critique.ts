/**
 * @fileOverview The "Sensory Detector" Organelle (Critique Agent).
 * This flow evaluates an output for dissonance against the system's DNA.
 */
'use server';

import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { ai } from '@/ai/genkit';

const CritiqueInputSchema = z.object({
  code: z.string().describe('The generated code to be audited.'),
});
type CritiqueInput = z.infer<typeof CritiqueInputSchema>;

export const critiqueFlow = ai.defineFlow(
  {
    name: 'critiqueFlow',
    inputSchema: CritiqueInputSchema,
    outputSchema: z.object({
      feedback: z.string().describe('A detailed report of any material flaws found.'),
      pass: z.boolean().describe('True if the code is in equilibrium (PASS), false otherwise (FAIL).'),
    }),
  },
  async (input: CritiqueInput) => {
    console.log('[critiqueFlow] Sensing for dissonance...');
    const { code } = input;

    const critiquePrompt = `You are a code auditor with a deep understanding of the project's DNA, which embodies its core principles and architectural guidelines. Analyze the provided code for any violations of this DNA. Provide detailed feedback and a final verdict.

    Your primary goal is to find MATERIAL flaws. A material flaw is one that:
    1. Directly violates a CRITICAL or non-negotiable rule in the DNA.
    2. Introduces a clear security vulnerability.
    3. Causes a fatal logical error.
You MUST IGNORE minor issues or stylistic preferences. If the code is simple but correctly and securely fulfills the request, it MUST PASS.

    Code to critique:
    \`\`\`typescript
    ${code}
    \`\`\`

    Provide your feedback and a final verdict. If there are no material issues, you MUST include "Verdict: PASS" in your response. Otherwise, include "Verdict: FAIL". Respond only with the feedback and verdict.`;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: critiquePrompt,
        tools: ['constitutionTool'],
      config: { temperature: 0.0, },
    });

    const responseText = llmResponse.text;
    const pass = /verdict:\s*pass/i.test(responseText);

    return { feedback: responseText, pass };
  }
);
