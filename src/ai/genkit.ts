// genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

// Create the configured AI instance - this is the "central brain"
export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-1.5-pro'), // Default model
});

// Export the googleAI plugin for use by other files
export { googleAI };

export const generateCode = ai.defineFlow(
  {
    name: 'generateCode',
    inputSchema: z.object({
      taskDescription: z.string(),
      context: z.string(),
      failedCode: z.string().optional(),
      auditReport: z.string().optional(),
    }),
    outputSchema: z.string(),
  },
  async (input: { taskDescription: string; context: string; failedCode?: string; auditReport?: string }) => {
    console.log('Generator running with task:', input.taskDescription);
    
    // Use the configured AI instance
    const result = await ai.generate({
      prompt: `Generate code for: ${input.taskDescription}\n\nContext: ${input.context}`,
    });
    
    return result.text;
  }
);

export const critiqueCode = ai.defineFlow(
  {
    name: 'critiqueCode',
    inputSchema: z.object({
      code: z.string(),
      context: z.string(),
    }),
    outputSchema: z.object({
        verdict: z.string(),
        issuesFound: z.string(),
    }),
  },
  async (input: { code: string; context: string }) => {
    console.log('Critique running...');
    
    // Use the configured AI instance
    const result = await ai.generate({
      prompt: `Critique this code:\n\n${input.code}\n\nContext: ${input.context}\n\nProvide verdict (PASS/FAIL) and issues found.`,
    });
    
    // Parse the response (simplified - you'd want better parsing)
    return {
        verdict: "PASS", // You'd extract this from result.text
        issuesFound: result.text
    };
  }
);

// Flow server can be started separately if needed
// You can run: genkit start -- tsx src/ai/genkit.ts