'use client';

import { ArrowLeft, Moon, SignOut, Sun } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useUser } from '@/app/providers/user-provider';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

interface HeaderGoBackProps {
  href?: string;
  showControls?: boolean;
}

export function HeaderGoBack({
  href = '/',
  showControls = true,
}: HeaderGoBackProps) {
  const { theme, setTheme } = useTheme();
  const { signOut } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      toast({ title: 'Logged out', status: 'success' });
    } catch (_e) {
      // console.error('Sign out failed:', e);
      toast({ title: 'Failed to sign out', status: 'error' });
    }
  };

  return (
    <header className="flex items-center justify-between p-4">
      <Link
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-foreground hover:bg-muted"
        href={href}
        prefetch
      >
        <ArrowLeft className="size-5 text-foreground" />
        <span className="ml-2 hidden font-base text-sm sm:inline-block">
          Back to Chat
        </span>
      </Link>
      {showControls && (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            size="icon"
            variant="ghost"
          >
            <Sun className="dark:-rotate-90 h-5 w-5 rotate-0 scale-100 transition-all dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button
            className="flex items-center gap-1 px-2"
            onClick={handleSignOut}
            size="sm"
            variant="ghost"
          >
            <SignOut className="size-5" />
            <span className="text-sm">Log out</span>
          </Button>
        </div>
      )}
    </header>
  );
}
