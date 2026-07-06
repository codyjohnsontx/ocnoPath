"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookmarkPlus, ExternalLink, Loader2, Printer, SearchX } from "lucide-react";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { PageIntro } from "@/components/page-intro";
import { PhaseBadge, StatusBadge } from "@/components/status-badges";
import { saveSearch, saveTrialToSheet } from "@/lib/browser-storage";
import type { TrialRecord } from "@/lib/types";

function ResultsContent() {
  const searchParams = useSearchParams();
  const [trials, setTrials] = useState<TrialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const query = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/trials/search?${query}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      })
      .then((data) => {
        if (!ignore) setTrials(data.trials ?? []);
      })
      .catch(() => {
        if (!ignore) {
          setError(
            "OncoPath could not reach the public trial source right now. Try again in a few minutes."
          );
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [query]);

  function handleSaveSearch() {
    saveSearch({
      id: crypto.randomUUID(),
      label: searchParams.get("cancerType") || "Cancer trial search",
      params: Object.fromEntries(searchParams.entries()),
      createdAt: new Date().toISOString()
    });
  }

  return (
    <main className="min-h-screen bg-clinical px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <PageIntro
          eyebrow="Trial results"
          title="Review trials that may be worth discussing with your oncology team."
          body="Results are based on public trial records. OncoPath does not confirm eligibility or rank trials as medical recommendations."
        />

        <div className="mt-6 flex flex-col gap-3 rounded-md border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm leading-6 text-slateblue">
            Search:{" "}
            <span className="font-semibold text-ink">
              {searchParams.get("cancerType") || "Cancer trials"}
            </span>{" "}
            near{" "}
            <span className="font-semibold text-ink">
              {searchParams.get("location") || "selected location"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveSearch}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-action"
            >
              <BookmarkPlus size={16} />
              Save search locally
            </button>
            <Link
              href="/discussion-sheet"
              className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-slateblue"
            >
              <Printer size={16} />
              Discussion sheet
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 flex min-h-72 items-center justify-center rounded-md border border-line bg-white">
            <div className="flex items-center gap-3 text-slateblue">
              <Loader2 className="animate-spin" size={20} />
              Searching official public trial records...
            </div>
          </div>
        ) : error ? (
          <EmptyState title="Search unavailable" body={error} />
        ) : trials.length === 0 ? (
          <EmptyState
            title="No trials found"
            body="Try broadening the cancer type, status, phase, or travel radius. Your oncology team may also know about local options not reflected in public records."
          />
        ) : (
          <div className="mt-8 grid gap-5">
            {trials.map((trial) => (
              <article
                key={trial.nctId}
                className="rounded-md border border-line bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-soft"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-4xl">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={trial.status} />
                      <PhaseBadge phase={trial.phase?.[0] || "UNKNOWN"} />
                      <span className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-slateblue">
                        {trial.nctId}
                      </span>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold leading-tight text-ink">
                      {trial.title}
                    </h2>
                    <p className="mt-3 line-clamp-3 leading-7 text-slateblue">
                      {trial.briefSummary || "No brief summary is stated in the public trial record."}
                    </p>
                    <dl className="mt-5 grid gap-3 text-sm text-slateblue sm:grid-cols-3">
                      <div>
                        <dt className="font-semibold text-ink">Condition</dt>
                        <dd>{trial.conditions.slice(0, 3).join(", ") || "Not stated"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink">Locations</dt>
                        <dd>{formatLocations(trial)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink">Last updated</dt>
                        <dd>{trial.lastUpdated || "Not stated"}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                    <Link
                      href={`/trial/${trial.nctId}?${query}`}
                      className="inline-flex items-center justify-center rounded-md bg-action px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
                    >
                      View explanation
                    </Link>
                    <button
                      type="button"
                      onClick={() => saveTrialToSheet(trial)}
                      className="inline-flex items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-action"
                    >
                      Add to sheet
                    </button>
                    <a
                      href={trial.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-action"
                    >
                      Source
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <MedicalDisclaimer />
    </main>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 flex min-h-72 items-center justify-center rounded-md border border-line bg-white p-8 text-center">
      <div className="max-w-lg">
        <SearchX className="mx-auto text-slateblue" size={28} />
        <h2 className="mt-4 text-2xl font-semibold text-ink">{title}</h2>
        <p className="mt-3 leading-7 text-slateblue">{body}</p>
      </div>
    </div>
  );
}

function formatLocations(trial: TrialRecord) {
  if (!trial.locations.length) return "Not stated";
  const first = trial.locations[0];
  const cityState = [first.city, first.state].filter(Boolean).join(", ");
  return trial.locations.length > 1
    ? `${cityState || first.country || "Listed"} + ${trial.locations.length - 1} more`
    : cityState || first.country || "Listed";
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}
