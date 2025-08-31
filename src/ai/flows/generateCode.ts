
/**
 * @fileOverview The "Generator Agent" for the RDI Platform.
 * This flow is responsible for writing the initial draft of code based on a task description.
 */
'use server';

import { ai, googleAI } from '../genkit';
import { z } from 'zod';

// Schema for a standard code generation request
const GenerateCodeInputSchema = z.object({
  taskDescription: z.string().describe('The high-level task to be accomplished.'),
  context: z.array(z.string()).describe('Relevant sections from the knowledge base to guide generation.'),
});

// Schema for a correction request, which includes the previous failed attempt and the critique
const CorrectCodeInputSchema = z.object({
  taskDescription: z.string(),
  context: z.array(z.string()),
  failedCode: z.string().describe('The previous version of the code that failed the audit.'),
  critique: z.string().describe('The audit report detailing the reasons for failure.'),
});

// The flow can accept either a generation or a correction request
const FlowInputSchema = z.union([GenerateCodeInputSchema, CorrectCodeInputSchema]);

/**
 * A Genkit flow that generates or corrects code based on a task description.
 * It dynamically adjusts its prompt based on whether it's a new task or a correction.
 */
export const generateCode = ai.defineFlow(
  {
    name: 'generateCode',
    inputSchema: FlowInputSchema,
    outputSchema: z.string().describe('The generated code as a string.'),
  },
  async (input) => {
    let prompt: string;

    // Check if this is a correction task
    if ('failedCode' in input) {
      // Correction Prompt
      prompt = `
        You are a senior software engineer. The previous code you generated failed its quality and security audit.
        Your task is to rewrite the code to address every issue identified in the audit report below.
        You must not introduce any new functionality or deviate from the original requirements.
        The rewritten code must be of the highest quality and designed to pass the audit.

        ORIGINAL TASK:
        ---
        ${input.taskDescription}
        ---
        
        RELEVANT CONTEXT FROM KNOWLEDGE BASE:
        ---
        ${input.context.join('\n---\n')}
        ---

        FAILED CODE:
        ---
        ${input.failedCode}
        ---

        AUDIT REPORT:
        ---
        ${input.critique}
        ---

        Now, provide the corrected and improved version of the code. Only output the raw code, with no explanations or markdown.
      `;
    } else {
      // Initial Generation Prompt
      prompt = `
        You are an expert software engineer. Your task is to write code that accomplishes the following task.
        You must adhere to all principles and standards outlined in the provided context.

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
    }

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: prompt,
      output: { format: 'text' }, // We expect raw code output
      config: { temperature: 0.1 }, // Low temperature for more deterministic code
    });

    return llmResponse.text;
  }
);
    