/**
 * @fileOverview API route to trigger the data distillation flow.
 */
import { NextRequest, NextResponse } from 'next/server';
import { distillCapitalAnalysis, DistillInputSchema } from '@/ai/flows/distill';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const validation = DistillInputSchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: validation.error.issues },
        { status: 400 }
      );
    }
    
    const result = await distillCapitalAnalysis(validation.data);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Distill API Route] An unexpected error occurred:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json(
      { error: 'Failed to distill the analysis.', details: errorMessage },
      { status: 500 }
    );
  }
}
