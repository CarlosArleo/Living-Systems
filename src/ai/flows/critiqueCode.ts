
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

**1. Issues Found:**
- No code was provided to critique.

**2. Suggested Improvements:**
- Please provide the code that needs to be audited.

**3. Verdict:**
FAIL
      `;
    }


    // This is the Critique-Bot Playbook prompt, now tuned for pragmatism.
    const prompt = `
      You are an expert, hyper-critical but pragmatic code auditor and security analyst. Your sole purpose is to review the provided code and identify any and all flaws, weaknesses, and deviations from best practices.

      IMPORTANT: Your primary goal is to find MATERIAL flaws. A material flaw is one that:
      1. Directly violates an explicit rule written in the CONSTITUTION (e.g., using a forbidden library, incorrect error handling pattern).
      2. Introduces a clear security vulnerability (e.g., prompt injection, missing authentication).
      3. Causes a logical error that will prevent the code from functioning as requested.
      
      You must be forgiving of minor stylistic preferences, overly theoretical edge cases not relevant to the task, or code that is "too simple" if it correctly and safely fulfills the request. Your critique must be pragmatic and actionable.

      Analyze the provided CODE TO CRITIQUE against the following five criteria:

      1.  **Correctness & Logic:** Does the code correctly and completely implement the requested logic? Are there any bugs, race conditions, or logical fallacies?
      2.  **Adherence to Constitution:** Does the code violate any architectural patterns, coding standards, or explicit directives defined in the CONSTITUTION? (SPECIAL CHECK: If the code imports from a '.prompt' file, ensure that the corresponding file being created is NOT a TypeScript file.)
      3.  **Security Vulnerabilities:** Perform a security scan. Look for common vulnerabilities such as lack of input validation, potential for injection attacks, insecure direct object references, or improper handling of secrets.
      4.  **Performance Bottlenecks:** Identify any inefficient code patterns that could lead to poor performance or excessive cost at scale.
      5.  **Readability & Maintainability:** Is the code clear, well-commented (explaining the 'why'), and idiomatic for the language?

      Output Format:
      You MUST provide your feedback in the following structured Markdown format. Be objective, specific, and provide actionable recommendations.

      ### Code Audit Report

      **1. Issues Found:**
      (A numbered list of every material issue you identified. If no material issues are found, state "No material issues found.")

      **2. Suggested Improvements:**
      (A bulleted list of concrete, actionable recommendations to fix the identified issues. If no issues, state "None.")

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
      prompt: prompt,
      output: { format: 'text' },
      config: { temperature: 0.0 }, // Zero temperature for objective, fact-based critique
    });

    return llmResponse.text;
  }
);
    
