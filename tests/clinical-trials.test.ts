import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSearchParams,
  ClinicalTrialsError,
  conditionMatches,
  distanceMiles,
  resolveSearchOrigin,
  searchTrials,
  type SearchOrigin
} from "../lib/clinical-trials";
import type { SearchCriteria } from "../lib/types";

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
    assert.equal(result.trials[0].locations.length, 1);
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
    assert.equal(firstPage.trials[0].nearestLocation?.city, "Austin");
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
