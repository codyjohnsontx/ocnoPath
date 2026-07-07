/**
 * Snapshot the gold set (scripts/eval/trials.json) to disk so the accuracy eval
 * is reproducible even as ClinicalTrials.gov data drifts. Reuses the app's own
 * fetch/normalize path (getTrialByNctId) so fixtures match what production sees.
 *
 * Run: npm run eval:snapshot   (no API key needed — public CT.gov v2 API)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getTrialByNctId } from "../../lib/clinical-trials";
import type { TrialRecord } from "../../lib/types";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");

type GoldTrial = { nctId: string; tags: string[]; why: string };
type GoldSet = { trials: GoldTrial[] };

// CT.gov fetch silently falls back to placeholder sample data (NCT0000000x) on
// error — never treat that as a real trial in the gold set.
function isRealMatch(record: TrialRecord | null, requestedId: string): boolean {
  return (
    !!record &&
    record.nctId === requestedId &&
    !/^NCT0000000[12]$/.test(record.nctId)
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const goldPath = join(here, "trials.json");
  const gold = JSON.parse(readFileSync(goldPath, "utf8")) as GoldSet;
  mkdirSync(fixturesDir, { recursive: true });

  let ok = 0;
  const skipped: string[] = [];

  for (const entry of gold.trials) {
    process.stdout.write(`Fetching ${entry.nctId} ... `);
    let record: TrialRecord | null = null;
    try {
      record = await getTrialByNctId(entry.nctId);
    } catch {
      record = null;
    }

    if (!isRealMatch(record, entry.nctId)) {
      console.log("SKIPPED (fetch failed or returned placeholder)");
      skipped.push(entry.nctId);
      await sleep(400);
      continue;
    }

    // rawSource is the full v2 payload and is never sent to the model — drop it
    // to keep fixtures lean and diff-friendly.
    const { rawSource: _drop, ...lean } = record as TrialRecord;
    writeFileSync(
      join(fixturesDir, `${entry.nctId}.json`),
      JSON.stringify(lean, null, 2) + "\n"
    );
    console.log(`ok (eligibility ${lean.eligibilityCriteria?.length ?? 0} chars)`);
    ok++;
    await sleep(400);
  }

  console.log(`\nSnapshot complete: ${ok}/${gold.trials.length} written to fixtures/.`);
  if (skipped.length) {
    console.log(`Skipped (revisit these NCT IDs): ${skipped.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
