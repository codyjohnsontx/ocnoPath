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
