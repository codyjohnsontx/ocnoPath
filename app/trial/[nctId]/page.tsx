"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { IdBadge, PhaseBadge, StatusBadge } from "@/components/status-badges";
import { Squiggle } from "@/components/squiggle";
import { saveExplanationToSheet, saveTrialToSheet } from "@/lib/browser-storage";
import type { TrialExplanation, TrialRecord } from "@/lib/types";

function TrialDetailContent() {
  const params = useParams<{ nctId: string }>();
  const searchParams = useSearchParams();
  const [trial, setTrial] = useState<TrialRecord | null>(null);
  const [explanation, setExplanation] = useState<TrialExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExplaining, setIsExplaining] = useState(false);
  const query = searchParams.toString();

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
    return <TrialLoading />;
  }

  if (!trial) {
    return (
      <main className="flex-1 px-5 py-11">
        <div className="mx-auto max-w-3xl rounded-[26px] bg-white p-8 shadow-card">
          <h1 className="text-2xl font-extrabold text-ink">Trial not found</h1>
          <p className="mt-3 text-muted">
            OncoPath could not load this public trial record.
          </p>
          <Link className="mt-6 inline-block font-bold text-grape" href="/search">
            Start a new search
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[1120px] animate-[fadeUp_500ms_ease-out] px-5 pb-16 pt-8 sm:px-10">
        <Link
          href={query ? `/results?${query}` : "/results"}
          className="text-sm font-bold text-grape hover:underline"
        >
          ← Back to results
        </Link>

        <div className="mt-5 grid items-start gap-7 lg:grid-cols-[1fr_340px]">
          <section className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={trial.status} />
              <PhaseBadge phase={trial.phase?.[0] || "UNKNOWN"} />
              <IdBadge nctId={trial.nctId} />
            </div>
            <h1 className="mt-[18px] text-[26px] font-extrabold leading-[1.18] sm:text-[32px]">
              {trial.title}
            </h1>
            <p className="mt-4 text-[16px] leading-[1.65] text-muted">
              {trial.briefSummary ||
                "No brief summary is stated in the public trial record."}
            </p>

            <div className="my-6 grid grid-cols-1 gap-4 border-y border-hair py-5 sm:grid-cols-3">
              <Meta label="Conditions" value={trial.conditions.join(", ") || "Not stated"} />
              <Meta label="Last updated" value={trial.lastUpdated || "Not stated"} />
              <Meta
                label="Locations"
                value={
                  trial.locations.length
                    ? `${trial.locations.length} listed`
                    : "None listed"
                }
              />
            </div>

            <h2 className="mb-1 mt-[26px] text-[22px] font-extrabold">
              Plain-English explanation <Squiggle>notes</Squiggle>
            </h2>
            {isExplaining || !explanation ? (
              <div className="mt-4 flex items-center gap-3 rounded-[18px] bg-lilac p-5 text-muted">
                <Loader2 className="animate-spin" size={18} />
                Preparing a cautious source-grounded explanation...
              </div>
            ) : (
              <div className="mt-4 grid gap-3.5">
                {explanation.plainEnglishSummary ? (
                  <NoteBox tone="grape" title="Summary">
                    <p className="text-[14.5px] leading-[1.55] text-muted">
                      {explanation.plainEnglishSummary}
                    </p>
                  </NoteBox>
                ) : null}
                {explanation.whyMayBeRelevant?.length ? (
                  <NoteBox tone="grape" title="Why it may be relevant">
                    <NoteList items={explanation.whyMayBeRelevant} />
                  </NoteBox>
                ) : null}
                {explanation.possibleEligibilityConcerns?.length ? (
                  <NoteBox tone="amber" title="Possible eligibility concerns">
                    <NoteList items={explanation.possibleEligibilityConcerns} />
                  </NoteBox>
                ) : null}
                {explanation.missingInformation?.length ? (
                  <NoteBox tone="grape" title="Missing information">
                    <NoteList items={explanation.missingInformation} />
                  </NoteBox>
                ) : null}
                {explanation.questionsForOncologyTeam?.length ? (
                  <NoteBox tone="amber" title="Questions to ask your oncology team">
                    <NoteList items={explanation.questionsForOncologyTeam} />
                  </NoteBox>
                ) : null}
                {explanation.sourceGroundedNotes?.length ? (
                  <NoteBox tone="grape" title="Source-grounded notes">
                    <NoteList items={explanation.sourceGroundedNotes} />
                  </NoteBox>
                ) : null}
              </div>
            )}

            <h2 className="mt-[30px] text-xl font-extrabold">
              Original eligibility criteria
            </h2>
            <pre className="mt-3.5 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl border border-hair bg-[#f7f5fc] p-[18px] font-sans text-[13.5px] leading-[1.6] text-muted">
              {trial.eligibilityCriteria ||
                "Eligibility criteria are not stated in the public trial record."}
            </pre>
          </section>

          <aside className="rounded-[22px] bg-white p-6 shadow-soft lg:sticky lg:top-24">
            <h2 className="text-[18px] font-extrabold">Discussion prep</h2>
            <p className="mt-2 text-sm leading-[1.55] text-muted">
              Save this trial locally, then print a sheet to bring to your
              appointment.
            </p>
            <div className="mt-[18px] grid gap-2.5">
              <button
                type="button"
                onClick={() => {
                  saveTrialToSheet(trial);
                  if (explanation) saveExplanationToSheet(explanation);
                }}
                className="rounded-xl bg-grape px-3 py-3.5 text-center text-[14.5px] font-bold text-white transition hover:bg-grapeDark"
              >
                ＋ Add to sheet
              </button>
              <Link
                href="/discussion-sheet"
                className="rounded-xl border-[1.5px] border-line2 px-3 py-3.5 text-center text-[14.5px] font-bold text-ink transition hover:border-grape"
              >
                Open sheet
              </Link>
              <a
                href={trial.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border-[1.5px] border-line2 px-3 py-3.5 text-center text-[14.5px] font-bold text-ink transition hover:border-grape"
              >
                Official source ↗
              </a>
            </div>
            <p className="mt-[18px] rounded-2xl bg-lilac p-3.5 text-[12.5px] leading-[1.5] text-grape">
              Only your oncology care team and the trial team can decide whether
              a trial is right for you.
            </p>
          </aside>
        </div>
      </div>
      <MedicalDisclaimer />
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-faint">{label}</p>
      <p className="mt-1 text-[14.5px] font-semibold">{value}</p>
    </div>
  );
}

function NoteBox({
  tone,
  title,
  children
}: {
  tone: "grape" | "amber";
  title: string;
  children: React.ReactNode;
}) {
  const surface = tone === "grape" ? "bg-lilac" : "bg-cream";
  const heading = tone === "grape" ? "text-grape" : "text-amberDeep";
  return (
    <div className={`rounded-[18px] p-5 ${surface}`}>
      <h3 className={`mb-2 text-[15px] font-extrabold ${heading}`}>{title}</h3>
      {children}
    </div>
  );
}

function NoteList({ items }: { items: string[] }) {
  return (
    <ul className="grid list-disc gap-1.5 pl-[18px]">
      {items.map((item, index) => (
        <li
          key={`${index}-${item}`}
          className="text-[14.5px] leading-[1.55] text-muted"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function TrialLoading() {
  return (
    <main className="flex flex-1 items-center justify-center py-24">
      <div className="flex items-center gap-3 text-muted">
        <Loader2 className="animate-spin" size={20} />
        Loading public trial record...
      </div>
    </main>
  );
}

export default function TrialDetailPage() {
  return (
    <Suspense fallback={<TrialLoading />}>
      <TrialDetailContent />
    </Suspense>
  );
}
