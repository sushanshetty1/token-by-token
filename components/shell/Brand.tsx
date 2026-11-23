import Link from "next/link";

/** A three-cell vector: negative, zero, positive. The product's mark. */
export function BrandMark({ size = 22 }: { size?: number }) {
  const c = size / 3;
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden className="shrink-0">
      <rect x="1" y="1" width="28" height="28" rx="7" fill="var(--ink)" />
      <rect x="5" y="11" width="6" height="8" rx="1.6" fill="var(--neg)" />
      <rect x="12" y="11" width="6" height="8" rx="1.6" fill="var(--cell-zero)" />
      <rect x="19" y="11" width="6" height="8" rx="1.6" fill="var(--pos)" />
      <title>{String(c)}</title>
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="Token by Token, home">
      <BrandMark size={28} />
      <span className="font-display text-[1.15rem] font-bold leading-none tracking-tight text-ink">Token by Token</span>
    </Link>
  );
}
