"use client";
import { Sun, Moon } from "@phosphor-icons/react";
import { useTheme } from "../../providers/theme-provider";

import { useEffect, useState } from "react";

export default function ThemeSwitchIcon() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Switch theme"
      type="button"
      className="group flex items-center justify-center rounded-full p-2 hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded-full outline-none"
      tabIndex={0}
    >
      {theme === "dark" ? (
        <Sun className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" weight="bold" />
      ) : (
        <Moon className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" weight="bold" />
      )}
    </button>
  );
}