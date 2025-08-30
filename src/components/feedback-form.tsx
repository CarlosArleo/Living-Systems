/**
 * @fileoverview A Client Component for submitting stakeholder feedback.
 * This component now makes a secure, authenticated API call to the backend.
 */
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

type FeedbackFormProps = {
  placeId: string;
};

export function FeedbackForm({ placeId }: FeedbackFormProps) {
  const [comment, setComment] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const textareaId = React.useId();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) {
        toast({
            variant: "destructive",
            title: "Comment cannot be empty.",
        });
        return;
    }
    
    setIsSubmitting(true);

    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be logged in to submit feedback.');
      }
      
      const token = await user.getIdToken();

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          placeId: placeId,
          comment: comment,
          authorName: user.displayName || 'Anonymous User',
          authorAvatarUrl: user.photoURL || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to submit feedback.');
      }

      setComment('');
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your contribution to the story of this place.",
      });

    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold">Provide Feedback</h3>
        <div className="grid w-full gap-2">
            <Label htmlFor={textareaId}>Your Comment</Label>
            <Textarea 
                id={textareaId}
                placeholder="Share your perspective, add context, or suggest a correction..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                disabled={isSubmitting}
                aria-describedby="feedback-comment-description"
            />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || !comment.trim()}>
            {isSubmitting ? (
                <LoaderCircle className="animate-spin" />
            ) : (
                <Send />
            )}
            <span className="ml-2">Submit Feedback</span>
        </Button>
    </form>
  );
}
