/**
 * @fileOverview The "Growth Initiator" Organelle (Generate Agent).
 * This flow is responsible for the initial creation of code or artifacts.
 */
'use server';

import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { ai } from '../genkit';

const GenerateInputSchema = z.object({
  prompt: z.string().describe('The detailed Master Prompt for the generation task.'),
});
type GenerateInput = z.infer<typeof GenerateInputSchema>;

export const generateFlow = ai.defineFlow(
  {
    name: 'generateFlow',
    inputSchema: GenerateInputSchema,
    outputSchema: z.object({
      code: z.string().describe('The generated code or artifact.'),
    }),
  },
  async (input: GenerateInput) => {
    console.log('[generateFlow] Initiating growth...');
    try {
      const llmResponse = await ai.generate({
        model: googleAI.model('gemini-1.5-pro'),
        prompt: input.prompt,
        config: { temperature: 0.2 },
      });

      return { code: llmResponse.text };
    } catch (error) {
      console.error('[generateFlow] An error occurred:', error);
      throw new Error('Failed to generate code from the AI model.');
    }
  }
);
