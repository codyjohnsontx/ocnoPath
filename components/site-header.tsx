"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Squiggle } from "@/components/squiggle";

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
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-grape text-base font-extrabold text-white">
            O
          </span>
          <span>
            Onco<Squiggle>path</Squiggle>
          </span>
        </Link>

        <nav className="order-last flex w-full items-center justify-center gap-1.5 rounded-full bg-white p-1.5 shadow-nav sm:order-none sm:w-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
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
