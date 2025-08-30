
'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { type DocumentData } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';
import {
  Leaf,
  Users,
  HeartHandshake,
  Building,
  Landmark,
  FileText,
  LoaderCircle,
  MessageSquareQuote,
  ListTree,
  FileJson,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

type DocumentDetailSheetProps = {
  document: DocumentData | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const capitalIcons: Record<string, React.ReactNode> = {
  naturalCapital: <Leaf className="h-4 w-4 text-green-500" />,
  humanCapital: <Users className="h-4 w-4 text-blue-500" />,
  socialCapital: <HeartHandshake className="h-4 w-4 text-yellow-500" />,
  manufacturedCapital: <Building className="h-4 w-4 text-red-500" />,
  financialCapital: <Landmark className="h-4 w-4 text-purple-500" />,
};

const capitalNames: Record<string, string> = {
    naturalCapital: "Natural Capital",
    humanCapital: "Human Capital",
    socialCapital: "Social Capital",
    manufacturedCapital: "Manufactured Capital",
    financialCapital: "Financial Capital",
}

export function DocumentDetailSheet({
  document,
  isOpen,
  onOpenChange,
}: DocumentDetailSheetProps) {
  const [analysis, setAnalysis] = React.useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    // When the sheet opens with a new document, reset the state.
    if (isOpen && document) {
      setAnalysis(document.analysis || null);
      setIsAnalyzing(false);
      setError(null);
    }
  }, [isOpen, document]);

  const handleRunAnalysis = async () => {
    if (!document || !document.id || !document.placeId) return;

    setIsAnalyzing(true);
    setError(null);
    toast({ title: 'Starting Analysis...', description: 'The AI is processing the document. This may take a moment.' });

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: document.placeId,
          docId: document.id,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.details || 'Failed to analyze document.');
      }
      setAnalysis(result.analysis);
      toast({ title: 'Analysis Complete', description: 'The Five Capitals analysis has been updated.' });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast({ variant: 'destructive', title: 'Analysis Failed', description: errorMessage });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!document) return null;

  const hasAnalysis = !!analysis;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3 mb-1">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <SheetTitle className="break-words font-headline">{document.sourceFile}</SheetTitle>
            </div>
          <SheetDescription className="text-xs">
            {document.overallSummary || "Document has not been analyzed yet."}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-4">
            {!hasAnalysis ? (
              <div className="text-center py-10 space-y-4 rounded-lg border border-dashed border-border/50">
                <p className="text-sm text-muted-foreground">This document is ready for analysis.</p>
                <Button onClick={handleRunAnalysis} disabled={isAnalyzing}>
                  {isAnalyzing && <LoaderCircle className="h-4 w-4 animate-spin mr-2" />}
                  {isAnalyzing ? 'Analyzing...' : 'Run Five Capitals Analysis'}
                </Button>
                {error && <p className="text-xs text-destructive mt-2 px-4">{error}</p>}
              </div>
            ) : (
               <Accordion type="multiple" className="w-full space-y-2">
                {Object.entries(analysis).filter(([, value]:[string, any]) => value?.isPresent).map(([key, value]: [string, any]) => (
                   <Card key={key} className="bg-card/60 overflow-hidden">
                      <AccordionItem value={key} className="border-0">
                        <AccordionTrigger className="p-3 text-sm font-semibold hover:no-underline" disabled={!value.isPresent}>
                          <div className="flex items-center gap-2">
                            {capitalIcons[key] || <Leaf />}
                            {capitalNames[key] || key}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0 text-sm space-y-4">
                           <div className='space-y-2'>
                                <div className='flex items-center gap-2 text-xs uppercase text-muted-foreground font-semibold tracking-wider'>
                                    <MessageSquareQuote className="h-3 w-3"/>
                                    <span>Qualitative Summary</span>
                                </div>
                                <p className="italic text-foreground/80">{value.summary}</p>
                           </div>
                            <Separator/>
                             <div className='space-y-2'>
                                <div className='flex items-center gap-2 text-xs uppercase text-muted-foreground font-semibold tracking-wider'>
                                    <ListTree className="h-3 w-3"/>
                                    <span>Key Data Points</span>
                                </div>
                                {value.keyDataPoints && value.keyDataPoints.length > 0 ? (
                                    <ul className="list-disc space-y-1.5 pl-4">
                                    {value.keyDataPoints.map((point: string, index: number) => <li key={index}>{point}</li>)}
                                    </ul>
                                ) : <p className='text-xs italic text-muted-foreground'>No specific data points extracted.</p>}
                           </div>
                           <Separator/>
                            <div className='space-y-2'>
                                <div className='flex items-center gap-2 text-xs uppercase text-muted-foreground font-semibold tracking-wider'>
                                    <FileJson className="h-3 w-3"/>
                                    <span>Extracted Content</span>
                                </div>
                                {value.extractedText ? (
                                     <div className="prose prose-sm prose-invert max-w-none text-foreground/80 whitespace-pre-wrap bg-background/30 p-3 border border-border/50 rounded-md">
                                        {value.extractedText}
                                     </div>
                                ) : <p className='text-xs italic text-muted-foreground'>No content extracted for this capital.</p>}
                           </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Card>
                ))}
              </Accordion>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
