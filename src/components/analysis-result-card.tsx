/**
 * @fileoverview A compact card to display the result of a single document analysis.
 */
'use client';

import * as React from 'react';
import { CheckCircle2, LoaderCircle, AlertCircle, FileText } from 'lucide-react';
import { type DocumentData } from 'firebase/firestore';

const statusIcons: { [key: string]: React.ReactNode } = {
  analyzed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  processing: <LoaderCircle className="h-4 w-4 animate-spin text-blue-500" />,
  failed: <AlertCircle className="h-4 w-4 text-red-500" />,
  uploaded: <FileText className="h-4 w-4 text-gray-500" />,
};

type AnalysisResultCardProps = {
  document: DocumentData;
};

export function AnalysisResultCard({ document }: AnalysisResultCardProps) {
  const { sourceFile, status, overallSummary } = document;

  return (
    <div className="group relative w-full border border-border/50 bg-background/30 hover:border-border cursor-pointer rounded-none">
      <div className="flex items-stretch gap-2 p-2 text-left min-w-0">
        <div className="w-1 self-stretch bg-purple-500 rounded-none"></div>
        <div className="flex-1 flex flex-col min-w-0">
          <span className="font-body truncate text-xs text-foreground font-medium flex items-center gap-2">
            {statusIcons[status] || <FileText className="h-4 w-4 text-gray-500" />}
            {sourceFile || 'Untitled Document'}
          </span>
          <p className="text-[11px] text-muted-foreground/80 mt-1 pl-1 line-clamp-2">
            {overallSummary || `Status: ${status}`}
          </p>
        </div>
      </div>
    </div>
  );
}
