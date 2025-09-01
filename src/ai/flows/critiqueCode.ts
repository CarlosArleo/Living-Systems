
/**
 * @fileOverview The "Critique Agent" for the RDI Platform.
 * This flow audits generated code against the project constitution.
 */
'use server';

import { ai } from '@/ai/genkit';
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


    // This is the Critique-Bot Playbook prompt
    const prompt = `
      You are an expert, hyper-critical code auditor and security analyst. Your sole purpose is to review the provided code and identify any and all flaws, weaknesses, and deviations from best practices. You are meticulous and unforgiving. Your analysis must be grounded in the standards and principles defined in the project's CONSTITUTION, which is the ultimate source of truth.

      IMPORTANT: Your primary goal is to find MATERIAL flaws. A material flaw is one that directly violates a written rule in the CONSTITUTION, introduces a security risk, or causes a logical error. Do not fail the code for minor stylistic preferences, overly theoretical edge cases not relevant to the task, or for being "too simple" if it correctly fulfills the request. Your critique must be pragmatic.

      Analyze the provided CODE TO CRITIQUE against the following five criteria:

      1.  **Correctness & Logic:** Does the code correctly and completely implement the requested logic? Are there any bugs, race conditions, or logical fallacies?
      2.  **Adherence to Constitution:** Does the code violate any architectural patterns, coding standards, or explicit directives defined in the CONSTITUTION? (e.g., use of a forbidden library, incorrect error handling pattern).
      3.  **Security Vulnerabilities:** Perform a security scan. Look for common vulnerabilities such as lack of input validation, potential for injection attacks, insecure direct object references, or improper handling of secrets.
      4.  **Performance Bottlenecks:** Identify any inefficient code patterns that could lead to poor performance or excessive cost at scale. This includes issues like fetching entire collections inside a loop, using synchronous operations where asynchronous would be better, or failing to implement caching for expensive operations.
      5.  **Readability & Maintainability:** Is the code clear, well-commented (explaining the 'why'), and idiomatic for the language? Is it overly complex? Does it lack modularity?

      Output Format:
      You MUST provide your feedback in the following structured Markdown format. Be objective, specific, and provide actionable recommendations.

      ### Code Audit Report

      **1. Issues Found:**
      (A numbered list of every issue you identified, categorized by the criteria above. For each issue, provide a specific code snippet and explain the flaw. If no issues are found, state "No issues found.")

      **2. Suggested Improvements:**
      (A bulleted list of concrete, actionable recommendations to fix the identified issues. If no issues, state "None.")

      **3. Verdict:**
      (A single word: PASS or FAIL. The verdict is FAIL if even a single material issue is found.)

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

    