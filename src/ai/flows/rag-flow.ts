import { Document } from 'genkit';
import { ai } from '../../../genkit.config';
import { z } from 'zod';
import { knowledgeRetriever } from '../knowledge-base';
import { RagQueryInputSchema, RagQueryInput } from './knowledge-schemas';

export const queryRdiKnowledgeBase = ai.defineFlow(
  {
    name: 'queryRdiKnowledgeBase',
    inputSchema: RagQueryInputSchema,
  },
  async (input: RagQueryInput) => {
    const docs = await ai.retrieve({ retriever: knowledgeRetriever, query: input.query });
    return docs;
  }
);
