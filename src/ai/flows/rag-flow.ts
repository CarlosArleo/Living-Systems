// In your src/ai/flows/rag-flow.ts file, make sure you have:

import { Document } from 'genkit';
import { ai } from '../../genkit.config'; // Adjust path - should go up two levels

// Make sure you export the function that route.ts is trying to import
export const queryRdiKnowledgeBase = ai.defineFlow(
  {
    name: 'queryRdiKnowledgeBase',
    inputSchema: /* your input schema */,
    outputSchema: /* your output schema */,
  },
  async (query: string) => { // Add explicit type annotation
    // Your flow logic here
    const docs = await ai.retrieve({
      // your retrieval logic
    });
    
    // return your result
    return docs;
  }
);

// Alternative: if the function has a different name, either:
// 1. Rename it to queryRdiKnowledgeBase, or
// 2. Update the import in route.ts to match the actual export name