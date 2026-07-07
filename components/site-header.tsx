"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/discussion-sheet", label: "Discussion sheet" }
];

export function SiteHeader() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-lav/[.86] backdrop-blur-[10px]">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-grape text-base font-extrabold text-white">
            O
          </span>
          <span>
            Onco
            <span className="relative italic text-grape">
              path
              <svg
                viewBox="0 0 120 14"
                fill="none"
                aria-hidden="true"
                preserveAspectRatio="none"
                className="pointer-events-none absolute -bottom-[3px] left-0 h-[6px] w-full"
              >
                <path
                  d="M4 9C34 3 86 3 116 7"
                  stroke="#f5b73d"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1.5 rounded-full bg-white p-1.5 shadow-nav sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-[18px] py-2 text-sm font-semibold transition ${
                isActive(item.href)
                  ? "bg-grape text-white"
                  : "text-[#4a4560] hover:text-grape"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-full bg-grape px-5 py-2.5 text-sm font-bold text-white transition hover:bg-grapeDark"
        >
          Start a search
          <ArrowRight size={16} />
        </Link>
      </div>
    </header>
  );
}
