'use client';
import { Moon, Sun } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTheme } from '../../providers/theme-provider';

export default function ThemeSwitchIcon() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      aria-label="Switch theme"
      className="group flex items-center justify-center rounded-full p-2 outline-none hover:bg-accent focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      tabIndex={0}
      type="button"
    >
      {resolvedTheme === 'dark' ? (
        <Sun
          className="size-5 text-muted-foreground transition-colors group-hover:text-foreground"
          weight="bold"
        />
      ) : (
        <Moon
          className="size-5 text-muted-foreground transition-colors group-hover:text-foreground"
          weight="bold"
        />
      )}
    </button>
  );
}
