/**
 * @fileOverview The "Restorative Healer" Organelle (Correct Agent).
 * This flow regenerates code to restore harmony based on feedback.
 */
'use server';

import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { ai } from '@/ai/genkit';

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

    const correctionPrompt = `You are a code regeneration expert. You are provided with code that does not align with project guidelines and coding principles, also known as DNA. You can access the DNA to correct the code, and you address the feedback. You produce the new, corrected code. You respond only with the corrected code. You do not include any explanations.\n
      Feedback Signals to Address:
      ---
      ${feedback}
      ---

      Dissonant Code:
      \`\`\`typescript
      ${code}
      \`\`\`

      Produce the corrected, harmonious code. Output ONLY the raw code block.`;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: correctionPrompt,
      config: { temperature: 0.2 },
    });

    const correctedCode = extractCode(llmResponse.text);

    return { correctedCode };
  }
);
