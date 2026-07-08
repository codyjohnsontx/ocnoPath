# OncoPath explanation accuracy eval

Evidence for roadmap item **1.2** — measure whether the AI plain-English
explanations hold up on real trials, starting with the most basic signal:
**how often does the configured model produce usable output vs. silently fall
back to the deterministic safe template?**

This is the "thin" first slice. The automated faithfulness judge (claim-level
source grounding, roadmap 1.3) comes next and builds on these fixtures.

## What's here

- `trials.json` — the gold set: ~12 real ClinicalTrials.gov NCT IDs chosen to
  span cancer types, phases (NA/1/2/3), and eligibility-criteria complexity.
- `snapshot.ts` — freezes each trial to `fixtures/<nctId>.json` using the app's
  own `getTrialByNctId`, so the eval is reproducible as CT.gov data drifts.
- `run.ts` — runs the real `explainTrial` per fixture, flags fallback vs. model
  output, writes a timestamped run to `results/`, and prints the usability rate.
- `fixtures/` — committed frozen trial records (no `rawSource`).
- `results/` — per-run JSON (gitignored; regenerable). Curated findings live in
  `NOTES.md` and, later, a published `REPORT.md`.

## Run it

1. **Snapshot the gold set** (no API key needed — public CT.gov v2 API):

   ```bash
   npm run eval:snapshot
   ```

2. **Point at the model that will serve production** (Groq free tier). Put the
   provider vars in `.env.local` (gitignored) — `run.ts` auto-loads it:

   ```ini
   AI_PROVIDER=openai
   OPENAI_BASE_URL=https://api.groq.com/openai/v1
   OPENAI_API_KEY=gsk_your_groq_key
   OPENAI_MODEL=llama-3.3-70b-versatile
   ```

   Then just:

   ```bash
   npm run eval:run
   ```

   (Get a free key at https://console.groq.com and verify the current model id
   at https://console.groq.com/docs/models.)

3. **Read the outputs.** Spot-check `results/<runId>.json` for over/understatement
   or missed exclusions and log what you find in `NOTES.md`.

## Sanity check

With no `OPENAI_API_KEY` set (or `AI_PROVIDER` unset), every trial should report
`FALLBACK` and usability should be 0% — that confirms fallback detection works
before you trust a real run.

## Faithfulness judge (roadmap 1.3)

Usability (above) only means "passed the safety gate." The judge measures the
thing that matters: does each claim trace back to the source trial text?

1. **Set a judge model** in `.env.local` — a larger, different-family model than
   the generator, to avoid self-grading bias. On Groq you only set the model
   (base URL + key default to the `OPENAI_*` values):

   ```ini
   JUDGE_MODEL=openai/gpt-oss-120b
   ```

2. **Grade the latest run:**

   ```bash
   npm run eval:judge
   ```

   Grades each factual claim (`plainEnglishSummary`, `whyMayBeRelevant`,
   `possibleEligibilityConcerns`, `missingInformation`, `sourceGroundedNotes`)
   as SUPPORTED / PARTIALLY_SUPPORTED / UNSUPPORTED / OVERSTATED, prints a
   faithfulness %, and lists flagged claims. Writes `results/<runId>-judged.json`.

3. **Calibrate the judge** (so its numbers are trustworthy):

   ```bash
   npm run eval:calibrate     # first run: writes calibration.labels.json to fill
   # ...label the humanVerdict fields blind, then:
   npm run eval:calibrate     # prints judge-vs-human agreement
   ```

