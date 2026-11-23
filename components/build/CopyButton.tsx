"use client";

import { Check, Clipboard } from "lucide-react";
import { useState } from "react";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`btn btn-ghost shrink-0 !px-2.5 !py-1 !text-[12.5px] ${className}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard can be blocked; the text is still on the page to select */
        }
      }}
    >
      {copied ? <Check size={13} /> : <Clipboard size={13} />} {copied ? "Copied" : label}
    </button>
  );
}
