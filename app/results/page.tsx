"use client";

import {
  Fragment,
  type FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SearchX,
  SlidersHorizontal,
  X
} from "lucide-react";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { IdBadge, PhaseBadges, StatusBadge } from "@/components/status-badges";
import { saveSearch, saveTrialToSheet } from "@/lib/browser-storage";
import { formatNearestLocation } from "@/lib/format";
import type { TrialRecord, TrialSearchMetadata } from "@/lib/types";

const MAX_CURSOR_HISTORY = 20;
const PUBLIC_TRIAL_SOURCE_ERROR =
  "OncoPath could not reach the public trial source right now.";
const STATUS_OPTIONS = [
  { label: "Recruiting", value: "RECRUITING" },
  { label: "Not yet recruiting", value: "NOT_YET_RECRUITING" },
  { label: "Active, not recruiting", value: "ACTIVE_NOT_RECRUITING" }
];
const PHASE_OPTIONS = [
  { value: "EARLY_PHASE1", label: "Early phase 1" },
  { value: "PHASE1", label: "Phase 1" },
  { value: "PHASE2", label: "Phase 2" },
  { value: "PHASE3", label: "Phase 3" },
  { value: "PHASE4", label: "Phase 4" },
  { value: "NA", label: "Not applicable" }
];

class TrialSearchResponseError extends Error {}

type NumberedPageLink = {
  pageNumber: number;
  href: string | null;
  current?: boolean;
};

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trials, setTrials] = useState<TrialRecord[]>([]);
  const [metadata, setMetadata] = useState<TrialSearchMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftStatuses, setDraftStatuses] = useState<string[]>(() =>
    searchParams.getAll("status").length
      ? searchParams.getAll("status")
      : ["RECRUITING"]
  );
  const query = useMemo(() => searchParams.toString(), [searchParams]);
  const pageNumber = parsePageNumber(searchParams.get("page"));

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/trials/search?${query}`)
      .then(async (response) => {
        if (!response.ok) {
          const data = await parseJsonResponse(response);
          throw new TrialSearchResponseError(
            getApiError(data) || PUBLIC_TRIAL_SOURCE_ERROR
          );
        }

        const data = await parseJsonResponse(response);
        if (!isSearchResponse(data)) throw new Error("Invalid trial search response.");
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
            reason instanceof TrialSearchResponseError
              ? reason.message
              : PUBLIC_TRIAL_SOURCE_ERROR
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

  function openFilterEditor() {
    const currentStatuses = searchParams.getAll("status");
    setDraftStatuses(currentStatuses.length ? currentStatuses : ["RECRUITING"]);
    setFiltersOpen(true);
  }

  function toggleDraftStatus(status: string) {
    setDraftStatuses((current) => {
      if (!current.includes(status)) return [...current, status];
      return current.length === 1
        ? current
        : current.filter((value) => value !== status);
    });
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const [key, value] of data.entries()) {
      const text = String(value).trim();
      if (text) params.append(key, text);
    }
    draftStatuses.forEach((status) => params.append("status", status));

    setFiltersOpen(false);
    router.push(`/results?${params.toString()}`);
  }

  function paginationHref(direction: "previous" | "next") {
    const params = new URLSearchParams(searchParams.toString());
    const history = params.getAll("cursorHistory").slice(-MAX_CURSOR_HISTORY);
    params.delete("cursorHistory");

    if (direction === "next") {
      const nextCursor = metadata?.pagination.nextCursor;
      if (!nextCursor) return null;

      [...history, params.get("cursor") || "__START__"]
        .slice(-MAX_CURSOR_HISTORY)
        .forEach((cursor) => params.append("cursorHistory", cursor));
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

  function numberedPageLinks(nextHref: string | null): NumberedPageLink[] {
    const params = new URLSearchParams(searchParams.toString());
    const history = params.getAll("cursorHistory").slice(-MAX_CURSOR_HISTORY);
    params.delete("cursorHistory");
    const firstRetainedPage = pageNumber - history.length;

    const previousPages = history
      .map((cursor, index) => {
        const targetPage = firstRetainedPage + index;
        if (targetPage < 1) return null;

        const targetParams = new URLSearchParams(params.toString());
        history
          .slice(0, index)
          .forEach((value) => targetParams.append("cursorHistory", value));
        if (cursor === "__START__") targetParams.delete("cursor");
        else targetParams.set("cursor", cursor);
        if (targetPage === 1) targetParams.delete("page");
        else targetParams.set("page", String(targetPage));

        return {
          pageNumber: targetPage,
          href: `/results?${targetParams.toString()}`
        };
      })
      .filter(
        (page): page is { pageNumber: number; href: string } => page !== null
      );

    const nearbyPreviousPages = previousPages.slice(-2);
    const firstRetained = previousPages[0];
    const visiblePreviousPages =
      firstRetained &&
      !nearbyPreviousPages.some(
        (page) => page.pageNumber === firstRetained.pageNumber
      )
        ? [firstRetained, ...nearbyPreviousPages]
        : nearbyPreviousPages;

    return [
      ...visiblePreviousPages,
      { pageNumber, href: null, current: true },
      ...(nextHref ? [{ pageNumber: pageNumber + 1, href: nextHref }] : [])
    ];
  }

  const previousHref = paginationHref("previous");
  const nextHref = metadata?.pagination.hasNextPage
    ? paginationHref("next")
    : null;

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

        {!error && metadata ? (
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="rounded-full bg-okSoft px-3 py-1.5 font-bold text-okText">
                Live ClinicalTrials.gov data
              </span>
              {metadata.appliedFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={openFilterEditor}
                  aria-expanded={filtersOpen}
                  aria-controls="results-filter-editor"
                  className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-white px-3 py-1.5 text-left transition hover:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
                >
                  {filter}
                  <SlidersHorizontal size={12} aria-hidden="true" />
                </button>
              ))}
            </div>
            {filtersOpen ? (
              <form
                key={query}
                id="results-filter-editor"
                onSubmit={applyFilters}
                className="mt-3 rounded-lg border border-line bg-white p-4 shadow-soft"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-ink">Search filters</h2>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    aria-label="Close filter editor"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-field hover:text-ink"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <FilterField label="Cancer type">
                    <input
                      required
                      name="cancerType"
                      defaultValue={searchParams.get("cancerType") || ""}
                      className={filterFieldClass}
                    />
                  </FilterField>
                  <FilterField label="Age group">
                    <select
                      required
                      name="ageGroup"
                      defaultValue={searchParams.get("ageGroup") || "adult"}
                      className={filterFieldClass}
                    >
                      <option value="adult">Adult</option>
                      <option value="pediatric">Pediatric</option>
                    </select>
                  </FilterField>
                  <FilterField label="ZIP code or city/state">
                    <input
                      required
                      name="location"
                      defaultValue={searchParams.get("location") || ""}
                      className={filterFieldClass}
                    />
                  </FilterField>
                  <FilterField label="Radius">
                    <select
                      name="radius"
                      defaultValue={searchParams.get("radius") || "100"}
                      className={filterFieldClass}
                    >
                      {["25", "50", "100", "250", "500"].map((radius) => (
                        <option key={radius} value={radius}>
                          {radius} miles
                        </option>
                      ))}
                    </select>
                  </FilterField>
                  <FilterField label="Phase">
                    <select
                      name="phase"
                      defaultValue={searchParams.get("phase") || ""}
                      className={filterFieldClass}
                    >
                      <option value="">No phase preference</option>
                      {PHASE_OPTIONS.map((phase) => (
                        <option key={phase.value} value={phase.value}>
                          {phase.label}
                        </option>
                      ))}
                    </select>
                  </FilterField>
                  <FilterField label="Stage (optional)">
                    <input
                      name="stage"
                      defaultValue={searchParams.get("stage") || ""}
                      className={filterFieldClass}
                    />
                  </FilterField>
                  <FilterField label="Biomarkers (optional)">
                    <input
                      name="biomarkers"
                      defaultValue={searchParams.get("biomarkers") || ""}
                      className={filterFieldClass}
                    />
                  </FilterField>
                  <FilterField label="Prior treatments (optional)">
                    <input
                      name="priorTreatments"
                      defaultValue={searchParams.get("priorTreatments") || ""}
                      className={filterFieldClass}
                    />
                  </FilterField>
                </div>
                <fieldset className="mt-4">
                  <legend className="text-xs font-bold text-ink">
                    Recruiting status
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((status) => {
                      const selected = draftStatuses.includes(status.value);
                      return (
                        <button
                          key={status.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleDraftStatus(status.value)}
                          className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                            selected
                              ? "border-grape bg-grape text-white"
                              : "border-line2 bg-white text-muted hover:border-grape"
                          }`}
                        >
                          {status.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <div className="mt-4 flex justify-end gap-2 border-t border-hair pt-4">
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="rounded-lg border border-line2 px-4 py-2.5 text-sm font-bold text-ink transition hover:border-grape"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-grape px-4 py-2.5 text-sm font-bold text-white transition hover:bg-grapeDark"
                  >
                    <SlidersHorizontal size={15} />
                    Apply filters
                  </button>
                </div>
              </form>
            ) : null}
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
            previousHref={previousHref}
            nextHref={nextHref}
            numberedPages={numberedPageLinks(nextHref)}
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
  nextHref,
  numberedPages
}: {
  pageNumber: number;
  recordsShown: number;
  sourceRecordsScanned: number;
  sourceTotalCount?: number;
  previousHref: string | null;
  nextHref: string | null;
  numberedPages: NumberedPageLink[];
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
      <div className="flex flex-wrap items-center gap-2">
        {previousHref ? (
          <Link
            href={previousHref}
            className="inline-flex items-center gap-1.5 rounded-xl border-[1.5px] border-line2 bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:border-grape"
          >
            <ChevronLeft size={16} />
            Previous
          </Link>
        ) : null}
        <div className="flex items-center gap-1" aria-label="Page numbers">
          {numberedPages.map((page, index) => {
            const previousPage = numberedPages[index - 1];
            const hasGap =
              previousPage && page.pageNumber - previousPage.pageNumber > 1;

            return (
              <Fragment key={page.pageNumber}>
                {hasGap ? (
                  <span className="flex h-10 min-w-6 items-center justify-center text-sm text-faint">
                    ...
                  </span>
                ) : null}
                {page.current ? (
                  <span
                    aria-current="page"
                    className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-grape px-3 text-sm font-bold text-white"
                  >
                    {page.pageNumber}
                  </span>
                ) : (
                  <Link
                    href={page.href ?? "#"}
                    aria-label={`Page ${page.pageNumber}`}
                    className="flex h-10 min-w-10 items-center justify-center rounded-xl border-[1.5px] border-line2 bg-white px-3 text-sm font-bold text-ink transition hover:border-grape"
                  >
                    {page.pageNumber}
                  </Link>
                )}
              </Fragment>
            );
          })}
        </div>
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

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getApiError(value: unknown) {
  if (!value || typeof value !== "object" || !("error" in value)) return null;
  return typeof value.error === "string" ? value.error : null;
}

function isSearchResponse(
  value: unknown
): value is { trials?: TrialRecord[]; metadata?: TrialSearchMetadata } {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-faint">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

const filterFieldClass =
  "w-full rounded-lg border border-line2 bg-field px-3 py-2.5 text-sm text-ink outline-none transition focus:border-grape focus:ring-2 focus:ring-grape/20";

function FilterField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-ink">
      {label}
      {children}
    </label>
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
