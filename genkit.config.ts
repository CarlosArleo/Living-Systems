// genkit.config.ts

import { configure } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { dotprompt } from '@genkit-ai/dotprompt';
import { defineTool } from 'genkit/tool';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// The "Genetic Core" tool
const constitutionTool = defineTool(
  {
    name: 'applyConstitution',
    description: 'Retrieves the full text of the Project Constitution (CONTEXT.md).',
    inputSchema: z.void(),
    outputSchema: z.string(),
  },
  async () => {
    const constitutionPath = path.join(process.cwd(), 'CONTEXT.md');
    return fs.readFileSync(constitutionPath, 'utf-8');
  }
);

// Main configuration
configure({
  plugins: [
    googleAI(),
    firebase({
      flowStateStore: 'firebase',
      traceStore: 'firebase',
    }),
    dotprompt({ dir: './src/ai/prompts' }),
  ],
  flowPath: 'src/ai/flows', // Automatically discover all flows in this directory
  tools: [constitutionTool],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});