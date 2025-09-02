/**
 * @fileOverview The "Restorative Healer" Organelle (Correct Agent).
 * This flow regenerates code to restore harmony based on feedback.
 */
'use server';

import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { ai } from '@/ai/genkit';
import * as fs from 'fs/promises';
import * as path from 'path';


const CorrectInputSchema = z.object({
  code: z.string().describe('The dissonant code that needs healing.'),
  feedback: z.string().describe('The feedback signals from the Sensory Detector.'),
});
type CorrectInput = z.infer<typeof CorrectInputSchema>;

// Utility to extract only the code block from the LLM's response.
function extractCode(responseText: string): string {
    const match = responseText.match(/```(?:typescript|tsx|javascript|js)?\s*\n([\s\S]+?)\n```/);
    return match?.[1]?.trim() ?? responseText.trim();
}

export const correctFlow = ai.defineFlow(
  {
    name: 'correctFlow',
    inputSchema: CorrectInputSchema,
    outputSchema: z.object({
      correctedCode: z.string().describe('The regenerated, harmonious code.'),
    }),
  },
  async (input: CorrectInput) => {
    console.log('[correctFlow] Regenerating harmony...');

    const { code, feedback } = input;
    const dna = await fs.readFile(path.join(process.cwd(), 'docs', 'MASTER_SYSTEM_PROMPT.md'), 'utf-8');


    const correctionPrompt = `
      ${dna}

      Your assigned role for this task is **The Restorative Healer (Correct)**.

      You have received dissonant code and feedback signals. Your sole purpose is to regenerate the code to restore its harmony with your intrinsic DNA. Address EVERY material flaw mentioned in the feedback. Do not introduce new features.

      Dissonant Code:
      \`\`\`typescript
      ${code}
      \`\`\`

      Feedback Signals to Address:
      ---
      ${feedback}
      ---

      Produce the corrected, harmonious code. Output ONLY the raw code block.
    `;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: correctionPrompt,
      config: { temperature: 0.2 },
    });

    const correctedCode = extractCode(llmResponse.text);

    return { correctedCode };
  }
);
