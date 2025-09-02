// genkit.config.ts

import { configureGenkit } from '@genkit-ai/core';
import { firebase } from '@genkit-ai/firebase/plugin'; // Modern import path
import { googleAI } from '@genkit-ai/googleai';
import { dotprompt } from '@genkit-ai/dotprompt';
import { defineTool } from '@genkit-ai/tool';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

export default configureGenkit({
  plugins: [
    googleAI(),
    firebase(), // In modern Genkit, this often auto-configures from the environment
    dotprompt({ dir: './src/ai/prompts' }),
  ],
  // Define the directories where flows will be automatically discovered.
  flowPath: 'src/ai/flows',
  // Define tools available to all flows
  tools: [
    defineTool(
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
    ),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
  flowStateStore: 'firebase',
  traceStore: 'firebase',
});