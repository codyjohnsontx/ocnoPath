"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookmarkPlus, ExternalLink, Loader2, Printer } from "lucide-react";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { PhaseBadge, StatusBadge } from "@/components/status-badges";
import { saveExplanationToSheet, saveTrialToSheet } from "@/lib/browser-storage";
import type { TrialExplanation, TrialRecord } from "@/lib/types";

export default function TrialDetailPage() {
  const params = useParams<{ nctId: string }>();
  const searchParams = useSearchParams();
  const [trial, setTrial] = useState<TrialRecord | null>(null);
  const [explanation, setExplanation] = useState<TrialExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExplaining, setIsExplaining] = useState(false);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);

    fetch(`/api/trials/${params.nctId}`)
      .then((response) => response.json())
      .then((data) => {
        if (!ignore) setTrial(data.trial);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [params.nctId]);

  useEffect(() => {
    if (!trial) return;
    let ignore = false;
    setIsExplaining(true);

    fetch(`/api/trials/${trial.nctId}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trial,
        searchContext: {
          cancerType: searchParams.get("cancerType"),
          ageGroup: searchParams.get("ageGroup"),
          stageProvided: Boolean(searchParams.get("stage")),
          biomarkersProvided: Boolean(searchParams.get("biomarkers")),
          priorTreatmentsProvided: Boolean(searchParams.get("priorTreatments"))
        }
      })
    })
      .then((response) => response.json())
      .then((data) => {
        if (!ignore) setExplanation(data.explanation);
      })
      .finally(() => {
        if (!ignore) setIsExplaining(false);
      });

    return () => {
      ignore = true;
    };
  }, [trial, searchParams]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-clinical">
        <div className="flex items-center gap-3 text-slateblue">
          <Loader2 className="animate-spin" size={20} />
          Loading public trial record...
        </div>
      </main>
    );
  }

  if (!trial) {
    return (
      <main className="min-h-screen bg-clinical px-5 py-10">
        <div className="mx-auto max-w-3xl rounded-md border border-line bg-white p-8">
          <h1 className="text-2xl font-semibold text-ink">Trial not found</h1>
          <p className="mt-3 text-slateblue">
            OncoPath could not load this public trial record.
          </p>
          <Link className="mt-6 inline-block font-semibold text-action" href="/search">
            Start a new search
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-clinical px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="rounded-md border border-line bg-white p-6 shadow-soft">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={trial.status} />
              <PhaseBadge phase={trial.phase?.[0] || "UNKNOWN"} />
              <span className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-slateblue">
                {trial.nctId}
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              {trial.title}
            </h1>
            <p className="mt-5 leading-7 text-slateblue">
              {trial.briefSummary || "No brief summary is stated in the public trial record."}
            </p>

            <div className="mt-8 grid gap-4 border-y border-line py-5 text-sm sm:grid-cols-3">
              <Metadata label="Conditions" value={trial.conditions.join(", ") || "Not stated"} />
              <Metadata label="Last updated" value={trial.lastUpdated || "Not stated"} />
              <Metadata label="Locations" value={`${trial.locations.length || "No"} listed`} />
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-ink">
                Plain-English explanation
              </h2>
              {isExplaining || !explanation ? (
                <div className="mt-4 flex items-center gap-3 rounded-md border border-line bg-clinical p-4 text-slateblue">
                  <Loader2 className="animate-spin" size={18} />
                  Preparing a cautious source-grounded explanation...
                </div>
              ) : (
                <Explanation explanation={explanation} />
              )}
            </div>

            <div className="mt-10">
              <h2 className="text-xl font-semibold text-ink">
                Original eligibility criteria
              </h2>
              <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md border border-line bg-clinical p-4 text-sm leading-6 text-slateblue">
                {trial.eligibilityCriteria ||
                  "Eligibility criteria are not stated in the public trial record."}
              </pre>
            </div>
          </section>

          <aside className="h-fit rounded-md border border-line bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold text-ink">Discussion prep</h2>
            <p className="mt-2 text-sm leading-6 text-slateblue">
              Save this trial locally, then print a doctor discussion sheet.
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  saveTrialToSheet(trial);
                  if (explanation) saveExplanationToSheet(explanation);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-action px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                <BookmarkPlus size={16} />
                Add to sheet
              </button>
              <Link
                href="/discussion-sheet"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-action"
              >
                <Printer size={16} />
                Open sheet
              </Link>
              <a
                href={trial.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-action"
              >
                Official source
                <ExternalLink size={16} />
              </a>
            </div>
            <p className="mt-5 rounded-md bg-clinical p-3 text-xs leading-5 text-slateblue">
              Only your oncology care team and the trial team can determine
              whether this trial is appropriate for you.
            </p>
          </aside>
        </div>
      </div>
      <MedicalDisclaimer />
    </main>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-ink">{label}</dt>
      <dd className="mt-1 text-slateblue">{value}</dd>
    </div>
  );
}

function Explanation({ explanation }: { explanation: TrialExplanation }) {
  return (
    <div className="mt-4 grid gap-5">
      <section className="rounded-md border border-line bg-clinical p-4">
        <h3 className="font-semibold text-ink">Summary</h3>
        <p className="mt-2 leading-7 text-slateblue">
          {explanation.plainEnglishSummary}
        </p>
      </section>
      <ListSection title="Why it may be relevant" items={explanation.whyMayBeRelevant} />
      <ListSection
        title="Possible eligibility concerns"
        items={explanation.possibleEligibilityConcerns}
      />
      <ListSection title="Missing information" items={explanation.missingInformation} />
      <ListSection
        title="Questions to ask your oncology team"
        items={explanation.questionsForOncologyTeam}
      />
      <ListSection title="Source-grounded notes" items={explanation.sourceGroundedNotes} />
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="border-t border-line pt-4">
      <h3 className="font-semibold text-ink">{title}</h3>
      <ul className="mt-2 grid gap-2 leading-7 text-slateblue">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-action" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
