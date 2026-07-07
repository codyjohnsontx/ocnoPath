"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, Trash2 } from "lucide-react";
import { clearDiscussionSheet, getDiscussionSheet } from "@/lib/browser-storage";
import { PhaseBadge, StatusBadge } from "@/components/status-badges";
import { formatLocations } from "@/lib/format";
import type { DiscussionSheetState } from "@/lib/types";

export default function DiscussionSheetPage() {
  const [sheet, setSheet] = useState<DiscussionSheetState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSheet(getDiscussionSheet());
    setLoaded(true);
  }, []);

  function clearSheet() {
    clearDiscussionSheet();
    setSheet(getDiscussionSheet());
  }

  const trials = sheet?.trialSnapshots ?? [];

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[900px] animate-[fadeUp_500ms_ease-out] px-5 pb-16 pt-9 sm:px-10">
        <div className="no-print mb-[22px] flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.14em] text-brandAmber">
              Doctor discussion sheet
            </p>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] sm:text-[34px]">
              Print or save as PDF from your browser.
            </h1>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-grape px-5 py-3 text-[14.5px] font-bold text-white transition hover:bg-grapeDark"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              type="button"
              onClick={clearSheet}
              className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-line2 px-5 py-3 text-[14.5px] font-bold text-ink transition hover:border-grape"
            >
              <Trash2 size={16} />
              Clear
            </button>
          </div>
        </div>

        <section className="print-surface rounded-3xl bg-white p-6 shadow-card sm:p-[34px]">
          <div className="border-b border-hair pb-[22px]">
            <p className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.14em] text-grape">
              OncoPath
            </p>
            <h2 className="text-[28px] font-extrabold">
              Cancer trial discussion notes
            </h2>
            <p className="mt-3 max-w-[620px] text-[15px] leading-[1.6] text-muted">
              A summary of public trial information to support a conversation
              with an oncology care team.
            </p>
          </div>

          {loaded && trials.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-xl font-extrabold text-ink">
                No trials added yet
              </h3>
              <p className="mt-2 text-[15px] text-muted">
                Add trials from the results or trial detail pages.
              </p>
              <Link
                href="/search"
                className="no-print mt-5 inline-block rounded-full bg-grape px-6 py-3 text-[14.5px] font-bold text-white transition hover:bg-grapeDark"
              >
                Start a search
              </Link>
            </div>
          ) : trials.length > 0 ? (
            <div className="grid gap-[26px] py-6">
              {trials.map((trial) => {
                const explanation = sheet?.explanations.find(
                  (item) => item.nctId === trial.nctId
                );
                return (
                  <article
                    key={trial.nctId}
                    className="break-inside-avoid border-b border-hair pb-6"
                  >
                    <p className="text-[13px] font-bold text-grape">
                      {trial.nctId}
                    </p>
                    <h3 className="mt-2 text-[21px] font-extrabold leading-[1.25]">
                      {trial.title}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
                      <SheetMeta label="Status" value={<StatusBadge status={trial.status} />} />
                      <SheetMeta label="Phase" value={<PhaseBadge phase={trial.phase?.[0] || "UNKNOWN"} />} />
                      <SheetMeta
                        label="Location"
                        value={
                          <span className="text-sm font-semibold">
                            {formatLocations(trial)}
                          </span>
                        }
                      />
                    </div>
                    {explanation &&
                    (explanation.whyMayBeRelevant.length ||
                      explanation.questionsForOncologyTeam.length) ? (
                      <div className="mt-4 grid gap-[18px] sm:grid-cols-2">
                        {explanation.whyMayBeRelevant.length ? (
                          <SheetList
                            title="Why it may be worth discussing"
                            items={explanation.whyMayBeRelevant}
                          />
                        ) : null}
                        {explanation.questionsForOncologyTeam.length ? (
                          <SheetList
                            title="Questions for the oncology team"
                            items={explanation.questionsForOncologyTeam}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-4 text-[13px] leading-[1.5] text-muted">
                        Open the trial detail page to generate source-grounded
                        discussion notes for this trial.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : null}

          <footer className="border-t border-hair pt-5 text-[13px] leading-[1.6] text-faint">
            Only your oncology care team and the trial team can determine whether
            a trial is appropriate. This sheet is not medical advice, a
            diagnosis, or a treatment recommendation.
          </footer>
        </section>
      </div>
    </main>
  );
}

function SheetMeta({
  label,
  value
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-faint">{label}</p>
      {value}
    </div>
  );
}

function SheetList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-1.5 text-[13.5px] font-extrabold">{title}</h4>
      <ul className="grid list-disc gap-1 pl-4">
        {items.map((item, index) => (
          <li
            key={`${index}-${item}`}
            className="text-[13px] leading-[1.5] text-muted"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
