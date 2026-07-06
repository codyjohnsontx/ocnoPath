"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, Trash2 } from "lucide-react";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { clearDiscussionSheet, getDiscussionSheet } from "@/lib/browser-storage";
import type { DiscussionSheetState } from "@/lib/types";

export default function DiscussionSheetPage() {
  const [sheet, setSheet] = useState<DiscussionSheetState | null>(null);

  useEffect(() => {
    setSheet(getDiscussionSheet());
  }, []);

  function clearSheet() {
    clearDiscussionSheet();
    setSheet(getDiscussionSheet());
  }

  return (
    <main className="min-h-screen bg-clinical px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-action">
              Doctor discussion sheet
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">
              Print or save as PDF from your browser.
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-md bg-action px-4 py-2 text-sm font-semibold text-white"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              type="button"
              onClick={clearSheet}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              <Trash2 size={16} />
              Clear
            </button>
          </div>
        </div>

        <section className="print-surface rounded-md border border-line bg-white p-6 shadow-soft">
          <div className="border-b border-line pb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-action">
              OncoPath
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">
              Cancer trial discussion notes
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slateblue">
              This sheet summarizes public trial information to support a
              conversation with an oncology care team. It does not confirm
              eligibility or recommend treatment.
            </p>
          </div>

          {!sheet || sheet.trialSnapshots.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-xl font-semibold text-ink">
                No trials added yet
              </h3>
              <p className="mt-2 text-slateblue">
                Add trials from the results or trial detail pages.
              </p>
              <Link
                href="/search"
                className="no-print mt-5 inline-block rounded-md bg-action px-4 py-2 text-sm font-semibold text-white"
              >
                Start a search
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 py-6">
              {sheet.trialSnapshots.map((trial) => {
                const explanation = sheet.explanations.find(
                  (item) => item.nctId === trial.nctId
                );
                return (
                  <article key={trial.nctId} className="break-inside-avoid border-b border-line pb-6">
                    <p className="text-sm font-semibold text-action">{trial.nctId}</p>
                    <h3 className="mt-2 text-2xl font-semibold leading-tight text-ink">
                      {trial.title}
                    </h3>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <SheetMeta label="Status" value={trial.status} />
                      <SheetMeta label="Phase" value={trial.phase.join(", ") || "Not stated"} />
                      <SheetMeta label="Source" value={trial.sourceUrl} />
                    </dl>
                    {explanation ? (
                      <div className="mt-5 grid gap-4">
                        <SheetList title="Why it may be worth discussing" items={explanation.whyMayBeRelevant} />
                        <SheetList title="Possible eligibility concerns" items={explanation.possibleEligibilityConcerns} />
                        <SheetList title="Missing information" items={explanation.missingInformation} />
                        <SheetList title="Questions for the oncology team" items={explanation.questionsForOncologyTeam} />
                      </div>
                    ) : (
                      <p className="mt-5 leading-7 text-slateblue">
                        Open the trial detail page to generate source-grounded
                        discussion notes for this trial.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <footer className="border-t border-line pt-5 text-sm leading-6 text-slateblue">
            Only your oncology care team and the trial team can determine
            whether a trial is appropriate. This sheet is not medical advice,
            a diagnosis, or a treatment recommendation.
          </footer>
        </section>
      </div>
      <MedicalDisclaimer />
    </main>
  );
}

function SheetMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-ink">{label}</dt>
      <dd className="mt-1 break-words text-slateblue">{value}</dd>
    </div>
  );
}

function SheetList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h4 className="font-semibold text-ink">{title}</h4>
      <ul className="mt-2 grid gap-1 text-sm leading-6 text-slateblue">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </section>
  );
}
