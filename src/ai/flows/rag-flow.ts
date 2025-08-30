
/**
 * @fileOverview A flow for performing Retrieval-Augmented Generation (RAG)
 *               using a Firestore-based knowledge base scoped to a specific place.
 */
'use server';

import { ai, googleAI } from '../genkit';
import {
  createPlaceSpecificRetriever,
  RagQueryInputSchema,
  RagQueryOutputSchema,
  type RagQueryInput,
  type RagQueryOutput,
} from './knowledge-schemas';

/**
 * The main RAG flow.
 */
const ragQueryFlow = ai.defineFlow(
  {
    name: 'ragQueryFlow',
    inputSchema: RagQueryInputSchema,
    outputSchema: RagQueryOutputSchema,
  },
  async ({ placeId, query }) => {
    console.log(`[ragQueryFlow] Received query: "${query}" for placeId: "${placeId}"`);

    // 1. Create a retriever dynamically scoped to the specific placeId.
    const placeRetriever = createPlaceSpecificRetriever(placeId);

    // 2. Retrieve relevant documents from Firestore using the place-specific retriever.
    console.log(`[ragQueryFlow] Retrieving documents from knowledge base for place: ${placeId}...`);
    const docs = await ai.retrieve({
      retriever: placeRetriever,
      query: query,
      options: { k: 5 }, // Get the top 5 most relevant documents
    });

    // If no documents are found, provide a specific answer.
    if (docs.length === 0) {
      console.log('[ragQueryFlow] No relevant context found for this place.');
      return {
        answer: "I cannot answer this question based on the documents provided for this specific place.",
        context: [],
      };
    }

    const contextChunks = docs.map(doc => doc.content[0].text || '');
    console.log(`[ragQueryFlow] Found ${contextChunks.length} relevant context chunks.`);

    // 3. Augment the prompt with the retrieved context.
    const augmentedPrompt = `
      You are an expert on Regenerative Development.
      Using ONLY the following context, please provide a comprehensive answer to the user's question.
      The context provided is specific to the place being discussed.
      Do not use any external knowledge. If the context does not contain the answer, say "I cannot answer this question based on the provided documents for this place."

      CONTEXT:
      ---
      ${contextChunks.join('\n---\n')}
      ---

      QUESTION:
      ${query}
    `;

    // 4. Generate the final answer using the augmented prompt.
    console.log('[ragQueryFlow] Generating final answer...');
    const llmResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      prompt: augmentedPrompt,
      output: { format: 'text' },
      config: { temperature: 0.1 },
    });

    return {
      answer: llmResponse.text,
      context: contextChunks,
    };
  }
);


/**
 * Exported wrapper function for the RAG flow.
 */
export async function queryRdiKnowledgeBase(
  input: RagQueryInput
): Promise<RagQueryOutput> {
  return ragQueryFlow(input);
}
