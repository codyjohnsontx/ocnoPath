"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookmarkPlus, Loader2, SearchX } from "lucide-react";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { IdBadge, PhaseBadge, StatusBadge } from "@/components/status-badges";
import { saveSearch, saveTrialToSheet } from "@/lib/browser-storage";
import { formatLocations } from "@/lib/format";
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
    <main className="flex-1">
      <div className="mx-auto max-w-[1120px] animate-[fadeUp_500ms_ease-out] px-5 pb-16 pt-11 sm:px-10">
        <p className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.14em] text-amber">
          Trial results
        </p>
        <h1 className="text-[32px] font-extrabold leading-[1.12] tracking-[-0.02em] sm:text-[40px]">
          Trials worth discussing with your oncology team.
        </h1>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-white px-[22px] py-4">
          <p className="text-[15px] text-muted">
            Showing{" "}
            <strong className="text-ink">
              {searchParams.get("cancerType") || "Cancer trials"}
            </strong>{" "}
            near{" "}
            <strong className="text-ink">
              {searchParams.get("location") || "your area"}
            </strong>
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleSaveSearch}
              className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-line2 px-[18px] py-2.5 text-sm font-bold text-grape transition hover:border-grape"
            >
              <BookmarkPlus size={15} />
              Save search
            </button>
            <Link
              href="/search"
              className="rounded-full border-[1.5px] border-line2 px-[18px] py-2.5 text-sm font-bold text-grape transition hover:border-grape"
            >
              Edit search
            </Link>
            <Link
              href="/discussion-sheet"
              className="rounded-full bg-ink px-[18px] py-2.5 text-sm font-bold text-white transition hover:opacity-90"
            >
              Discussion sheet
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 flex min-h-72 items-center justify-center rounded-[22px] bg-white">
            <div className="flex items-center gap-3 text-muted">
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
          <div className="mt-[22px] grid gap-[18px]">
            {trials.map((trial) => (
              <article
                key={trial.nctId}
                className="rounded-[22px] bg-white p-[26px] shadow-soft transition duration-300 hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap justify-between gap-5">
                  <div className="max-w-[640px]">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={trial.status} />
                      <PhaseBadge phase={trial.phase?.[0] || "UNKNOWN"} />
                      <IdBadge nctId={trial.nctId} />
                    </div>
                    <h2 className="mt-4 text-[22px] font-extrabold leading-[1.25]">
                      {trial.title}
                    </h2>
                    <p className="mt-3 text-[15px] leading-[1.6] text-muted">
                      {trial.briefSummary ||
                        "No brief summary is stated in the public trial record."}
                    </p>
                    <div className="mt-[18px] flex flex-wrap gap-x-[26px] gap-y-3">
                      <Meta label="Condition" value={trial.conditions.slice(0, 3).join(", ") || "Not stated"} />
                      <Meta label="Location" value={formatLocations(trial)} />
                      <Meta label="Last updated" value={trial.lastUpdated || "Not stated"} />
                    </div>
                  </div>
                  <div className="flex min-w-[170px] flex-col gap-2.5">
                    <Link
                      href={`/trial/${trial.nctId}?${query}`}
                      className="rounded-xl bg-grape px-[18px] py-3 text-center text-sm font-bold text-white transition hover:bg-grapeDark"
                    >
                      View explanation
                    </Link>
                    <button
                      type="button"
                      onClick={() => saveTrialToSheet(trial)}
                      className="rounded-xl border-[1.5px] border-line2 px-[18px] py-3 text-sm font-bold text-ink transition hover:border-grape"
                    >
                      Add to sheet
                    </button>
                    <a
                      href={trial.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border-[1.5px] border-line2 px-[18px] py-3 text-center text-sm font-bold text-ink transition hover:border-grape"
                    >
                      Source ↗
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-faint">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 flex min-h-72 items-center justify-center rounded-[22px] bg-white p-8 text-center">
      <div className="max-w-lg">
        <SearchX className="mx-auto text-grape" size={28} />
        <h2 className="mt-4 text-[22px] font-extrabold text-ink">{title}</h2>
        <p className="mt-3 text-[15px] leading-[1.6] text-muted">{body}</p>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}
