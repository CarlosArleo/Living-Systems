/**
 * @fileOverview The "Restorative Healer" Organelle (Correct Agent).
 * This flow regenerates code to restore harmony based on feedback.
 */
'use server';

import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { ai } from '../genkit';
import dna from '../prompts/system_dna.prompt';

const CorrectInputSchema = z.object({
  code: z.string().describe('The dissonant code that needs healing.'),
  feedback: z.string().describe('The feedback signals from the Sensory Detector.'),
});
type CorrectInput = z.infer<typeof CorrectInputSchema>;

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

    // Extract only the code from the response, removing markdown backticks if present
    const rawResponse = llmResponse.text;
    const codeMatch = rawResponse.match(/```(?:typescript|tsx|)\n([\s\S]+)\n```/);
    const correctedCode = codeMatch ? codeMatch[1].trim() : rawResponse.trim();

    return { correctedCode };
  }
);
