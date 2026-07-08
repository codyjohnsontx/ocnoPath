/**
 * Run the real explanation generator (explainTrial) against the snapshotted gold
 * set and report the headline signal: how often the configured model produces
 * usable output vs. silently falling back to the deterministic template.
 *
 * Prereq: snapshot first (npm run eval:snapshot), then set the provider env in
 * .env.local (auto-loaded below). Run: npm run eval:run
 */
import "./_env";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { explainTrial } from "../../lib/explanation";
import type { TrialExplanation, TrialRecord } from "../../lib/types";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");
const resultsDir = join(here, "results");

type GoldTrial = {
  nctId: string;
  tags: string[];
  searchContext?: Record<string, unknown>;
};
type GoldSet = { trials: GoldTrial[] };

// The generator omits `model` on the deterministic fallback and stamps a
// "Safety fallback used: <reason>" note. Either signal means "not model output".
function fallbackReason(exp: TrialExplanation): string | null {
  if (exp.model === undefined) {
    const note = exp.sourceGroundedNotes.find((n) =>
      n.startsWith("Safety fallback used:")
    );
    return note ? note.replace("Safety fallback used:", "").trim() : "unknown";
  }
  return null;
}

async function main() {
  const gold = JSON.parse(
    readFileSync(join(here, "trials.json"), "utf8")
  ) as GoldSet;
  mkdirSync(resultsDir, { recursive: true });

  const provider = process.env.AI_PROVIDER || "fallback";
  const model = process.env.OPENAI_MODEL || process.env.OLLAMA_MODEL || "(none)";
  const baseUrl = process.env.OPENAI_BASE_URL || "(default)";
  console.log(`Provider: ${provider} | model: ${model} | baseURL: ${baseUrl}\n`);

  const results: Array<{
    nctId: string;
    tags: string[];
    model?: string;
    isFallback: boolean;
    fallbackReason: string | null;
    explanation: TrialExplanation;
  }> = [];
  const missing: string[] = [];

  for (const entry of gold.trials) {
    const fixturePath = join(fixturesDir, `${entry.nctId}.json`);
    if (!existsSync(fixturePath)) {
      console.log(`${entry.nctId}: no fixture — run eval:snapshot first. Skipping.`);
      missing.push(entry.nctId);
      continue;
    }

    const trial = JSON.parse(readFileSync(fixturePath, "utf8")) as TrialRecord;
    const explanation = await explainTrial(trial, entry.searchContext);
    const reason = fallbackReason(explanation);
    const isFallback = reason !== null;

    console.log(
      `${entry.nctId} [${entry.tags.join(",")}]: ${
        isFallback ? `FALLBACK (${reason})` : `model=${explanation.model}`
      }`
    );

    results.push({
      nctId: entry.nctId,
      tags: entry.tags,
      model: explanation.model,
      isFallback,
      fallbackReason: reason,
      explanation
    });
  }

  const total = results.length;
  const fallbacks = results.filter((r) => r.isFallback).length;
  const modelOutputs = total - fallbacks;
  const usability = total ? Math.round((modelOutputs / total) * 100) : 0;

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const summary = {
    runId,
    provider,
    model,
    baseUrl,
    total,
    modelOutputs,
    fallbacks,
    usabilityPct: usability,
    missingFixtures: missing
  };
  writeFileSync(
    join(resultsDir, `${runId}.json`),
    JSON.stringify({ summary, results }, null, 2) + "\n"
  );

  console.log(
    `\n=== Usability: ${modelOutputs}/${total} model outputs (${usability}%), ${fallbacks} fallback ===`
  );
  if (missing.length) {
    console.log(`Missing fixtures: ${missing.join(", ")} (run eval:snapshot)`);
  }
  console.log(`Results written to results/${runId}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
