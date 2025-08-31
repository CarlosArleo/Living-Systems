/**
 * @fileOverview The "Meta-Prompter" Agent for the RDI Platform.
 * This flow generates high-quality Master Prompts for other agents.
 */
'use server';

import { ai } from '../genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { retrieveRelevantContext } from '../knowledge-base';

const MetaPrompterInputSchema = z.string().describe('A high-level description of the development task for which a Master Prompt is needed.');

const MetaPrompterOutputSchema = z.string().describe('A fully-formed, high-quality Master Prompt string.');

/**
 * A Genkit flow that acts as a Master Prompt Engineer.
 * It takes a task description and generates a bespoke, constitution-aligned
 * Master Prompt for other AI agents to use.
 */
export const generateMasterPrompt = ai.defineFlow(
  {
    name: 'generateMasterPrompt',
    inputSchema: MetaPrompterInputSchema,
    outputSchema: MetaPrompterOutputSchema,
  },
  async (taskDescription: string) => {
    console.log(`[MetaPrompter] Generating Master Prompt for task: "${taskDescription}"`);

    // 1. Retrieve context relevant to the task.
    const relevantContext = await retrieveRelevantContext(taskDescription, 7); // Fetch more context for better prompt generation
    console.log(`[MetaPrompter] Retrieved ${relevantContext.length} relevant context chunks.`);

    // 2. The Meta-Prompt: Instruct the AI to act as a prompt engineer.
    const metaPrompt = `
      You are a world-class Master Prompt Engineer, an expert in orchestrating AI agents by creating precise, high-quality instructions.
      Your task is to generate a new, complete "Master Prompt" for an AI software engineering agent.
      This new prompt must be based on the provided task description and the relevant principles retrieved from the project's knowledge base.

      The Master Prompt you generate MUST strictly follow this five-part anatomy:
      1.  **Role-Playing:** Assign a specific, expert persona to the AI agent.
      2.  **Context Grounding:** Explicitly instruct the agent to ground its response in the project's constitution (CONTEXT.md).
      3.  **Task Definition:** Clearly and unambiguously state the primary goal.
      4.  **Constraints & Directives:** List all critical non-functional requirements (e.g., security, performance, standards).
      5.  **Output Formatting:** Specify the exact structure and format of the desired output.

      ---
      RELEVANT PRINCIPLES & CONTEXT FROM KNOWLEDGE BASE:
      ${relevantContext.join('\n---\n')}
      ---
      HIGH-LEVEL TASK DESCRIPTION:
      "${taskDescription}"
      ---

      Now, generate the complete Master Prompt based on the task and context provided. Output ONLY the generated prompt text.
    `;

    // 3. Call the LLM to generate the new prompt.
    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: metaPrompt,
      output: { format: 'text' },
      config: { temperature: 0.3 }, // Allow for some creativity in prompt wording
    });
    
    console.log('[MetaPrompter] Successfully generated new Master Prompt.');
    return llmResponse.text;
  }
);
