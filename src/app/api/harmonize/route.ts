
/**
 * @fileOverview API route to trigger the data harmonization flow.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { harmonizeDataOnUpload } from '@/ai/flows/harmonize';

// This schema validates the incoming request from the client.
// It now expects a storagePath instead of a fileDataUri.
const HarmonizeApiInputSchema = z.object({
  placeId: z.string().min(1, 'placeId is required.'),
  capitalCategory: z.enum(['Natural', 'Human', 'Social', 'Manufactured', 'Financial']),
  storagePath: z.string().min(1, 'storagePath is required.'),
  sourceFile: z.string().min(1, 'sourceFile is required.'),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const validation = HarmonizeApiInputSchema.safeParse(json);

    if (!validation.success) {
      console.error('[Harmonize API] Invalid request body:', validation.error.issues);
      return NextResponse.json(
        { error: 'Invalid request body', issues: validation.error.issues },
        { status: 400 }
      );
    }
    
    const result = await harmonizeDataOnUpload(validation.data);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Harmonize API] An unexpected error occurred:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON provided in request body.' }, { status: 400 });
    }
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json(
      { error: 'Failed to process the harmonization request.', details: errorMessage },
      { status: 500 }
    );
  }
}
