// genkit.config.ts

import { configure } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { dotprompt } from '@genkit-ai/dotprompt';
import { firebase } from '@genkit-ai/firebase'; // Assuming this is needed for stores
import { defineTool } from 'genkit/tool';
import * as fs from 'fs';
import * as path from 'path';

// This is the "Genetic Core" - the single source of truth for our constitution.
// By defining it as a tool, we make it an intrinsic, callable part of the ecosystem.
const constitutionTool = defineTool(
  {
    name: 'applyConstitution',
    description: 'Retrieves and provides the full text of the Project Constitution (CONTEXT.md) to an agent, ensuring all actions are governed by its principles.',
    inputSchema: z.void(), // No input needed
    outputSchema: z.string(),
  },
  async () => {
    // Use a robust path to find CONTEXT.md from the project root.
    const constitutionPath = path.join(process.cwd(), 'CONTEXT.md');
    return fs.readFileSync(constitutionPath, 'utf-8');
  }
);

// This is the main configuration for our "Living System."
configure({
  plugins: [
    googleAI(),
    firebase({
      flowStateStore: 'firebase',
      traceStore: 'firebase',
    }),
    dotprompt({ dir: './src/ai/prompts' }),
  ],
  // Define the directories where our "organelles" (flows) live.
  flows: [
    // We will add our generate, critique, and correct flows here later.
  ],
  // Make the "DNA" available to all parts of the system.
  tools: [constitutionTool],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});