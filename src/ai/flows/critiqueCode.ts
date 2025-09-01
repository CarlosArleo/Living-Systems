/**
 * @fileOverview The "Critique Agent" for the RDI Platform.
 * This flow audits generated code against the project constitution.
 */
'use server';

import { ai } from '../genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

const CritiqueInputSchema = z.object({
  codeToCritique: z.string().describe('The generated code that needs to be audited.'),
  projectConstitution: z.string().describe('The full content of the CONTEXT.md file.'),
});

type CritiqueInput = z.infer<typeof CritiqueInputSchema>;

/**
 * A Genkit flow that acts as a meticulous code auditor.
 * It analyzes code for correctness, security, performance, and adherence to project standards.
 */
export const critiqueCode = ai.defineFlow(
  {
    name: 'critiqueCode',
    inputSchema: CritiqueInputSchema,
    outputSchema: z.string().describe('A structured Markdown report of the audit findings.'),
  },
  async ({ codeToCritique, projectConstitution }: CritiqueInput) => {
    // Add a guard clause to handle empty or whitespace-only code input.
    if (!codeToCritique || codeToCritique.trim() === '') {
      return `
### Code Audit Report

**1. Material Issues Found:**
- No code was provided to critique.

**2. Suggested Improvements:**
- Please provide the code that needs to be audited.

**3. Verdict:**
FAIL
      `;
    }

    // FIX #4: More pragmatic critique prompt
    const critiquePrompt = `
      You are an expert, hyper-critical but pragmatic code auditor and security analyst. Your sole purpose is to review the provided code and identify any and all material flaws.

      CRITICAL DIRECTIVE: Your goal is to help the system ship high-quality, secure code, NOT to achieve theoretical perfection.

      A material flaw is one that:
      1.  Directly violates a CRITICAL or non-negotiable rule written in the CONSTITUTION.
      2.  Introduces a clear and exploitable security vulnerability.
      3.  Causes a fatal logical error that will prevent the code from compiling or running.

      You MUST IGNORE minor issues or stylistic preferences. If the code is simple but correctly and securely fulfills the request, it MUST PASS.

      Analyze the provided CODE TO CRITIQUE against the CONSTITUTION.

      Output Format:
      You MUST provide your feedback in the following structured Markdown format.

      ### Code Audit Report

      **1. Material Issues Found:**
      (A numbered list of every material issue you identified. If none, you MUST state "No material issues found.")

      **2. Suggested Improvements:**
      (A bulleted list of concrete recommendations to fix the identified issues. If no issues, state "None.")

      **3. Verdict:**
      (A single word: PASS or FAIL. The verdict is FAIL only if a material issue is found.)

      ---
      CONSTITUTION:
      ${projectConstitution}
      ---
      CODE TO CRITIQUE:
      ${codeToCritique}
      ---
    `;

    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-pro'),
      prompt: critiquePrompt,
      output: { format: 'text' },
      config: { temperature: 0.0 }, // Zero temperature for objective, fact-based critique
    });

    return llmResponse.text;
  }
);
