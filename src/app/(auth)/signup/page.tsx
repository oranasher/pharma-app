'use client';

import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { initializeUser } from '@/lib/user-actions';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { isAdmin } = useUser(); // Check if the currently logged-in user is an admin
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Sign-up failed',
        description: 'Authentication service not available. Please try again later.',
      });
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: displayName,
      });

      await initializeUser(firestore, user, displayName);
      
      await user.getIdToken(true);

      toast({
        title: 'Account created!',
        description: `User ${displayName} has been successfully created.`,
      });

      // Creative Solution: If the current user is an admin, redirect them back to the user list.
      // Otherwise, it's a new user signing up, so send them to their dashboard.
      if (isAdmin) {
        router.push('/dashboard/users');
      } else {
        router.push('/dashboard');
      }

    } catch (error: any) {
      console.error('Error signing up:', error);
      let description = 'There was a problem creating your account. Please try again.';
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            description = 'This email is already in use. Please try signing in.';
            break;
          case 'auth/invalid-email':
            description = 'Please enter a valid email address.';
            break;
          case 'auth/weak-password':
            description = 'The password is too weak. Please choose a stronger password.';
            break;
          default:
             description = error.message;
        }
      }
      toast({
        variant: 'destructive',
        title: 'Sign-up failed',
        description: description,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>Create a New User Account</CardTitle>
          <CardDescription className="pt-1">
            Fill out the form to create a new user for PharmaTask.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="John Doe"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6+ characters"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        {!isAdmin && (
             <CardFooter className="flex justify-center">
                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <a href="/login" className="font-semibold text-primary hover:underline">
                    Sign in
                    </a>
                </p>
            </CardFooter>
        )}
      </Card>
    </main>
  );
}
