/**
 * Human calibration for the faithfulness judge (roadmap 1.3). Without knowing the
 * judge's own accuracy, its faithfulness % is just another unverified number. This
 * samples a few claims for a human to label blind, then measures judge-vs-human
 * agreement.
 *
 * Run `npm run eval:calibrate`:
 *   - first run (no labels file): writes scripts/eval/calibration.labels.json with
 *     blank humanVerdict fields to fill in.
 *   - after you fill them in: re-run to print agreement vs the judge.
 */
import "./_env";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { TrialRecord } from "../../lib/types";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");
const resultsDir = join(here, "results");
const labelsPath = join(here, "calibration.labels.json");

const VERDICTS = ["SUPPORTED", "PARTIALLY_SUPPORTED", "UNSUPPORTED", "OVERSTATED"];
const SAMPLE_SIZE = 6;

type JudgedClaim = { field: string; text: string; verdict: string };
type Judged = { summary: { runId: string }; judged: Array<{ nctId: string; claims: JudgedClaim[] }> };

function latestJudgedFile(): string {
  const files = readdirSync(resultsDir)
    .filter((f) => f.endsWith("-judged.json"))
    .sort()
    .reverse();
  if (!files.length) throw new Error("No results/*-judged.json — run `npm run eval:judge` first.");
  return join(resultsDir, files[0]);
}

// Deterministic spread: some flagged claims (to check the judge's flags) + some supported.
function sample(flat: Array<{ nctId: string; field: string; text: string; verdict: string }>) {
  const flagged = flat.filter((c) => c.verdict === "UNSUPPORTED" || c.verdict === "OVERSTATED");
  const partial = flat.filter((c) => c.verdict === "PARTIALLY_SUPPORTED");
  const supported = flat.filter((c) => c.verdict === "SUPPORTED");
  const picked = [...flagged.slice(0, 2), ...partial.slice(0, 1), ...supported.slice(0, 3)];
  for (const c of flat) {
    if (picked.length >= SAMPLE_SIZE) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return picked.slice(0, SAMPLE_SIZE);
}

function prepare() {
  const judgedFile = latestJudgedFile();
  const judged = JSON.parse(readFileSync(judgedFile, "utf8")) as Judged;
  const flat = judged.judged.flatMap((j) =>
    j.claims.map((c) => ({ nctId: j.nctId, field: c.field, text: c.text, verdict: c.verdict }))
  );
  if (!flat.length) throw new Error("Judged file has no claims to calibrate against.");

  const picked = sample(flat);
  const labels = picked.map((c) => {
    const trial = JSON.parse(readFileSync(join(fixturesDir, `${c.nctId}.json`), "utf8")) as TrialRecord;
    return {
      nctId: c.nctId,
      field: c.field,
      claim: c.text,
      briefSummary: trial.briefSummary ?? "",
      note: `Full eligibility in fixtures/${c.nctId}.json`,
      humanVerdict: "" // fill: SUPPORTED | PARTIALLY_SUPPORTED | UNSUPPORTED | OVERSTATED
    };
  });

  const out = {
    _meta: {
      instructions: `Judge each claim against the SOURCE only (briefSummary here + full eligibility in the named fixture). Fill humanVerdict with one of: ${VERDICTS.join(", ")}. Do NOT look at the judged results file first. Then re-run: npm run eval:calibrate`,
      judgedFile: judgedFile.replace(here + "/", "scripts/eval/").replace(resultsDir, "results")
    },
    labels
  };
  writeFileSync(labelsPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${labels.length} claims to calibration.labels.json.`);
  console.log("Fill in each humanVerdict (blind), then re-run: npm run eval:calibrate");
}

function score() {
  const file = JSON.parse(readFileSync(labelsPath, "utf8"));
  const labels = file.labels as Array<{ nctId: string; field: string; claim: string; humanVerdict: string }>;
  const filled = labels.filter((l) => l.humanVerdict && l.humanVerdict.trim());
  if (!filled.length) {
    console.log("No humanVerdict values filled in yet. Label calibration.labels.json, then re-run.");
    return;
  }

  // Re-read the exact judged file this template was built from.
  const judgedRel = file._meta?.judgedFile as string;
  const judgedAbs = judgedRel?.startsWith("results")
    ? join(resultsDir, judgedRel.replace(/^results\//, ""))
    : latestJudgedFile();
  const judged = JSON.parse(readFileSync(judgedAbs, "utf8")) as Judged;
  const judgeBy = new Map<string, string>();
  for (const j of judged.judged) {
    for (const c of j.claims) judgeBy.set(`${j.nctId}::${c.text}`, c.verdict);
  }

  const isFaithful = (v: string) => v === "SUPPORTED";
  let exact = 0;
  let binary = 0;
  const disagreements: string[] = [];
  for (const l of filled) {
    const jv = judgeBy.get(`${l.nctId}::${l.claim}`);
    if (!jv) continue;
    if (jv === l.humanVerdict) exact++;
    if (isFaithful(jv) === isFaithful(l.humanVerdict)) binary++;
    else disagreements.push(`  ${l.nctId} (${l.field}): human=${l.humanVerdict} judge=${jv}\n      "${l.claim.slice(0, 90)}"`);
  }

  const n = filled.length;
  console.log(`Calibration on ${n} labeled claims (judged file: ${judgedRel}):`);
  console.log(`  exact-verdict agreement: ${exact}/${n} (${Math.round((exact / n) * 100)}%)`);
  console.log(`  faithful/not agreement:  ${binary}/${n} (${Math.round((binary / n) * 100)}%)`);
  if (disagreements.length) {
    console.log(`\nFaithful/not disagreements (${disagreements.length}):`);
    console.log(disagreements.join("\n"));
  }
}

function main() {
  if (existsSync(labelsPath)) score();
  else prepare();
}

main();
