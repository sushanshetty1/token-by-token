"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

export const THEME_KEY = "tbt:theme";

/** Runs before paint so the page never flashes the wrong theme. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})();`;

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

const read = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => null);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={flip}
      className="grid h-9 w-9 place-items-center rounded-[10px] border border-rule-strong bg-card text-ink-2 hover:text-ink"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
