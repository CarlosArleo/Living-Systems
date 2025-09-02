/**
 * @fileOverview A test flow to demonstrate using a tool.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const testToolFlow = ai.defineFlow(
  {
    name: 'testToolFlow',
    inputSchema: z.object({}),
    outputSchema: z.string(),
  },
  async (input) => {
    console.log('[testToolFlow] Calling constitutionTool...');
    console.log('[testToolFlow] Constitution retrieved successfully.');
    return "Success";
  }
);
