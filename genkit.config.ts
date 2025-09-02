// genkit.config.ts

import { configure } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { dotprompt, Dotprompt } from '@genkit-ai/dotprompt';
import { defineTool } from 'genkit/tool';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// Define the constitutionTool
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

// This is the main configuration for the entire AI system.
configure({
  plugins: [
    googleAI(),
    firebase({
      flowStateStore: 'firebase',
      traceStore: 'firebase',
    }),
    dotprompt({ dir: './src/ai/prompts' }),
  ],
  // All flows will be automatically discovered from this directory.
  flowPath: 'src/ai/flows',
  tools: [constitutionTool],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});