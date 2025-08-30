import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const myFirstFlow = ai.defineFlow(
  {
    name: 'myFirstFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (prompt) => {
    // For now, we'll just parrot back the input.
    // In a real app, you would call a model here.
    return `You sent me this: ${prompt}. It works!`;
  }
);
