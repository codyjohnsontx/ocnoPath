"use client";

import type {
  DiscussionSheetState,
  SavedSearch,
  TrialExplanation,
  TrialRecord
} from "@/lib/types";

const SEARCHES_KEY = "oncopath.savedSearches";
const SHEET_KEY = "oncopath.discussionSheet";

export function saveSearch(search: SavedSearch) {
  const searches = getSavedSearches();
  const next = [search, ...searches].slice(0, 10);
  window.localStorage.setItem(SEARCHES_KEY, JSON.stringify(next));
}

export function savedSearchQuery(query: string) {
  const params = new URLSearchParams(query);
  params.delete("cursor");
  params.delete("cursorHistory");
  params.delete("page");
  return params.toString();
}

export function savedSearchHref(search: SavedSearch) {
  return `/results?${search.query}`;
}

export function getSavedSearches(): SavedSearch[] {
  if (typeof window === "undefined") return [];
  const stored = safeParse<unknown>(window.localStorage.getItem(SEARCHES_KEY), []);
  if (!Array.isArray(stored)) return [];

  const searches = stored
    .map(normalizeSavedSearch)
    .filter((search): search is SavedSearch => Boolean(search));

  if (JSON.stringify(searches) !== JSON.stringify(stored)) {
    window.localStorage.setItem(SEARCHES_KEY, JSON.stringify(searches));
  }

  return searches;
}

export function saveTrialToSheet(trial: TrialRecord) {
  const sheet = getDiscussionSheet();
  const trialSnapshots = [
    trial,
    ...sheet.trialSnapshots.filter((item) => item.nctId !== trial.nctId)
  ].slice(0, 8);

  const selectedTrialIds = trialSnapshots.map((item) => item.nctId);
  persistSheet({ ...sheet, selectedTrialIds, trialSnapshots });
}

export function saveExplanationToSheet(explanation: TrialExplanation) {
  const sheet = getDiscussionSheet();
  const explanations = [
    explanation,
    ...sheet.explanations.filter((item) => item.nctId !== explanation.nctId)
  ].slice(0, 8);

  persistSheet({ ...sheet, explanations });
}

export function getDiscussionSheet(): DiscussionSheetState {
  if (typeof window === "undefined") return emptySheet();
  return safeParse(window.localStorage.getItem(SHEET_KEY), emptySheet());
}

export function clearDiscussionSheet() {
  window.localStorage.removeItem(SHEET_KEY);
}

function persistSheet(sheet: DiscussionSheetState) {
  window.localStorage.setItem(
    SHEET_KEY,
    JSON.stringify({ ...sheet, updatedAt: new Date().toISOString() })
  );
}

function emptySheet(): DiscussionSheetState {
  return {
    selectedTrialIds: [],
    trialSnapshots: [],
    explanations: [],
    updatedAt: new Date().toISOString()
  };
}

function normalizeSavedSearch(value: unknown): SavedSearch | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.label !== "string" ||
    typeof record.createdAt !== "string"
  ) {
    return null;
  }

  if (typeof record.query === "string") {
    return {
      id: record.id,
      label: record.label,
      query: savedSearchQuery(record.query),
      createdAt: record.createdAt
    };
  }

  if (!record.params || typeof record.params !== "object") return null;

  const params = new URLSearchParams();
  for (const [key, item] of Object.entries(record.params)) {
    const values = Array.isArray(item) ? item : [item];
    for (const value of values) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        params.append(key, String(value));
      }
    }
  }

  return {
    id: record.id,
    label: record.label,
    query: savedSearchQuery(params.toString()),
    createdAt: record.createdAt
  };
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
