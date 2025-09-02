/**
 * @fileOverview The "Ecosystem" Flow (The New Orchestrator).
 * This flow composes the organelles into a self-regulating, regenerative loop.
 */
'use server';

import { z } from 'zod';
import { generateFlow } from './generate';
import { critiqueFlow } from './critique';
import { correctFlow } from './correct';
import { ai } from '../genkit';
import * as fs from 'fs/promises';
import * as path from 'path';

const OrchestratorInputSchema = z.object({
  initialPrompt: z.string().describe('The high-level task description or Master Prompt.'),
});
type OrchestratorInput = z.infer<typeof OrchestratorInputSchema>;

export const orchestratorFlow = ai.defineFlow(
  {
    name: 'orchestratorFlow',
    inputSchema: OrchestratorInputSchema,
    outputSchema: z.object({
      finalCode: z.string().describe('The final, perfected code that has achieved equilibrium.'),
    }),
  },
  async (input: OrchestratorInput) => {
    console.log('[orchestratorFlow] Starting regenerative loop...');
    
    const projectConstitution = await fs.readFile(path.join(process.cwd(), 'CONTEXT.md'), 'utf-8');
    
    let { code } = await generateFlow({ prompt: input.initialPrompt });
    
    const maxAttempts = 3; // A natural limit for sustainability
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[orchestratorFlow] Loop #${attempt}: Sensing for dissonance...`);
      const { feedback, pass } = await critiqueFlow({ code, projectConstitution });

      if (pass) {
        console.log('[orchestratorFlow] ✅ Equilibrium reached. Loop complete.');
        return { finalCode: code }; // Harmony restored
      }

      console.log(`[orchestratorFlow] ❌ Dissonance detected. Initiating restoration...`);
      const { correctedCode } = await correctFlow({ code, feedback });
      code = correctedCode;
    }

    // If the loop completes without reaching equilibrium, it's like apoptosis
    throw new Error(`[orchestratorFlow] Loop did not converge to equilibrium after ${maxAttempts} attempts.`);
  }
);
