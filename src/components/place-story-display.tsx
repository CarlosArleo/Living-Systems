/**
 * @fileoverview A component to display the synthesized "Story of Place".
 * This component is now a client component to handle dynamic data fetching
 * and state management (loading, error). It calls a secure, authenticated
 * API endpoint that enforces our "Enforce Wholeness" directive.
 */
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Lightbulb, BookOpen, LoaderCircle } from 'lucide-react';
import { FeedbackForm } from './feedback-form';
import { useToast } from '@/hooks/use-toast';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

type PlaceStoryDisplayProps = {
  placeId: string | null;
};

// Define a type for the fetched story data
type StoryData = {
  storyOfPlace: string;
  latentPotentials: string[];
};

export function PlaceStoryDisplay({ placeId }: PlaceStoryDisplayProps) {
  const [storyData, setStoryData] = React.useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchStoryData = async () => {
      if (!placeId) {
        setStoryData(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user) {
          throw new Error('Authentication required.');
        }

        const token = await user.getIdToken();
        const response = await fetch(`/api/places/${placeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch place data.');
        }
        
        const data = await response.json();

        // This logic can be expanded to properly extract potentials
        // once the AI summary flow is fully implemented.
        setStoryData({
            storyOfPlace: data.placeInfo?.storyOfPlace || "The story for this place has not been generated yet.",
            latentPotentials: [
                "The abandoned railway corridor could be transformed into a greenway, connecting Natural and Manufactured capitals.",
                "Leverage strong Social Capital for community-led ecological restoration projects, boosting Human Capital through skill development."
            ]
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Error Fetching Story",
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoryData();
  }, [placeId, toast]);

  if (!placeId) {
    return (
        <Card className="w-full">
            <CardHeader>
                 <CardTitle>Select a Place</CardTitle>
                 <CardDescription>Choose a place from the panel to see its story.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  if (isLoading) {
    return (
       <Card className="w-full">
            <CardHeader className="flex flex-row items-center gap-2">
                 <LoaderCircle className="h-5 w-5 animate-spin"/>
                 <CardTitle>Loading Story...</CardTitle>
            </CardHeader>
        </Card>
    )
  }

   if (error) {
    return (
       <Card className="w-full border-destructive">
            <CardHeader>
                 <CardTitle className="text-destructive">Failed to Load Story</CardTitle>
                 <CardDescription className="text-destructive/80">{error}</CardDescription>
            </CardHeader>
        </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <BookOpen className="h-5 w-5" />
            <CardTitle>Story of this Place</CardTitle>
        </div>
        <CardDescription>
          A synthesized narrative based on all available data, revealing the unique character and potential of this place.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-base leading-relaxed text-foreground/90">
          {storyData?.storyOfPlace}
        </p>
        
        <Separator />

        <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-foreground">Latent Potential</h3>
            </div>
            <ul className="space-y-3 list-disc pl-5 text-foreground/80">
                {storyData?.latentPotentials.map((potential, index) => (
                    <li key={index}>{potential}</li>
                ))}
            </ul>
        </div>
        
        <Separator />
        
        {/* Fulfills the "Engineer for Collaboration" directive */}
        <FeedbackForm placeId={placeId} />

      </CardContent>
    </Card>
  );
}
