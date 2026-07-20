import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSearchParams,
  ClinicalTrialsError,
  conditionMatches,
  distanceMiles,
  getTrialByNctId,
  resolveSearchOrigin,
  searchTrials,
  type SearchOrigin
} from "../lib/clinical-trials";
import { savedSearchHref, savedSearchQuery } from "../lib/browser-storage";
import type { SavedSearch, SearchCriteria } from "../lib/types";
import {
  searchCriteriaSchema,
  trialSearchResultSchema
} from "../lib/validation";

const criteria: SearchCriteria = {
  cancerType: "breast cancer",
  stage: "stage IV",
  biomarkers: "HER2",
  priorTreatments: "trastuzumab",
  ageGroup: "adult",
  location: "Austin, TX",
  radius: "100",
  status: ["RECRUITING"],
  phase: "PHASE3"
};

const austin: SearchOrigin = {
  label: "Austin, TX",
  latitude: 30.2672,
  longitude: -97.7431
};

test("builds supported ClinicalTrials.gov search parameters", () => {
  const params = buildSearchParams(criteria, austin);

  assert.equal(params.get("query.cond"), "breast cancer");
  assert.equal(params.get("filter.phase"), null);
  assert.equal(params.get("filter.geo"), "distance(30.2672,-97.7431,100mi)");
  assert.match(params.get("fields") ?? "", /LocationGeoPoint/);
  assert.match(params.get("query.term") ?? "", /AREA\[StdAge\]ADULT/);
  assert.match(params.get("query.term") ?? "", /AREA\[Phase\]PHASE3/);
  assert.match(params.get("query.term") ?? "", /"HER2"/);
});

test("resolves ZIP and City, ST without an external geocoder", () => {
  const byZip = resolveSearchOrigin("78701");
  const byCity = resolveSearchOrigin("Austin, Texas");

  assert.ok(byZip);
  assert.ok(byCity);
  assert.equal(byZip.label, "Austin, TX 78701");
  assert.equal(byCity.label, "Austin, TX");
  assert.ok(Math.abs(byCity.latitude - 30.27) < 0.2);
  assert.equal(resolveSearchOrigin("Austin, NotAState"), null);
});

test("calculates straight-line distance in miles", () => {
  const distance = distanceMiles(austin, {
    latitude: 29.7604,
    longitude: -95.3698
  });

  assert.ok(distance);
  assert.ok(distance > 140 && distance < 170);
});

test("rejects a title-only cancer match when registered conditions conflict", () => {
  assert.equal(conditionMatches("breast cancer", ["Prostate Cancer"]), false);
  assert.equal(conditionMatches("breast cancer", ["Breast Neoplasms"]), true);
  assert.equal(conditionMatches("colorectal cancer", ["Colon Cancer"]), true);
  assert.equal(conditionMatches("kidney cancer", ["Renal Cell Carcinoma"]), true);
  assert.equal(conditionMatches("Renal Cell Carcinoma", ["Kidney Cancer"]), true);
  assert.equal(
    conditionMatches("small cell lung cancer", ["Small Intestine Cancer"]),
    false
  );
  assert.equal(
    conditionMatches("small cell lung cancer", ["Small Cell Lung Carcinoma"]),
    true
  );
  assert.equal(
    conditionMatches("non-small cell lung cancer", ["Small Cell Lung Cancer"]),
    false
  );
  assert.equal(
    conditionMatches("small cell lung cancer", ["Non-Small Cell Lung Cancer"]),
    false
  );
  assert.equal(
    conditionMatches("non-Hodgkin lymphoma", ["Hodgkin Lymphoma"]),
    false
  );
  assert.equal(
    conditionMatches("Hodgkin lymphoma", ["Non-Hodgkin Lymphoma"]),
    false
  );
  assert.equal(
    conditionMatches("lung cancer", ["Non-Small Cell Lung Cancer"]),
    true
  );
  assert.equal(conditionMatches("lymphoma", ["Non-Hodgkin Lymphoma"]), true);
});

test("returns the nearest site with a matching recruiting status", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        studies: [
          study("NCT12345678", [
            location("Mobile", "Alabama", "RECRUITING", 30.6954, -88.0399),
            location("Austin", "Texas", "RECRUITING", 30.26715, -97.74306)
          ]),
          study("NCT87654321", [
            location(
              "Austin",
              "Texas",
              "ACTIVE_NOT_RECRUITING",
              30.26715,
              -97.74306
            )
          ])
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  try {
    const result = await searchTrials(criteria);
    assert.deepEqual(
      result.trials.map((trial) => trial.nctId),
      ["NCT12345678"]
    );
    assert.equal(result.trials[0].nearestLocation?.city, "Austin");
    assert.equal(result.trials[0].locations.length, 2);
    assert.ok((result.trials[0].nearestLocation?.distanceMiles ?? 20) < 15);
    assert.equal(result.metadata.sourceStatus, "live");
    assert.equal(result.metadata.pagination.hasNextPage, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns an opaque next cursor without dropping source records", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requestedUrls.push(url);
    const cursor = url.searchParams.get("pageToken");

    if (cursor === "cursor_page_2") {
      return jsonResponse({
        studies: [
          study("NCT20000000", [
            location("Temple", "Texas", "RECRUITING", 31.0982, -97.3428)
          ])
        ],
        totalCount: 13
      });
    }

    return jsonResponse({
      studies: Array.from({ length: 12 }, (_, index) =>
        study(`NCT${String(10000000 + index)}`, [
          location(
            index === 11 ? "Austin" : "Temple",
            "Texas",
            "RECRUITING",
            index === 11 ? 30.26715 : 31.0982,
            index === 11 ? -97.74306 : -97.3428
          )
        ])
      ),
      nextPageToken: "cursor_page_2",
      totalCount: 13
    });
  };

  try {
    const firstPage = await searchTrials(criteria);
    const secondPage = await searchTrials(criteria, { cursor: "cursor_page_2" });

    assert.equal(firstPage.trials.length, 12);
    assert.equal(firstPage.trials[0].nearestLocation?.city, "Temple");
    assert.equal(firstPage.trials.at(-1)?.nearestLocation?.city, "Austin");
    assert.equal(firstPage.metadata.pagination.hasNextPage, true);
    assert.equal(firstPage.metadata.pagination.nextCursor, "cursor_page_2");
    assert.equal(firstPage.metadata.pagination.sourceTotalCount, 13);
    assert.equal(secondPage.trials[0].nctId, "NCT20000000");
    assert.equal(
      requestedUrls[1].searchParams.get("pageToken"),
      "cursor_page_2"
    );
    assert.equal(requestedUrls[0].searchParams.get("countTotal"), "true");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("throws on an upstream error instead of returning synthetic trials", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("upstream error", { status: 400 });

  try {
    await assert.rejects(() => searchTrials(criteria), ClinicalTrialsError);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a successful search response without a studies array", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ totalCount: 0 });

  try {
    await assert.rejects(() => searchTrials(criteria), ClinicalTrialsError);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects malformed upstream pagination fields", async () => {
  const originalFetch = globalThis.fetch;

  try {
    for (const payload of [
      { studies: [], nextPageToken: 42 },
      { studies: [], totalCount: "12" }
    ]) {
      globalThis.fetch = async () => jsonResponse(payload);
      await assert.rejects(() => searchTrials(criteria), ClinicalTrialsError);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a malformed successful single-study response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    jsonResponse({ protocolSection: { identificationModule: {} } });

  try {
    await assert.rejects(
      () => getTrialByNctId("NCT12345678"),
      ClinicalTrialsError
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("applies route defaults only to absent radius and status values", () => {
  const baseCriteria = {
    cancerType: "breast cancer",
    ageGroup: "adult",
    location: "Austin, TX"
  };
  const emptyValues = searchCriteriaSchema.safeParse({
    ...baseCriteria,
    radius: null,
    status: []
  });
  const nullStatus = searchCriteriaSchema.safeParse({
    ...baseCriteria,
    radius: null,
    status: null
  });

  assert.equal(emptyValues.success, true);
  assert.equal(nullStatus.success, true);
  if (emptyValues.success) {
    assert.equal(emptyValues.data.radius, "100");
    assert.deepEqual(emptyValues.data.status, ["RECRUITING"]);
  }
  if (nullStatus.success) {
    assert.deepEqual(nullStatus.data.status, ["RECRUITING"]);
  }

  assert.equal(
    searchCriteriaSchema.safeParse({
      ...baseCriteria,
      radius: "75",
      status: ["RECRUITING"]
    }).success,
    false
  );
  assert.equal(
    searchCriteriaSchema.safeParse({
      ...baseCriteria,
      radius: "100",
      status: [""]
    }).success,
    false
  );
});

test("validates the complete client search response shape", () => {
  const response = {
    trials: [
      {
        nctId: "NCT12345678",
        title: "Example study",
        status: "RECRUITING",
        phase: ["PHASE2"],
        conditions: ["Lung Cancer"],
        locations: [],
        sourceUrl: "https://clinicaltrials.gov/study/NCT12345678"
      }
    ],
    metadata: {
      source: "ClinicalTrials.gov",
      sourceStatus: "live",
      origin: { label: "Austin, TX", latitude: 30.2672, longitude: -97.7431 },
      radiusMiles: 100,
      appliedFilters: ["Condition: lung cancer"],
      fetchedAt: "2026-07-17T00:00:00.000Z",
      pagination: {
        pageSize: 12,
        hasNextPage: false,
        sourceRecordsScanned: 1,
        sourceTotalCount: 1,
        orderingPolicy: "Source order."
      }
    }
  };

  assert.equal(trialSearchResultSchema.safeParse(response).success, true);
  assert.equal(
    trialSearchResultSchema.safeParse({
      ...response,
      metadata: {
        ...response.metadata,
        pagination: {
          ...response.metadata.pagination,
          hasNextPage: true
        }
      }
    }).success,
    false
  );
  assert.equal(
    trialSearchResultSchema.safeParse({
      ...response,
      metadata: {
        ...response.metadata,
        pagination: {
          ...response.metadata.pagination,
          hasNextPage: true,
          nextCursor: ""
        }
      }
    }).success,
    false
  );
  assert.equal(
    trialSearchResultSchema.safeParse({
      ...response,
      metadata: {
        ...response.metadata,
        pagination: {
          ...response.metadata.pagination,
          nextCursor: "retained_cursor"
        }
      }
    }).success,
    true
  );
  assert.equal(
    trialSearchResultSchema.safeParse({ ...response, trials: {} }).success,
    false
  );
  assert.equal(
    trialSearchResultSchema.safeParse({
      ...response,
      metadata: {
        ...response.metadata,
        pagination: { pageSize: 12, hasNextPage: false }
      }
    }).success,
    false
  );
});

test("round-trips repeated saved-search parameters without pagination", () => {
  const query = savedSearchQuery(
    "cancerType=lung+cancer&status=RECRUITING&status=NOT_YET_RECRUITING&page=2&cursor=next_cursor&cursorHistory=__START__"
  );
  const search: SavedSearch = {
    id: "saved-search",
    label: "lung cancer",
    query,
    createdAt: "2026-07-17T00:00:00.000Z"
  };
  const loaded = new URL(savedSearchHref(search), "http://localhost").searchParams;

  assert.deepEqual(loaded.getAll("status"), [
    "RECRUITING",
    "NOT_YET_RECRUITING"
  ]);
  assert.equal(loaded.get("page"), null);
  assert.equal(loaded.get("cursor"), null);
  assert.equal(loaded.get("cursorHistory"), null);
});

function study(nctId: string, locations: ReturnType<typeof location>[]) {
  return {
    protocolSection: {
      identificationModule: {
        nctId,
        briefTitle: `Study ${nctId}`
      },
      statusModule: {
        overallStatus: "RECRUITING",
        lastUpdatePostDateStruct: { date: "2026-01-01" }
      },
      designModule: { phases: ["PHASE3"] },
      conditionsModule: { conditions: ["Breast Cancer"] },
      descriptionModule: { briefSummary: "Public source summary." },
      eligibilityModule: { eligibilityCriteria: "Adults with breast cancer." },
      contactsLocationsModule: { locations }
    }
  };
}

function location(
  city: string,
  state: string,
  status: string,
  lat: number,
  lon: number
) {
  return {
    facility: `${city} Cancer Center`,
    city,
    state,
    country: "United States",
    status,
    geoPoint: { lat, lon }
  };
}

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
