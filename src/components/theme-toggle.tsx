"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
        <span className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-300"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      <Sun
        className={`h-4 w-4 transition-all duration-500 ${
          isDark ? "rotate-90 scale-0 absolute" : "rotate-0 scale-100"
        }`}
      />
      <Moon
        className={`h-4 w-4 transition-all duration-500 ${
          isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0 absolute"
        }`}
      />
    </Button>
  );
}
