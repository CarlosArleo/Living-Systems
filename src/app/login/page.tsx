
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, GoogleAuthProvider, signInWithRedirect, onAuthStateChanged, getRedirectResult, User } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const auth = getAuth(app);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/');
      } else {
        // If no user, check for redirect result
        getRedirectResult(auth).catch((error) => {
          // Handle redirect errors if necessary
          console.error("Error getting redirect result:", error);
          toast({
            variant: "destructive",
            title: "Sign-In Failed",
            description: "Could not complete sign-in with Google. Please try again.",
          });
        }).finally(() => {
            setLoading(false);
        });
      }
    });

    return () => unsubscribe();
  }, [auth, router, toast]);

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };


  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Authenticating...</p>
      </div>
    );
  }

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
           <div className="flex items-center gap-2 justify-center mb-4">
            <svg className="h-6 w-6 text-foreground/80" viewBox="0 0 22 15">
              <g transform="translate(11, -3) rotate(45.000000)">
                <rect fill="currentColor" x="0" y="5" width="10" height="10"></rect>
                <rect
                  fill="hsl(var(--foreground))"
                  x="5"
                  y="0"
                  width="10"
                  height="10"
                ></rect>
              </g>
            </svg>
             <CardTitle className="text-xl font-semibold tracking-wider text-foreground/90">
                RDI PLATFORM
              </CardTitle>
          </div>
          <CardDescription>
            Sign in to access the Regenerative Development Intelligence Platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={signInWithGoogle} className="w-full">
            Sign In with Google
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
