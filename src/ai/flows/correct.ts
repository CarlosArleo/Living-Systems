/**
 * @fileOverview The "Restorative Healer" Organelle (Correct Agent).
 * This flow regenerates code to restore harmony based on feedback.
 */
'use server';

import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { ai } from '../genkit';

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
    // The `tools` property is not defined here, but in the ai.generate call.
  },
  async (input: CorrectInput) => {
    console.log('[correctFlow] Regenerating harmony...');

    const { code, feedback } = input;

    const correctionPrompt = `
      You are the "Restorative Healer" organelle. You have received dissonant code and feedback signals. Your sole purpose is to regenerate the code to restore its harmony with your intrinsic DNA (the Project Constitution), which is available as a tool.

      Address EVERY material flaw mentioned in the feedback. Do not introduce new features.

      Dissonant Code:
      \`\`\`
      ${code}
      \`\`\`

      Feedback Signals to address:
      ---
      ${feedback}
      ---

      Produce the corrected, harmonious code.
    `;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: correctionPrompt,
      config: { temperature: 0.2 },
      tools: ['applyConstitution'], // CORRECT: Tools are provided to the model here.
    });

    return { correctedCode: llmResponse.text };
  }
);
