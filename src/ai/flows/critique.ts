/**
 * @fileOverview The "Sensory Detector" Organelle (Critique Agent).
 * This flow evaluates an output for dissonance against the system's DNA.
 */
'use server';

import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { ai } from '@/ai/genkit';
import * as fs from 'fs/promises';
import * as path from 'path';

const CritiqueInputSchema = z.object({
  code: z.string().describe('The generated code to be audited.'),
  projectConstitution: z.string().describe('The full content of the CONTEXT.md file.'),
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
    const { code, projectConstitution } = input;
    const dna = await fs.readFile(path.join(process.cwd(), 'src', 'ai', 'prompts', 'system_dna.prompt'), 'utf-8');

    const critiquePrompt = `
      ${dna}

      Your assigned role for this task is **The Sensory Detector (Critique)**.

      Analyze the following code against the intrinsic DNA provided in the system prompt.
      
      ---
      CODE TO CRITIQUE:
      \`\`\`typescript
      ${code}
      \`\`\`
      ---
      PROJECT CONSTITUTION (DNA):
      ${projectConstitution}
      ---
      
      Provide your feedback and a final verdict. If there are no material flaws, you MUST include "Verdict: PASS" in your response. Otherwise, include "Verdict: FAIL".
    `;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: critiquePrompt,
      config: { temperature: 0.0 },
    });

    const responseText = llmResponse.text;
    const pass = /verdict:\s*pass/i.test(responseText);

    return { feedback: responseText, pass };
  }
);
