/**
 * @fileOverview The "Generator Agent" for the RDI Platform.
 * This flow is responsible for initial code generation only.
 */
'use server';

import { ai } from '../genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

// Schema for a standard code generation request
const GenerateCodeInputSchema = z.object({
  taskDescription: z.string().describe('The high-level task to be accomplished.'),
  context: z.array(z.string()).describe('Relevant sections from the knowledge base to guide generation.'),
});
type GenerateCodeInput = z.infer<typeof GenerateCodeInputSchema>;

/**
 * A Genkit flow that generates code based on a task description.
 */
export const generateCode = ai.defineFlow(
  {
    name: 'generateCode',
    inputSchema: GenerateCodeInputSchema,
    outputSchema: z.string().describe('The generated code as a string.'),
  },
  async (input: GenerateCodeInput) => {
    
      console.log('[GeneratorAgent] Received initial generation request.');
      const prompt = `
        You are an expert software engineer. Your task is to write code that accomplishes the following task.
        You must adhere to all principles and standards outlined in the provided context.

        CRITICAL INSTRUCTION: If the task asks for a file with a '.prompt' extension, you MUST generate the raw text content for that file. DO NOT generate TypeScript code for '.prompt' files. For all other files (e.g., '.ts', '.tsx'), generate the appropriate TypeScript/TSX code.

        TASK:
        ---
        ${input.taskDescription}
        ---

        RELEVANT CONTEXT FROM KNOWLEDGE BASE:
        ---
        ${input.context.join('\n---\n')}
        ---

        Generate the code that performs this task. Only output the raw code, with no explanations or markdown.
      `;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: prompt,
      output: { format: 'text' }, // We expect raw code output
      config: { temperature: 0.1 }, // Low temperature for more deterministic code
    });

    return llmResponse.text;
  }
);
