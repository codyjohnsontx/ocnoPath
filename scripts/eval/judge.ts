/**
 * Faithfulness judge (roadmap 1.3). Grades each factual claim in a generated
 * explanation against the source trial text, claim by claim, and reports a
 * faithfulness score. Uses a larger, different-family model than the generator
 * (JUDGE_MODEL, default openai/gpt-oss-120b on Groq) to reduce self-grading bias.
 *
 * Prereq: a results file from `npm run eval:run`, and JUDGE_MODEL set (see
 * scripts/eval/README.md). Run: npm run eval:judge [results/<file>.json]
 */
import "./_env";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import OpenAI from "openai";
import type { TrialExplanation, TrialRecord } from "../../lib/types";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");
const resultsDir = join(here, "results");

// Fields that make factual assertions about the trial (gradeable against source).
// Excludes questionsForOncologyTeam (questions) and safetyWarnings (fixed disclaimer).
const GRADED_FIELDS = [
  "plainEnglishSummary",
  "whyMayBeRelevant",
  "possibleEligibilityConcerns",
  "missingInformation",
  "sourceGroundedNotes"
] as const;

type Verdict =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "UNSUPPORTED"
  | "OVERSTATED";

type Claim = { id: string; field: string; text: string };
type Graded = Claim & { verdict: Verdict | "MISSING"; reason: string; sourceSnippet: string };

const VALID_VERDICTS = new Set<Verdict>([
  "SUPPORTED",
  "PARTIALLY_SUPPORTED",
  "UNSUPPORTED",
  "OVERSTATED"
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function latestResultsFile(): string {
  const files = readdirSync(resultsDir)
    .filter((f) => f.endsWith(".json") && !f.endsWith("-judged.json"))
    .sort()
    .reverse();
  if (!files.length) {
    throw new Error("No results/*.json found — run `npm run eval:run` first.");
  }
  return join(resultsDir, files[0]);
}

function claimsOf(exp: TrialExplanation): Claim[] {
  const claims: Claim[] = [];
  for (const field of GRADED_FIELDS) {
    const value = (exp as unknown as Record<string, unknown>)[field];
    const items = Array.isArray(value) ? value : [value];
    items.forEach((text, i) => {
      if (typeof text === "string" && text.trim()) {
        claims.push({ id: `${field}#${i}`, field, text: text.trim() });
      }
    });
  }
  return claims;
}

const client = new OpenAI({
  apiKey: process.env.JUDGE_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.JUDGE_BASE_URL || process.env.OPENAI_BASE_URL
});
const JUDGE_MODEL = process.env.JUDGE_MODEL || "openai/gpt-oss-120b";

function systemPrompt() {
  return [
    "You are a careful clinical-trial fact-checker. You are given the SOURCE of a public trial record (its title, status, phase, conditions, locations, last-updated date, URL, free-text summary, and eligibility criteria) and a list of CLAIMS taken from an AI-generated plain-English explanation. Judge whether each claim is faithful to the source, using ONLY the source. A fact stated in any source field (e.g. status = RECRUITING supports 'currently recruiting') counts as supported; a fact in no field (e.g. a sponsor name) is UNSUPPORTED.",
    "Verdicts:",
    "- SUPPORTED: directly stated in or clearly entailed by the source.",
    "- PARTIALLY_SUPPORTED: partly stated but missing nuance or over-generalized slightly.",
    "- UNSUPPORTED: not present in the source and not verifiable from it (includes outside medical knowledge).",
    "- OVERSTATED: derived from the source but asserts more than it states — e.g. an EXCLUSION criterion reframed as a medical risk ('patients with X are excluded' -> 'X puts you at risk'), or added specifics/terms not in the source.",
    "For a 'missing information' claim (an assertion that the source does NOT state something): SUPPORTED if the source indeed does not contain it, UNSUPPORTED if it actually is in the source.",
    "Return ONLY valid JSON."
  ].join("\n");
}

function userPrompt(trial: TrialRecord, claims: Claim[]) {
  return JSON.stringify({
    // Must match exactly the trial fields the GENERATOR sees (see userPrompt in
    // lib/explanation.ts) — otherwise the judge marks grounded claims (status,
    // dates, locations, URL) as unsupported.
    source: {
      nctId: trial.nctId,
      title: trial.title,
      status: trial.status,
      phase: trial.phase,
      conditions: trial.conditions,
      briefSummary: trial.briefSummary,
      eligibilityCriteria: trial.eligibilityCriteria,
      locations: trial.locations,
      lastUpdated: trial.lastUpdated,
      sourceUrl: trial.sourceUrl
    },
    claims: claims.map((c) => ({ id: c.id, field: c.field, text: c.text })),
    requiredSchema: {
      verdicts: [{ id: "string", verdict: "SUPPORTED|PARTIALLY_SUPPORTED|UNSUPPORTED|OVERSTATED", reason: "string", sourceSnippet: "string" }]
    }
  });
}

async function judgeExplanation(trial: TrialRecord, claims: Claim[]): Promise<Graded[] | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: JUDGE_MODEL,
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: userPrompt(trial, claims) }
        ]
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("empty judge response");
      const parsed = JSON.parse(content);
      const byId = new Map<string, { verdict: Verdict; reason?: string; sourceSnippet?: string }>();
      for (const v of parsed.verdicts ?? []) {
        if (v && typeof v.id === "string") byId.set(v.id, v);
      }
      return claims.map((c) => {
        const v = byId.get(c.id);
        const raw = typeof v?.verdict === "string" ? v.verdict : undefined;
        // Coerce unknown/malformed verdicts to MISSING so they show up in the
        // breakdown instead of silently inflating the denominator.
        const verdict: Verdict | "MISSING" =
          raw && VALID_VERDICTS.has(raw as Verdict) ? (raw as Verdict) : "MISSING";
        return {
          ...c,
          verdict,
          reason:
            verdict === "MISSING" && raw
              ? `judge returned an invalid verdict: ${raw}`
              : v?.reason ?? "judge returned no verdict for this claim",
          sourceSnippet: v?.sourceSnippet ?? ""
        };
      });
    } catch (err) {
      if (attempt === 0) await sleep(1500); // one backoff retry
      else console.error(`  judge call failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return null;
}

async function main() {
  const resultsPath = process.argv[2]
    ? (process.argv[2].startsWith("/") ? process.argv[2] : join(process.cwd(), process.argv[2]))
    : latestResultsFile();
  console.log(`Judging: ${resultsPath}`);
  console.log(`Judge model: ${JUDGE_MODEL} @ ${process.env.JUDGE_BASE_URL || process.env.OPENAI_BASE_URL || "(default)"}\n`);

  const run = JSON.parse(readFileSync(resultsPath, "utf8"));
  const judged: Array<{ nctId: string; tags: string[]; claims: Graded[] }> = [];
  let judgeErrors = 0;

  for (const r of run.results as Array<{ nctId: string; tags: string[]; isFallback: boolean; explanation: TrialExplanation }>) {
    if (r.isFallback) continue; // deterministic template, not model claims
    const trial = JSON.parse(readFileSync(join(fixturesDir, `${r.nctId}.json`), "utf8")) as TrialRecord;
    const claims = claimsOf(r.explanation);
    const graded = await judgeExplanation(trial, claims);
    if (!graded) {
      console.log(`${r.nctId}: JUDGE ERROR (skipped)`);
      judgeErrors++;
      await sleep(800);
      continue;
    }
    const bad = graded.filter((g) => g.verdict === "UNSUPPORTED" || g.verdict === "OVERSTATED").length;
    console.log(`${r.nctId} [${r.tags.join(",")}]: ${graded.length} claims, ${bad} flagged`);
    judged.push({ nctId: r.nctId, tags: r.tags, claims: graded });
    await sleep(800); // rate-limit friendly
  }

  const all = judged.flatMap((j) => j.claims);
  const count = (v: string) => all.filter((c) => c.verdict === v).length;
  const total = all.length;
  const supported = count("SUPPORTED");
  const faithfulnessPct = total ? Math.round((supported / total) * 100) : 0;

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const summary = {
    runId,
    judgeModel: JUDGE_MODEL,
    sourceResults: resultsPath,
    explanationsJudged: judged.length,
    judgeErrors,
    totalClaims: total,
    faithfulnessPct,
    verdicts: {
      SUPPORTED: supported,
      PARTIALLY_SUPPORTED: count("PARTIALLY_SUPPORTED"),
      UNSUPPORTED: count("UNSUPPORTED"),
      OVERSTATED: count("OVERSTATED"),
      MISSING: count("MISSING")
    }
  };
  writeFileSync(
    join(resultsDir, `${runId}-judged.json`),
    JSON.stringify({ summary, judged }, null, 2) + "\n"
  );

  console.log(`\n=== Faithfulness: ${supported}/${total} claims SUPPORTED (${faithfulnessPct}%) ===`);
  console.log(`   ${JSON.stringify(summary.verdicts)}`);
  const offenders = all.filter((c) => c.verdict === "UNSUPPORTED" || c.verdict === "OVERSTATED");
  if (offenders.length) {
    console.log(`\nFlagged claims (${offenders.length}):`);
    for (const o of offenders.slice(0, 15)) {
      console.log(`  [${o.verdict}] (${o.field}) ${o.text.slice(0, 90)}`);
      console.log(`      → ${o.reason.slice(0, 120)}`);
    }
  }
  console.log(`\nWritten to results/${runId}-judged.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
