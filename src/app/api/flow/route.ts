import { myFirstFlow } from '@/ai/flows/simple';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json(
      { error: 'Prompt is required and must be a string' },
      { status: 400 }
    );
  }

  try {
    const result = await myFirstFlow(prompt);
    return NextResponse.json({ result });
  } catch (error: unknown) {
    console.error("Error running flow:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
      { error: `An error occurred while processing your request. ${errorMessage}` },
      { status: 500 }
    );
  }
}
