'use client';

import * as React from 'react';
import { BookOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type DocumentData } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Button } from './ui/button';

type StoryPanelProps = {
  place: DocumentData | null;
};

export function StoryPanel({ place }: StoryPanelProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const story = place?.storyOfPlace;
  const updatedAt = place?.storyUpdatedAt?.toDate();

  if (!story) {
    return null;
  }

  return (
      <Card className="w-80 border-border/20 bg-background/50 shadow-2xl backdrop-blur-lg rounded-none">
        <CardHeader className="p-3 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="font-headline text-base">{place?.name} Story</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {updatedAt && (
             <CardDescription className="text-xs">
                Last updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
            </CardDescription>
          )}
        </CardHeader>
        {isOpen && (
          <CardContent className="p-3 pt-0">
            <ScrollArea className="h-48">
              <p className="font-body text-sm text-muted-foreground whitespace-pre-wrap p-1">
                {story}
              </p>
            </ScrollArea>
          </CardContent>
        )}
      </Card>
  );
}
