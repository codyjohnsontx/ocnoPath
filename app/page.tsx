import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Squiggle } from "@/components/squiggle";

const steps = [
  {
    n: "1",
    surface: "bg-lilac",
    badge: "bg-grape text-white",
    title: "Enter basic context",
    text: "Share cancer type, age group, and location. Never your records or personal identifiers."
  },
  {
    n: "2",
    surface: "bg-cream",
    badge: "bg-amber text-amberInk",
    title: "Search official sources",
    text: "We pull public ClinicalTrials.gov records into a friendly, readable flow."
  },
  {
    n: "3",
    surface: "bg-lilac",
    badge: "bg-grape text-white",
    title: "Read plain-English notes",
    text: "Cautious explanations, what's missing, and the questions worth asking."
  }
];

const capabilities = [
  "Plain-English summaries",
  "Public, source-linked records",
  "Questions for your care team",
  "Saved privately in your browser"
];

export default function Home() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[1120px]">
        {/* Hero */}
        <section className="relative grid animate-[fadeUp_700ms_ease-out] items-center gap-11 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
          <div className="pointer-events-none absolute -right-10 -top-[70px] hidden h-[280px] w-[280px] rounded-full bg-[#e7dffb] lg:block" />
          <div className="relative">
            <h1 className="text-[44px] font-extrabold leading-[1.08] tracking-[-0.02em] sm:text-[54px] lg:text-[60px]">
              A calmer <Squiggle>path</Squiggle> through cancer trials.
            </h1>
            <p className="mt-7 max-w-[440px] text-[17.5px] leading-[1.62] text-muted">
              OncoPath makes public trial information easy to understand and
              helps you walk into your next appointment with the right questions
              for your care team.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-full bg-grape px-7 py-[15px] text-[15.5px] font-bold text-white shadow-btn transition hover:bg-grapeDark"
              >
                Start a trial search
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/discussion-sheet"
                className="text-[15px] font-bold text-grape hover:underline"
              >
                Discussion sheet
              </Link>
            </div>
          </div>

          <div className="relative grid gap-4">
            <div className="rounded-[22px] bg-grape p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#cdbdf7]">
                Plain-English
              </p>
              <h3 className="mb-1.5 mt-2 text-xl font-extrabold">
                Notes you can read
              </h3>
              <p className="text-sm leading-[1.55] text-[#e4dcf8]">
                Cautious explanations of what the record says, and what it
                doesn&apos;t.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] bg-amber p-[22px] text-amberInk">
                <h3 className="mb-1.5 text-[17px] font-extrabold">
                  Source-linked
                </h3>
                <p className="text-[13.5px] leading-[1.5]">
                  Every note ties back to the official record.
                </p>
              </div>
              <div className="rounded-[22px] border border-[#eae3f7] bg-white p-[22px]">
                <h3 className="mb-1.5 text-[17px] font-extrabold text-ink">
                  Questions to ask
                </h3>
                <p className="text-[13.5px] leading-[1.5] text-muted">
                  Walk in ready to talk it through.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-4 rounded-[34px] bg-white px-5 py-14 sm:px-10 sm:py-[60px]">
          <div className="mb-11 text-center">
            <p className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.14em] text-amber">
              How it works
            </p>
            <h2 className="text-[32px] font-extrabold tracking-[-0.02em] sm:text-[40px]">
              Three <Squiggle>clear</Squiggle> steps.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.n}
                className={`rounded-3xl p-[30px] ${step.surface}`}
              >
                <span
                  className={`flex h-[54px] w-[54px] items-center justify-center rounded-[18px] text-[22px] font-extrabold ${step.badge}`}
                >
                  {step.n}
                </span>
                <h3 className="mb-2 mt-5 text-[21px] font-extrabold">
                  {step.title}
                </h3>
                <p className="text-[15px] leading-[1.6] text-muted">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* What OncoPath does */}
        <section className="px-4 py-11 sm:pb-14">
          <div className="relative overflow-hidden rounded-[30px] bg-grape px-8 py-12 text-white sm:px-12 sm:py-[52px]">
            <div className="pointer-events-none absolute -right-[30px] -top-10 h-[220px] w-[220px] rounded-full bg-amber/25" />
            <div className="relative grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="mb-2.5 text-[12.5px] font-bold uppercase tracking-[0.16em] text-[#d6c8f7]">
                  What OncoPath does
                </p>
                <h2 className="text-[26px] font-extrabold leading-[1.16] sm:text-[32px]">
                  Here to connect you with trial options you might not have found
                  on your own.
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {capabilities.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl bg-white/[.14] px-[17px] py-[15px] text-[14.5px] font-semibold"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
