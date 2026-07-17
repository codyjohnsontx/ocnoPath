import * as zipcodes from "zipcodes";
import type {
  SearchCriteria,
  TrialLocation,
  TrialRecord,
  TrialSearchResult
} from "@/lib/types";

const API_BASE = "https://clinicaltrials.gov/api/v2";
const API_TIMEOUT_MS = 12_000;
const RESULT_PAGE_SIZE = 12;
const MAX_SOURCE_REQUESTS_PER_PAGE = 20;
const ORDERING_POLICY =
  "ClinicalTrials.gov relevance determines which records are considered first. Within this page, records are ordered by nearest matching site.";
const SEARCH_FIELDS = [
  "NCTId",
  "BriefTitle",
  "OfficialTitle",
  "OverallStatus",
  "LastUpdatePostDate",
  "Phase",
  "Condition",
  "BriefSummary",
  "LocationFacility",
  "LocationStatus",
  "LocationCity",
  "LocationState",
  "LocationCountry",
  "LocationZip",
  "LocationGeoPoint"
].join(",");

type CtStudy = {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
      briefTitle?: string;
      officialTitle?: string;
    };
    statusModule?: {
      overallStatus?: string;
      lastUpdatePostDateStruct?: { date?: string };
    };
    designModule?: {
      phases?: string[];
    };
    conditionsModule?: {
      conditions?: string[];
    };
    descriptionModule?: {
      briefSummary?: string;
    };
    eligibilityModule?: {
      eligibilityCriteria?: string;
    };
    contactsLocationsModule?: {
      locations?: CtLocation[];
    };
  };
};

type CtSearchResponse = {
  studies?: CtStudy[];
  nextPageToken?: string;
  totalCount?: number;
};

type CtLocation = {
  facility?: string;
  status?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  geoPoint?: {
    lat?: number;
    lon?: number;
  };
};

export type SearchOrigin = {
  label: string;
  latitude: number;
  longitude: number;
};

export type TrialSearchPageOptions = {
  cursor?: string;
};

type SearchParamOptions = {
  countTotal?: boolean;
  pageSize?: number;
  pageToken?: string;
};

export class ClinicalTrialsError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ClinicalTrialsError";
  }
}

export async function searchTrials(
  criteria: SearchCriteria,
  options: TrialSearchPageOptions = {}
): Promise<TrialSearchResult> {
  const origin = resolveSearchOrigin(criteria.location);
  if (!origin) {
    throw new ClinicalTrialsError(
      "Location could not be resolved. Use a 5-digit US ZIP code or City, ST.",
      422
    );
  }

  const radiusMiles = Number(criteria.radius);
  const validatedTrials: Array<TrialRecord & { nearestLocation: TrialLocation }> = [];
  let nextCursor = options.cursor;
  let hasMoreSourceRecords = true;
  let sourceRecordsScanned = 0;
  let sourceTotalCount: number | undefined;
  let sourceRequests = 0;

  while (
    validatedTrials.length < RESULT_PAGE_SIZE &&
    hasMoreSourceRecords &&
    sourceRequests < MAX_SOURCE_REQUESTS_PER_PAGE
  ) {
    const params = buildSearchParams(criteria, origin, {
      countTotal: sourceRequests === 0,
      pageSize: RESULT_PAGE_SIZE - validatedTrials.length,
      pageToken: nextCursor
    });
    const response = await fetch(`${API_BASE}/studies?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new ClinicalTrialsError(
        `ClinicalTrials.gov returned ${response.status}.`,
        response.status
      );
    }

    const data = (await response.json()) as CtSearchResponse;
    const studies = Array.isArray(data.studies) ? data.studies : [];
    sourceRecordsScanned += studies.length;
    sourceTotalCount ??= data.totalCount;

    const pageTrials = studies
      .map((study) => normalizeStudy(study, false))
      .filter((trial): trial is TrialRecord => Boolean(trial))
      .filter((trial) => conditionMatches(criteria.cancerType, trial.conditions))
      .map((trial) => addNearestLocation(trial, origin, criteria.status))
      .filter(
        (trial): trial is TrialRecord & { nearestLocation: TrialLocation } =>
          Boolean(
            trial.nearestLocation?.distanceMiles !== undefined &&
              trial.nearestLocation.distanceMiles <= radiusMiles
          )
      );

    validatedTrials.push(...pageTrials);
    nextCursor = data.nextPageToken;
    hasMoreSourceRecords = Boolean(nextCursor);
    sourceRequests += 1;
  }

  const trials = validatedTrials
    .sort(
      (a, b) => {
        const distanceDifference =
          (a.nearestLocation.distanceMiles ?? Number.POSITIVE_INFINITY) -
          (b.nearestLocation.distanceMiles ?? Number.POSITIVE_INFINITY);
        return distanceDifference || a.nctId.localeCompare(b.nctId);
      }
    )
    .slice(0, RESULT_PAGE_SIZE)
    .map((trial) => ({
      ...trial,
      locations: trial.nearestLocation ? [trial.nearestLocation] : []
    }));

  return {
    trials,
    metadata: {
      source: "ClinicalTrials.gov",
      sourceStatus: "live",
      origin,
      radiusMiles,
      appliedFilters: appliedFilters(criteria),
      fetchedAt: new Date().toISOString(),
      pagination: {
        pageSize: RESULT_PAGE_SIZE,
        hasNextPage: hasMoreSourceRecords,
        nextCursor,
        sourceRecordsScanned,
        sourceTotalCount,
        orderingPolicy: ORDERING_POLICY
      }
    }
  };
}

export async function getTrialByNctId(nctId: string): Promise<TrialRecord | null> {
  const response = await fetch(`${API_BASE}/studies/${encodeURIComponent(nctId)}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 },
    signal: AbortSignal.timeout(API_TIMEOUT_MS)
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new ClinicalTrialsError(
      `ClinicalTrials.gov returned ${response.status}.`,
      response.status
    );
  }

  return normalizeStudy(await response.json());
}

export function buildSearchParams(
  criteria: SearchCriteria,
  origin: SearchOrigin,
  options: SearchParamOptions = {}
) {
  const params = new URLSearchParams({
    "query.cond": criteria.cancerType,
    "filter.overallStatus": criteria.status.join(","),
    "filter.geo": `distance(${origin.latitude},${origin.longitude},${criteria.radius}mi)`,
    fields: SEARCH_FIELDS,
    pageSize: String(options.pageSize ?? RESULT_PAGE_SIZE),
    format: "json"
  });

  if (options.pageToken) params.set("pageToken", options.pageToken);
  if (options.countTotal) params.set("countTotal", "true");

  const termExpressions = [
    `AREA[StdAge]${criteria.ageGroup === "pediatric" ? "CHILD" : "ADULT"}`,
    criteria.phase ? `AREA[Phase]${criteria.phase}` : undefined,
    criteria.stage ? quoteSearchTerm(criteria.stage) : undefined,
    criteria.biomarkers ? quoteSearchTerm(criteria.biomarkers) : undefined,
    criteria.priorTreatments
      ? quoteSearchTerm(criteria.priorTreatments)
      : undefined
  ].filter((value): value is string => Boolean(value));

  params.set("query.term", termExpressions.join(" AND "));
  return params;
}

export function resolveSearchOrigin(location: string): SearchOrigin | null {
  const trimmed = location.trim();
  const zipMatch = trimmed.match(/^(\d{5})(?:-\d{4})?$/);

  if (zipMatch) {
    const match = zipcodes.lookup(zipMatch[1]);
    return match
      ? {
          label: `${match.city}, ${match.state} ${match.zip}`,
          latitude: match.latitude,
          longitude: match.longitude
        }
      : null;
  }

  const [city, stateInput, ...extra] = trimmed.split(",").map((part) => part.trim());
  if (!city || !stateInput || extra.length) return null;

  const state = zipcodes.states.normalize(stateInput);
  const matches = zipcodes.lookupByName(city, state);
  if (!matches.length) return null;

  return {
    label: `${matches[0].city}, ${matches[0].state}`,
    latitude:
      matches.reduce((sum, match) => sum + match.latitude, 0) / matches.length,
    longitude:
      matches.reduce((sum, match) => sum + match.longitude, 0) / matches.length
  };
}

export function distanceMiles(
  from: Pick<SearchOrigin, "latitude" | "longitude">,
  to: Pick<TrialLocation, "latitude" | "longitude">
) {
  if (to.latitude === undefined || to.longitude === undefined) return undefined;

  const earthRadiusMiles = 3958.8;
  const lat1 = degreesToRadians(from.latitude);
  const lat2 = degreesToRadians(to.latitude);
  const deltaLat = degreesToRadians(to.latitude - from.latitude);
  const deltaLon = degreesToRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function conditionMatches(cancerType: string, conditions: string[]) {
  const conditionText = normalizeWords(conditions.join(" "));
  const meaningfulTerms = normalizeWords(cancerType)
    .split(" ")
    .filter((term) => term.length >= 4 && !GENERIC_CONDITION_TERMS.has(term));

  if (!meaningfulTerms.length) return true;
  return meaningfulTerms.some((term) => {
    const aliases = CONDITION_ALIASES[term] ?? [term];
    return aliases.some((alias) => conditionText.includes(alias));
  });
}

function normalizeStudy(study: CtStudy, includeRawSource = true): TrialRecord | null {
  const protocol = study.protocolSection;
  const identification = protocol?.identificationModule;
  const status = protocol?.statusModule;
  const design = protocol?.designModule;
  const conditions = protocol?.conditionsModule;
  const description = protocol?.descriptionModule;
  const eligibility = protocol?.eligibilityModule;
  const contacts = protocol?.contactsLocationsModule;

  const nctId = identification?.nctId;
  if (!nctId) return null;

  const locations =
    contacts?.locations?.map((location) => ({
      facility: location.facility,
      status: location.status,
      city: location.city,
      state: location.state,
      country: location.country,
      zip: location.zip,
      latitude: location.geoPoint?.lat,
      longitude: location.geoPoint?.lon
    })) ?? [];

  return {
    nctId,
    title:
      identification?.briefTitle ||
      identification?.officialTitle ||
      "Untitled clinical trial",
    status: status?.overallStatus || "UNKNOWN",
    phase: design?.phases ?? ["UNKNOWN"],
    conditions: conditions?.conditions ?? [],
    briefSummary: description?.briefSummary,
    eligibilityCriteria: eligibility?.eligibilityCriteria,
    locations,
    sourceUrl: `https://clinicaltrials.gov/study/${nctId}`,
    lastUpdated: status?.lastUpdatePostDateStruct?.date,
    rawSource: includeRawSource ? study : undefined
  };
}

function addNearestLocation(
  trial: TrialRecord,
  origin: SearchOrigin,
  allowedStatuses: string[]
): TrialRecord {
  const locations = trial.locations
    .filter(
      (location) =>
        location.status !== undefined && allowedStatuses.includes(location.status)
    )
    .map((location) => ({
      ...location,
      distanceMiles: distanceMiles(origin, location)
    }))
    .filter(
      (location): location is TrialLocation & { distanceMiles: number } =>
        location.distanceMiles !== undefined
    )
    .sort((a, b) => a.distanceMiles - b.distanceMiles);

  return {
    ...trial,
    nearestLocation: locations[0]
  };
}

function appliedFilters(criteria: SearchCriteria) {
  return [
    `Condition: ${criteria.cancerType}`,
    `Age group: ${criteria.ageGroup}`,
    `Within ${criteria.radius} straight-line miles of ${criteria.location}`,
    `Status: ${criteria.status.join(", ")}`,
    criteria.phase ? `Phase: ${criteria.phase}` : undefined,
    criteria.stage ? `Stage term: ${criteria.stage}` : undefined,
    criteria.biomarkers ? `Biomarker term: ${criteria.biomarkers}` : undefined,
    criteria.priorTreatments
      ? `Prior treatment term: ${criteria.priorTreatments}`
      : undefined
  ].filter((value): value is string => Boolean(value));
}

function quoteSearchTerm(value: string) {
  const safe = value.replace(/["\\()[\]{}]/g, " ").replace(/\s+/g, " ").trim();
  return `"${safe}"`;
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

const GENERIC_CONDITION_TERMS = new Set([
  "cancer",
  "carcinoma",
  "disease",
  "malignant",
  "neoplasm",
  "solid",
  "tumor"
]);

const CONDITION_ALIASES: Record<string, string[]> = {
  colorectal: ["colorectal", "colon", "rectal"],
  pancreatic: ["pancreatic", "pancreas"],
  ovarian: ["ovarian", "ovary"],
  prostate: ["prostate", "prostatic"],
  renal: ["renal", "kidney"],
  hepatic: ["hepatic", "liver"]
};

function normalizeWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
