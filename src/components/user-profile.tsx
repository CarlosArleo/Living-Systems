/**
 * @fileoverview A component to display the current user's profile information.
 * This component fetches user data from Firestore and displays it in a clean card format.
 * It also includes a button for signing out.
 */
'use client';

import * as React from 'react';
import { getAuth, signOut, type User } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoaderCircle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

type UserProfileProps = {
  user: User;
};

export function UserProfile({ user }: UserProfileProps) {
  const { toast } = useToast();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(getAuth(app));
      toast({ title: 'Signed Out', description: 'You have been successfully signed out.' });
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({ variant: 'destructive', title: 'Sign Out Failed' });
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="text-center items-center">
        <Avatar className="h-16 w-16 mb-2">
          <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
          <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <CardTitle>{user.displayName}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSignOut} variant="ghost" className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </CardContent>
    </Card>
  );
}
