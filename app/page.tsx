import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  LockKeyhole,
  Search,
  ShieldCheck
} from "lucide-react";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { TrialExample } from "@/components/trial-example";

const problemPoints = [
  "Cancer trial databases are overwhelming.",
  "Eligibility criteria are hard to understand.",
  "Patients often do not know which questions to ask.",
  "Important trial options can be difficult to find."
];

const steps = [
  {
    icon: ClipboardList,
    title: "Enter basic context",
    text: "Share cancer type, age group, location, and optional clinical details without uploading records."
  },
  {
    icon: Search,
    title: "Search official sources",
    text: "Review public ClinicalTrials.gov records through a patient-friendly search flow."
  },
  {
    icon: FileText,
    title: "Read plain-English notes",
    text: "See cautious explanations, possible concerns, missing information, and questions to ask."
  }
];

const safety = [
  "Not medical advice",
  "Does not diagnose",
  "Does not recommend treatment",
  "Does not confirm eligibility",
  "Source-linked explanations",
  "Privacy-first design",
  "No real medical record storage in the MVP"
];

export default function Home() {
  return (
    <main>
      <section className="relative isolate min-h-[calc(100svh-72px)] overflow-hidden border-b border-line bg-ink text-white">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(16,32,40,0.98)_0%,rgba(16,32,40,0.86)_42%,rgba(15,118,110,0.32)_100%)]" />
        <div className="absolute inset-y-0 right-0 w-full opacity-40">
          <div className="h-full w-full bg-[radial-gradient(circle_at_72%_30%,rgba(217,238,232,0.38),transparent_28%),linear-gradient(135deg,transparent_0%,transparent_35%,rgba(244,248,247,0.12)_35%,rgba(244,248,247,0.12)_36%,transparent_36%,transparent_100%)]" />
        </div>
        <div className="relative mx-auto flex min-h-[calc(100svh-72px)] max-w-7xl items-center px-5 py-16 sm:px-8 lg:px-10">
          <div className="max-w-3xl animate-[fadeUp_700ms_ease-out]">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-mint">
              OncoPath
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl">
              Find cancer trials worth discussing with your care team.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100">
              OncoPath helps patients and caregivers understand public cancer
              clinical trial information and prepare better conversations with
              oncology teams.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/search"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-mint focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-ink"
              >
                Start a trial search
                <ArrowRight size={18} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-md border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-ink"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white px-5 py-18 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-action">
              The problem
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
              Trial information is public, but it is rarely easy to use.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {problemPoints.map((point) => (
              <div key={point} className="border-t border-line pt-5">
                <CheckCircle2 className="mb-4 text-action" size={22} />
                <p className="text-lg font-medium leading-7 text-ink">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-b border-line bg-clinical px-5 py-18 sm:px-8 lg:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-action">
              How it works
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
              Search, understand, and prepare for a better conversation.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.title}
                className="group border-t border-slateblue/25 pt-6 transition duration-300 hover:-translate-y-1"
              >
                <step.icon className="text-action" size={26} />
                <h3 className="mt-5 text-xl font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 leading-7 text-slateblue">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white px-5 py-18 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-action">
              Example explanation
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
              Complex trial criteria, translated cautiously.
            </h2>
            <p className="mt-5 leading-7 text-slateblue">
              Each explanation separates what is stated in the public record
              from what remains unknown.
            </p>
          </div>
          <TrialExample />
        </div>
      </section>

      <section className="border-b border-line bg-ink px-5 py-18 text-white sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-mint">
              Trust and safety
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
              Built around clear limits.
            </h2>
            <p className="mt-5 leading-7 text-slate-200">
              OncoPath is designed to support oncology conversations, not
              replace clinical judgment.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {safety.map((item) => (
              <div key={item} className="flex gap-3 border-t border-white/15 pt-4">
                <ShieldCheck className="mt-0.5 shrink-0 text-mint" size={20} />
                <span className="leading-7 text-slate-100">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-action">
              <LockKeyhole size={16} />
              Privacy-first MVP
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-ink">
              Start with public data and browser-local saved searches.
            </h2>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-action px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2"
          >
            Start a trial search
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      <MedicalDisclaimer />
    </main>
  );
}
