
'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrainCircuit, LoaderCircle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';


type Message = {
  role: 'user' | 'assistant';
  content: string;
  context?: string[];
};

export function HolisticInquirySheet({
  isOpen,
  onOpenChange,
  placeId, // Now requires placeId
  placeName,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  placeId: string;
  placeName: string;
}) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!input.trim() || !placeId) {
      toast({
          variant: "destructive",
          title: "Missing Information",
          description: "Cannot perform inquiry without a selected place.",
      });
      return;
    };

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Pass the placeId along with the query to the RAG API
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input, placeId: placeId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An unexpected error occurred.');
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.answer,
        context: result.context,
      };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error('RAG query failed:', error);
      toast({
        variant: "destructive",
        title: "Inquiry Failed",
        description: error instanceof Error ? error.message : "Could not get an answer from the knowledge base.",
      });
       const errorMessage: Message = {
        role: 'assistant',
        content: "Sorry, I encountered an error and couldn't process your request.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Holistic Inquiry
          </SheetTitle>
          <SheetDescription>
            Ask complex questions about {placeName || 'your selected place'}. The AI will retrieve the most relevant information to form an answer.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-sm rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                   {message.role === 'assistant' && message.context && message.context.length > 0 && (
                    <Accordion type="single" collapsible className="w-full mt-2">
                      <AccordionItem value="item-1">
                        <AccordionTrigger className="text-xs">Show Context</AccordionTrigger>
                        <AccordionContent>
                          <ScrollArea className="h-24 mt-2 p-2 border rounded-md bg-background/50">
                            <ul className="space-y-2">
                              {message.context.map((ctx, i) => (
                                <li key={i} className="text-xs text-muted-foreground border-b border-border/50 pb-1">
                                  {ctx}
                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              </div>
            ))}
             {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-sm rounded-lg px-4 py-2 bg-muted flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              placeholder="Ask a cross-capital question..."
              disabled={isLoading || !placeId}
            />
            <Button onClick={handleSendMessage} disabled={isLoading || !input.trim() || !placeId}>
              {isLoading ? <LoaderCircle className="animate-spin" /> : <Send />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
