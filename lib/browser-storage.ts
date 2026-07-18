"use client";

import type { DiscussionSheetState, SavedSearch, TrialExplanation, TrialRecord } from "@/lib/types";

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
  return safeParse(window.localStorage.getItem(SEARCHES_KEY), []);
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

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
