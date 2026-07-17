"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SearchX
} from "lucide-react";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { IdBadge, PhaseBadges, StatusBadge } from "@/components/status-badges";
import { saveSearch, saveTrialToSheet } from "@/lib/browser-storage";
import { formatNearestLocation } from "@/lib/format";
import type { TrialRecord, TrialSearchMetadata } from "@/lib/types";

function ResultsContent() {
  const searchParams = useSearchParams();
  const [trials, setTrials] = useState<TrialRecord[]>([]);
  const [metadata, setMetadata] = useState<TrialSearchMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const query = useMemo(() => searchParams.toString(), [searchParams]);
  const pageNumber = parsePageNumber(searchParams.get("page"));

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/trials/search?${query}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Trial search is temporarily unavailable.");
        }
        return data;
      })
      .then((data) => {
        if (!ignore) {
          setTrials(data.trials ?? []);
          setMetadata(data.metadata ?? null);
        }
      })
      .catch((reason: unknown) => {
        if (!ignore) {
          setError(
            reason instanceof Error
              ? reason.message
              : "OncoPath could not reach the public trial source right now."
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

  function paginationHref(direction: "previous" | "next") {
    const params = new URLSearchParams(searchParams.toString());
    const history = params.getAll("cursorHistory");
    params.delete("cursorHistory");

    if (direction === "next") {
      const nextCursor = metadata?.pagination.nextCursor;
      if (!nextCursor) return null;

      [...history, params.get("cursor") || "__START__"].forEach((cursor) =>
        params.append("cursorHistory", cursor)
      );
      params.set("cursor", nextCursor);
      params.set("page", String(pageNumber + 1));
    } else {
      const previousCursor = history.at(-1);
      if (!previousCursor) return null;

      history.slice(0, -1).forEach((cursor) =>
        params.append("cursorHistory", cursor)
      );
      if (previousCursor === "__START__") params.delete("cursor");
      else params.set("cursor", previousCursor);

      if (pageNumber <= 2) params.delete("page");
      else params.set("page", String(pageNumber - 1));
    }

    return `/results?${params.toString()}`;
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[1120px] animate-[fadeUp_500ms_ease-out] px-5 pb-16 pt-11 sm:px-10">
        <p className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.14em] text-brandAmber">
          Trial results
        </p>
        <h1 className="text-[32px] font-extrabold leading-[1.12] tracking-[-0.02em] sm:text-[40px]">
          Public trial records matching your search.
        </h1>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-white px-[22px] py-4">
          <p className="text-[15px] text-muted">
            Searching for{" "}
            <strong className="text-ink">
              {searchParams.get("cancerType") || "Cancer trials"}
            </strong>{" "}
            within{" "}
            <strong className="text-ink">
              {metadata
                ? `${metadata.radiusMiles} straight-line miles of ${metadata.origin.label}`
                : `${searchParams.get("radius") || "100"} straight-line miles of ${
                    searchParams.get("location") || "your area"
                  }`}
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

        {metadata ? (
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="rounded-full bg-okSoft px-3 py-1.5 font-bold text-okText">
                Live ClinicalTrials.gov data
              </span>
              {metadata.appliedFilters.map((filter) => (
                <span key={filter} className="rounded-full bg-white px-3 py-1.5">
                  {filter}
                </span>
              ))}
            </div>
            <p className="mt-3 max-w-[840px] text-[12.5px] leading-[1.55] text-faint">
              {metadata.pagination.orderingPolicy} Proximity is logistical
              information only; it does not indicate medical relevance or
              eligibility.
            </p>
          </div>
        ) : null}

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
                      <PhaseBadges phases={trial.phase} />
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
                      <Meta
                        label="Nearest site with matching status"
                        value={formatNearestLocation(trial)}
                      />
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

        {!isLoading && !error && metadata ? (
          <Pagination
            pageNumber={pageNumber}
            recordsShown={trials.length}
            sourceRecordsScanned={metadata.pagination.sourceRecordsScanned}
            sourceTotalCount={metadata.pagination.sourceTotalCount}
            previousHref={paginationHref("previous")}
            nextHref={
              metadata.pagination.hasNextPage ? paginationHref("next") : null
            }
          />
        ) : null}
      </div>
      <MedicalDisclaimer />
    </main>
  );
}

function Pagination({
  pageNumber,
  recordsShown,
  sourceRecordsScanned,
  sourceTotalCount,
  previousHref,
  nextHref
}: {
  pageNumber: number;
  recordsShown: number;
  sourceRecordsScanned: number;
  sourceTotalCount?: number;
  previousHref: string | null;
  nextHref: string | null;
}) {
  return (
    <nav
      aria-label="Trial result pages"
      className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted">
        <strong className="text-ink">Page {pageNumber}</strong> · {recordsShown}{" "}
        records shown · {sourceRecordsScanned} source records checked
        {sourceTotalCount !== undefined
          ? ` · ${sourceTotalCount} source candidates before local checks`
          : ""}
      </p>
      <div className="flex items-center gap-2">
        {previousHref ? (
          <Link
            href={previousHref}
            className="inline-flex items-center gap-1.5 rounded-xl border-[1.5px] border-line2 bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:border-grape"
          >
            <ChevronLeft size={16} />
            Previous
          </Link>
        ) : null}
        {nextHref ? (
          <Link
            href={nextHref}
            className="inline-flex items-center gap-1.5 rounded-xl bg-grape px-4 py-2.5 text-sm font-bold text-white transition hover:bg-grapeDark"
          >
            Next
            <ChevronRight size={16} />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

function parsePageNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
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
