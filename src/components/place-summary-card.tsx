/**
 * @fileoverview A stateless card component to display the high-level summary of a Place.
 */
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from './ui/scroll-area';

type PlaceSummaryCardProps = {
  name: string;
  storyOfPlace?: string;
};

export function PlaceSummaryCard({ name, storyOfPlace }: PlaceSummaryCardProps) {
  return (
    <Card className="bg-card/30 border-border/30 rounded-none shadow-none">
      <CardHeader className="p-3">
        <CardTitle className="font-headline text-lg">{name}</CardTitle>
        <CardDescription className="text-xs">
          Synthesized Story & Analysis Overview
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ScrollArea className="h-24">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap font-body pr-2">
            {storyOfPlace || 'No story has been generated for this place yet.'}
            </p>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
