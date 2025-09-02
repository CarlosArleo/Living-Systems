/**
 * @fileOverview The "Growth Initiator" flow for the RDI Platform.
 * This flow generates a first draft of code based on a provided prompt.
 */
'use server';

import { ai } from '../genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

// Define the input schema for the flow.
export const GenerateFlowInputSchema = z.object({
  prompt: z.string().describe('The detailed prompt containing the task and context.'),
});
type GenerateFlowInput = z.infer<typeof GenerateFlowInputSchema>;

// Define the output schema for the flow.
export const GenerateFlowOutputSchema = z.object({
  code: z.string().describe('The generated code as a string.'),
});
type GenerateFlowOutput = z.infer<typeof GenerateFlowOutputSchema>;

/**
 * A Genkit flow that takes a prompt and generates code using the Gemini Pro model.
 */
export const generateFlow = ai.defineFlow(
  {
    name: 'generateFlow',
    inputSchema: GenerateFlowInputSchema,
    outputSchema: GenerateFlowOutputSchema,
  },
  async ({ prompt }: GenerateFlowInput): Promise<GenerateFlowOutput> => {
    console.log(`[generateFlow] Received request to generate code.`);

    try {
      const llmResponse = await ai.generate({
        model: googleAI.model('gemini-pro'),
        prompt: prompt,
        output: { format: 'text' },
        config: { temperature: 0.1 }, // Low temperature for more deterministic code
      });

      const generatedCode = llmResponse.text;

      if (!generatedCode || generatedCode.trim() === '') {
        throw new Error('The AI model returned empty code.');
      }

      console.log(`[generateFlow] Successfully generated code.`);
      return { code: generatedCode };
      
    } catch (error) {
      console.error('[generateFlow] A critical error occurred:', error);
      // Re-throw the error to be handled by the calling orchestrator
      throw new Error(
        error instanceof Error ? error.message : 'An unknown error occurred during code generation.'
      );
    }
  }
);
