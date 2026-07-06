import Link from "next/link";
import { Stethoscope } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-white/92 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white">
            <Stethoscope size={18} />
          </span>
          OncoPath
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium text-slateblue">
          <Link className="hidden px-3 py-2 hover:text-ink sm:inline-block" href="/search">
            Search
          </Link>
          <Link
            className="rounded-md bg-action px-3 py-2 font-semibold text-white transition hover:bg-teal-800"
            href="/search"
          >
            Start search
          </Link>
        </nav>
      </div>
    </header>
  );
}
