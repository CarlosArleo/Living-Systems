/**
 * @fileoverview The main container for displaying all details of a selected Place.
 */
'use client';

import * as React from 'react';
import { type DocumentData } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
import { PlaceSummaryCard } from './place-summary-card';
import { AnalysisResultCard } from './analysis-result-card';
import { Separator } from './ui/separator';

type PlaceDetailViewProps = {
  placeData: {
    placeInfo: DocumentData;
    analyzedDocuments: DocumentData[];
  };
  onBack: () => void;
};

export function PlaceDetailView({ placeData, onBack }: PlaceDetailViewProps) {
  const { placeInfo, analyzedDocuments } = placeData;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-3 border-b border-border/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-7 px-2 font-body text-xs rounded-none"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Places
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          <PlaceSummaryCard
            name={placeInfo.name}
            storyOfPlace={placeInfo.storyOfPlace}
          />
          <Separator className="bg-border/20" />
          <div>
            <h4 className="mb-2 uppercase text-xs text-muted-foreground tracking-wider font-semibold">
              Analyzed Documents
            </h4>
            <div className="space-y-2">
              {analyzedDocuments.length > 0 ? (
                analyzedDocuments.map((doc) => (
                  <AnalysisResultCard key={doc.id} document={doc} />
                ))
              ) : (
                <div className="text-center text-xs text-muted-foreground py-4">
                  <p>No analyzed documents for this place yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
