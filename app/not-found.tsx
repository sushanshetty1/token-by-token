import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[640px] px-6 py-24 text-center">
      <h1 className="font-display text-[2rem] font-bold text-ink">This page is not on the path</h1>
      <p className="mt-2 text-ink-2">The link may be old. The course map has every day and lesson.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Go to the course map
      </Link>
    </main>
  );
}
