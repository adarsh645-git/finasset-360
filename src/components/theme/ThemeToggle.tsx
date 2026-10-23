"use client";

import { useState } from "react";
import { themeLabel, themeShortLabel, toggleTheme, type Theme } from "@/lib/theme";

// Flips data-theme on <html> at once and writes the cookie; no server round trip.
export function ThemeToggle({
  theme: initial,
  short = false,
}: {
  theme: Theme;
  short?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>(initial);
  const onClick = () => setTheme(toggleTheme(theme, document));

  if (short) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="h-[34px] rounded-btn border border-line2 bg-transparent px-3 text-[12.5px] text-ink"
      >
        {themeShortLabel(theme)}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[34px] items-center justify-center gap-2 rounded-btn border border-line2 bg-transparent text-[12.5px] text-ink2 hover:bg-hover hover:text-ink"
    >
      <span
        aria-hidden
        className="h-[11px] w-[11px] rounded-full border-[1.5px] border-current"
        style={{ background: "linear-gradient(90deg,currentColor 50%,transparent 50%)" }}
      />
      {themeLabel(theme)}
    </button>
  );
}
