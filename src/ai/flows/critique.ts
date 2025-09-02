/**
 * @fileOverview The "Sensory Detector" Organelle (Critique Agent).
 * This flow evaluates an output for dissonance against the system's DNA.
 */
'use server';

import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { ai } from '../genkit';

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
    tools: ['applyConstitution'], // Makes the DNA intrinsically available
  },
  async ({ code }: CritiqueInput) => {
    console.log('[critiqueFlow] Sensing for dissonance...');

    const critiquePrompt = `
      You are the "Sensory Detector" organelle. Your purpose is to evaluate the provided code for any material flaws or dissonance against your intrinsic DNA (the Project Constitution), which is available to you as a tool.

      A material flaw is a CRITICAL or non-negotiable violation, a clear security vulnerability, or a fatal logical error. IGNORE minor stylistic issues.

      Analyze the following code:
      \`\`\`
      ${code}
      \`\`\`

      Provide your feedback and a final verdict. If there are no material flaws, you MUST respond with "pass: true".
    `;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: critiquePrompt,
      config: { temperature: 0.0 },
    });

    const responseText = llmResponse.text;
    // A simple but effective way to determine the verdict
    const pass = /pass:\s*true/i.test(responseText);

    return { feedback: responseText, pass };
  }
);
