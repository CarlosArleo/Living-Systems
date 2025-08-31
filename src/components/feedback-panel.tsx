
'use client';

import * as React from 'react';
import { MessageSquare, Send, LoaderCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getFirestore, collection, onSnapshot, query, orderBy, Timestamp, type DocumentData } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { formatDistanceToNow } from 'date-fns';

type Feedback = {
  id: string;
  authorName: string;
  comment: string;
  createdAt: Timestamp;
};

type FeedbackPanelProps = {
  place: DocumentData | null;
  user: User | null;
};

export function FeedbackPanel({ place, user }: FeedbackPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [feedbackList, setFeedbackList] = React.useState<Feedback[]>([]);
  const [newComment, setNewComment] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (!place?.id) {
      setFeedbackList([]);
      return;
    }
    const db = getFirestore(app);
    const feedbackQuery = query(
      collection(db, 'places', place.id, 'feedback'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      const feedbackData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Feedback));
      setFeedbackList(feedbackData);
    }, (error) => {
      console.error("Error fetching feedback:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch feedback.' });
    });

    return () => unsubscribe();
  }, [place, toast]);

  const handleSubmitFeedback = async () => {
    if (!place || !user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
        const token = await user.getIdToken();
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                placeId: place.id,
                comment: newComment,
                authorName: user.displayName || 'Anonymous',
                authorAvatarUrl: user.photoURL || '',
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to submit feedback.');
        }

        toast({ title: 'Feedback Submitted', description: 'Thank you for your contribution!' });
        setNewComment('');
    } catch (error) {
        console.error('Error submitting feedback:', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ variant: 'destructive', title: 'Submission Failed', description: errorMessage });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!place) return null;

  return (
    <Card className="w-80 border-border/20 bg-background/50 shadow-2xl backdrop-blur-lg rounded-none">
      <CardHeader className="p-3 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="font-headline text-base">Stakeholder Feedback</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <CardDescription className="text-xs">
          Provide context and feedback on the analysis.
        </CardDescription>
      </CardHeader>
      {isOpen && (
        <CardContent className="p-3 pt-0">
          <ScrollArea className="h-40 mb-3">
            <div className="space-y-3 pr-2">
              {feedbackList.length > 0 ? (
                feedbackList.map(fb => (
                  <div key={fb.id} className="text-xs p-2 rounded-md bg-background/40 border border-border/30">
                    <p className="font-medium text-foreground/90">{fb.comment}</p>
                    <p className="text-muted-foreground/80 mt-1">
                      – {fb.authorName} ({formatDistanceToNow(fb.createdAt.toDate(), { addSuffix: true })})
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-muted-foreground py-8">
                  No feedback yet for {place.name}.
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add your comment..."
              className="text-xs rounded-none"
              rows={3}
            />
            <Button onClick={handleSubmitFeedback} disabled={isSubmitting || !newComment.trim()} className="w-full rounded-none">
              {isSubmitting ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Send />
              )}
              <span className="ml-2">Submit Feedback</span>
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
