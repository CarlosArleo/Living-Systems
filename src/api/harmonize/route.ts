
/**
 * @fileOverview This API route is deprecated and will be removed.
 * The analysis logic has been moved to the `processUploadedDocument` flow,
 * which is triggered by the `onObjectFinalized` Cloud Function.
 * This file is left as a record of the architectural evolution.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    return NextResponse.json(
        { 
            message: "This endpoint is deprecated. Document processing is now handled automatically by a Cloud Function trigger.",
            status: "deprecated"
        }, 
        { status: 410 } // 410 Gone
    );
}
