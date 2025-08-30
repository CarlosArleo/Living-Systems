
import { queryRdiKnowledgeBase } from '@/ai/flows/rag-flow';
import { type RagQueryInput, RagQueryInputSchema } from '@/ai/flows/knowledge-schemas';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// The API input now also requires a placeId to scope the search.
const RagApiInputSchema = z.object({
  placeId: z.string().min(1, 'placeId cannot be empty.'),
  query: z.string().min(1, 'Query cannot be empty.'),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const validation = RagApiInputSchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: validation.error.issues },
        { status: 400 }
      );
    }
    
    // Pass the validated data directly to the flow.
    const ragInput: RagQueryInput = validation.data;

    try {
        const result = await queryRdiKnowledgeBase(ragInput);
        return NextResponse.json(result);
    } catch (flowError: unknown) {
        console.error('[RAG API Route] Genkit flow execution failed:', flowError);
        const errorMessage =
        flowError instanceof Error ? flowError.message : 'An unexpected error occurred in the RAG flow.';
        return NextResponse.json(
            { error: 'Failed to query the knowledge base.', details: errorMessage },
            { status: 500 }
        );
    }

  } catch (error) {
    console.error('[RAG API Route] Error:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON provided in request body.' }, { status: 400 });
    }
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json(
      { error: 'Failed to process your request.', details: errorMessage },
      { status: 500 }
    );
  }
}
