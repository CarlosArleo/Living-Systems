/**
 * @fileOverview The main orchestrator script for the autonomous development cycle.
 * This script now uses specialized agents for generation and correction.
 */
import 'dotenv/config';
'use server';

import { generateCode } from '../src/ai/flows/generateCode';
import { correctCode } from '../src/ai/flows/correctCode';
import { critiqueCode } from '../src/ai/flows/critiqueCode';
import { getRelevantContext } from '../src/ai/knowledge-base';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Sanitizes a string to be safe for use as a filename.
 * @param text The input string.
 * @returns A sanitized string.
 */
function sanitizeForFilename(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50);
}

/**
 * The main function for the Orchestrator Agent.
 * @param taskOrFilePath A high-level task description or a path to an existing file to audit.
 * @param outputFilePath The path to write the final code to.
 */
async function runDevelopmentCycle(
  taskOrFilePath: string,
  outputFilePath?: string
): Promise<void> {
  // --- Journaling Setup ---
  const logDir: string = path.join(process.cwd(), 'logs', 'orchestrator');
  await fs.mkdir(logDir, { recursive: true });
  const timestamp: string = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  const sanitizedTask: string = sanitizeForFilename(taskOrFilePath);
  const logFileName: string = `${timestamp}-${sanitizedTask}.md`;
  const logFilePath: string = path.join(logDir, logFileName);
  const appendToJournal = (content: string): Promise<void> =>
    fs.appendFile(logFilePath, content + '\n\n');
  await appendToJournal(`# Orchestrator Run Log: ${new Date().toLocaleString()}`);

  let initialCode: string | undefined;
  let taskDescription: string;
  const isAuditMode: boolean = await fs
    .stat(taskOrFilePath)
    .then((s) => s.isFile())
    .catch(() => false);
  const projectConstitution: string = await fs.readFile(
    path.join(process.cwd(), 'CONTEXT.md'),
    'utf-8'
  );

  if (isAuditMode) {
    taskDescription = `Audit and correct the following code file: ${taskOrFilePath}`;
    console.log(
      `[Orchestrator] Starting in "Audit & Correct" mode for file: ${taskOrFilePath}`
    );
    initialCode = await fs.readFile(taskOrFilePath, 'utf-8');
    if (!outputFilePath) outputFilePath = taskOrFilePath;
  } else {
    taskDescription = taskOrFilePath;
    console.log(
      `[Orchestrator] Starting in "Generate" mode for task: "${taskDescription}"`
    );
    if (!outputFilePath) {
      console.error(
        '[Orchestrator] FATAL: An output file path must be provided for generation tasks.'
      );
      process.exit(1);
    }
  }

  await appendToJournal(
    `## Task Description\n\n\`\`\`\n${taskDescription}\n\`\`\``
  );

  let currentCode: string | undefined = initialCode;
  let auditReport: string | undefined;
  let verdict: 'PASS' | 'FAIL' = 'FAIL';

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`\n[Orchestrator] Attempt #${attempt}`);
    await appendToJournal(`## Attempt #${attempt}`);

    if (attempt === 1 && !isAuditMode) {
      // --- INITIAL GENERATION ---
      console.log('[Orchestrator] Calling Generator Agent for first draft...');
      const relevantContextChunks: string[] = await getRelevantContext(
        taskDescription
      );
      await appendToJournal(
        `### Retrieved Context (RAG)\n\n${relevantContextChunks
          .map(
            (c: string, i: number) =>
              `**Chunk ${i + 1}:**\n\`\`\`\n${c}\n\`\`\``
          )
          .join('\n\n')}`
      );
      currentCode = await generateCode({
        taskDescription,
        context: relevantContextChunks,
      });
      await appendToJournal(
        `### Generated Code (Attempt #${attempt})\n\n\`\`\`typescript\n${currentCode}\n\`\`\``
      );
    } else if (currentCode && auditReport) {
      // --- CORRECTION ---
      console.log('[Orchestrator] Calling Debugging Agent for correction...');
      currentCode = await correctCode({
        failedCode: currentCode,
        critique: auditReport,
        originalTask: taskDescription,
      });
      await appendToJournal(
        `### Corrected Code (Attempt #${attempt})\n\n\`\`\`typescript\n${currentCode}\n\`\`\``
      );
    }

    if (!currentCode || currentCode.trim() === '') {
      const errorMsg: string =
        '[Orchestrator] Agent returned no code. Aborting.';
      console.error(errorMsg);
      await appendToJournal(
        `## Final Outcome\n\n**STATUS:** ❌ FAIL\n**REASON:** ${errorMsg}`
      );
      return;
    }

    console.log('[Orchestrator] Submitting code for critique...');
    const rawCritiqueReport: string = await critiqueCode({
      codeToCritique: currentCode,
      projectConstitution: projectConstitution,
    });

    await appendToJournal(
      `### Critique Report (Attempt #${attempt})\n\n${rawCritiqueReport}`
    );

    const verdictMatch: RegExpMatchArray | null =
      rawCritiqueReport.match(/(\n|\r\n)3\. Verdict:\s*(\w+)/i);
    verdict =
      verdictMatch && verdictMatch[2].toUpperCase() === 'PASS' ? 'PASS' : 'FAIL';
    auditReport = rawCritiqueReport;

    console.log(`[Orchestrator] Critique Verdict: ${verdict}`);

    if (verdict === 'PASS') {
      console.log('[Orchestrator] ✅ Code has passed the audit!');
      break;
    } else if (attempt < 3) {
      console.log(
        '[Orchestrator] ❌ Code failed audit. Preparing for correction loop...'
      );
    }
  }

  if (verdict === 'PASS' && currentCode) {
    if (!outputFilePath) {
      console.error(
        '[Orchestrator] FATAL: Output file path is missing for a successful run.'
      );
      process.exit(1);
    }
    await appendToJournal(
      `## Final Outcome\n\n**STATUS:** ✅ PASS\n**File Path:** \`${outputFilePath}\``
    );
    await appendToJournal(
      `## Final Code\n\n\`\`\`typescript\n${currentCode}\n\`\`\``
    );

    console.log(
      `[Orchestrator] Writing final, audited code to ${outputFilePath}`
    );
    const outputDir: string = path.dirname(outputFilePath);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputFilePath, currentCode);
    console.log(
      `[Orchestrator] ✅ Development cycle complete. See full log at: ${logFilePath}`
    );
  } else {
    const finalMessage: string = `❌ Failed to produce passing code after 3 attempts.`;
    await appendToJournal(
      `## Final Outcome\n\n**STATUS:** ❌ FAIL\n**REASON:** ${finalMessage}`
    );
    console.error(`\n[Orchestrator] ${finalMessage}`);
    console.log(
      `[Orchestrator] See full log of failed attempts at: ${logFilePath}`
    );
    process.exit(1);
  }
}

// --- Script Execution ---
const taskOrFilePath: string | undefined = process.argv[2];
const outputFilePath: string | undefined = process.argv[3];

if (!taskOrFilePath) {
  console.error('Usage:');
  console.error(
    '  Generate: npx tsx scripts/orchestrator.ts "<task_description>" <output_file_path>'
  );
  console.error(
    '  Audit:    npx tsx scripts/orchestrator.ts <path_to_existing_file> [<output_file_path>]'
  );
  process.exit(1);
}

runDevelopmentCycle(taskOrFilePath, outputFilePath).catch((err: unknown) => {
  console.error('[Orchestrator] A fatal, unhandled exception occurred:', err);
  process.exit(1);
});
