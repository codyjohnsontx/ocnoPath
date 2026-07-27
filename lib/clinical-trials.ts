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
  "Records remain in ClinicalTrials.gov relevance order. Distance is used only to identify a matching site within the selected radius.";
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
  studies: CtStudy[];
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

    const data = await parseClinicalTrialsJson(response);
    if (!isCtSearchResponse(data)) {
      throw new ClinicalTrialsError(
        "ClinicalTrials.gov returned an invalid response."
      );
    }
    const studies = data.studies;
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

  const trials = validatedTrials.slice(0, RESULT_PAGE_SIZE);

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

  const data = await parseClinicalTrialsJson(response);
  if (!isCtStudy(data)) {
    throw new ClinicalTrialsError(
      "ClinicalTrials.gov returned an invalid response."
    );
  }

  const trial = normalizeStudy(data);
  if (!trial) {
    throw new ClinicalTrialsError(
      "ClinicalTrials.gov returned an invalid response."
    );
  }
  return trial;
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

  const state = zipcodes.states.normalize(stateInput) as string | undefined;
  if (!state) return null;
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
  const meaningfulTerms = canonicalConditionTerms(cancerType);

  if (!meaningfulTerms.length) return true;
  return conditions.some((condition) => {
    const conditionTerms = canonicalConditionTerms(condition);
    const conditionTermSet = new Set(conditionTerms);
    return (
      conditionPolarityMatches(meaningfulTerms, conditionTerms) &&
      meaningfulTerms.every((term) => conditionTermSet.has(term))
    );
  });
}

async function parseClinicalTrialsJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ClinicalTrialsError(
      "ClinicalTrials.gov returned an invalid response."
    );
  }
}

function isCtSearchResponse(value: unknown): value is CtSearchResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.studies) &&
    value.studies.every(isCtStudy) &&
    (value.nextPageToken === undefined ||
      (typeof value.nextPageToken === "string" &&
        value.nextPageToken.length > 0)) &&
    (value.totalCount === undefined ||
      (typeof value.totalCount === "number" &&
        Number.isInteger(value.totalCount) &&
        value.totalCount >= 0))
  );
}

function isCtStudy(value: unknown): value is CtStudy {
  if (!isRecord(value) || !isRecord(value.protocolSection)) return false;
  const identification = value.protocolSection.identificationModule;
  return (
    isRecord(identification) &&
    typeof identification.nctId === "string" &&
    identification.nctId.length > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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
  "cell",
  "disease",
  "malignant",
  "neoplasm",
  "solid",
  "tumor"
]);

const CONDITION_TERM_CANONICAL: Record<string, string> = {
  colon: "colorectal",
  colorectal: "colorectal",
  rectal: "colorectal",
  pancreas: "pancreatic",
  pancreatic: "pancreatic",
  ovarian: "ovarian",
  ovary: "ovarian",
  prostate: "prostate",
  prostatic: "prostate",
  kidney: "renal",
  renal: "renal",
  hepatic: "hepatic",
  liver: "hepatic"
};

function canonicalConditionTerms(value: string) {
  return normalizeWords(value)
    .split(" ")
    .filter(
      (term) =>
        (term === "non" || term.length >= 4) &&
        !GENERIC_CONDITION_TERMS.has(term)
    )
    .map((term) => CONDITION_TERM_CANONICAL[term] ?? term);
}

function conditionPolarityMatches(left: string[], right: string[]) {
  const leftNegated = negatedConditionTerms(left);
  const rightNegated = negatedConditionTerms(right);
  const sharedNegationTargets = new Set([...leftNegated, ...rightNegated]);

  return [...sharedNegationTargets].every((term) => {
    if (!left.includes(term) || !right.includes(term)) return true;
    return leftNegated.has(term) === rightNegated.has(term);
  });
}

function negatedConditionTerms(terms: string[]) {
  const negated = new Set<string>();
  terms.forEach((term, index) => {
    if (term === "non" && terms[index + 1]) negated.add(terms[index + 1]);
  });
  return negated;
}

function normalizeWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
