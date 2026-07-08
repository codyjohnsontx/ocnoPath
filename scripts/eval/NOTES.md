# Eval notes

Manual observations from reading eval runs. Raw material for the faithfulness
judge (roadmap 1.3) and the published report (1.5).

## How to use this file

For each run, note the model + date and jot what you see. Watch for:

- **Overstatement** — any hint of eligibility, ranking, or "you qualify" the
  blocklist missed.
- **Hallucination** — claims not supported by `briefSummary` /
  `eligibilityCriteria`.
- **Missed exclusions** — a key exclusion criterion the notes should have
  surfaced but didn't.
- **Tone drift** — anything that reads as advice or recommendation.
- **Fallback triggers** — which trials fell back and why (JSON parse fail,
  validation fail, timeout?).

## Runs

### 2026-07-08 — Groq llama-3.3-70b-versatile (first real run)

- Usability: 0/12 (0%) — all fell back with "AI output did not pass safety validation."
- Root cause (via one raw-output diagnostic): **not** a model-quality problem. The
  model returns all 7 fields, cautious language, no prohibited phrases, and
  non-empty lists. It fails a single gate in `validateExplanation`: the required
  `safetyWarnings` entry must contain *both* "oncology care team" and "trial team"
  in one string. The model wrote "discuss with your oncology team" — close, but
  not the exact phrases — so 100% of good explanations were discarded.
- The system prompt never states this phrase is mandatory, so the model can't
  satisfy an undocumented rule. This is a validator/prompt-contract gap.
- Fix candidates (roadmap 1.4):
  1. Guarantee the canonical safety warning by construction (app appends it) so a
     safety-critical disclaimer never depends on the LLM remembering to say it.
  2. And/or state the exact required warning in the system prompt.
- Follow-up: after the fix, re-run to get the true model usability rate, then
  move to faithfulness grading (1.3).

### 2026-07-08 — Groq llama-3.3-70b-versatile (after Option A fix)

- Usability: **12/12 (100%)**, 0 fallback.
- Fix: guarantee the canonical disclaimer by construction (ensureSafetyWarning)
  and drop the phrase-match gate from validateExplanation; kept the
  prohibited-language + structure gates. Result: well-formed model explanations
  are no longer discarded, and the mandatory disclaimer is always present
  regardless of the model.
- IMPORTANT — do not overclaim: "usability" = *passed the safety gate / not a
  fallback*. It does **not** mean the explanations are faithful or accurate.
  Claim-level faithfulness grading is the next slice (1.3); that's where the real
  quality number comes from.
- Next: read a few full outputs for over/understatement, then build the judge.

### 2026-07-08 — read-through + drop model safetyWarnings

- Manual read (3 trials: simple breast, CAR-T, melanoma combo): summaries and
  eligibility extraction are faithful and genuinely useful. **One systemic leak:**
  the model used `safetyWarnings` to freelance clinical risk claims — e.g. it
  reframed exclusion criteria ("patients with cardiomyopathy are excluded") into
  risk assertions ("at risk for cardiac complications"), and added terms not in
  the source ("cardiovascular events", "hemorrhage" — verified absent via grep).
  Grounded-but-reframed and outright-ungrounded claims both violate "use only the
  provided info," in the field that reads most like medical advice.
- Fix (1.4): dropped `safetyWarnings` from the model schema; the app now emits
  only the guaranteed canonical disclaimer. Re-run confirms all 12 have exactly
  that one warning — freelancing eliminated.
- Usability this run: 11/12 (92%). The 1 fallback was NCT05136196 (14,403-char
  eligibility) with reason "AI explanation service was unavailable" — a transient
  throw on the largest prompt (it passed in the prior run), NOT caused by this
  change. Robustness follow-up: add retry + timeout handling for large prompts,
  and make the catch-all reason distinguish timeout vs. invalid-JSON vs. network.
- Minor content nits for later: some `possibleEligibilityConcerns` are actually
  inclusion criteria (mis-bucketed); "You have been diagnosed with..." reads as
  asserting facts about the reader.
- Next: build the claim-level faithfulness judge (1.3) against this cleaner baseline.
- Rate-limit observation: running the full eval several times in quick succession
  hits Groq's free-tier limit — the first ~5 calls succeed, then the rest throw and
  fall back with the same generic "service unavailable" reason (a masked 429).
  Reinforces the retry/backoff + granular-fallback-reason TODO. Space out runs, or
  add backoff before drawing conclusions from a low usability number.

### 2026-07-08 — first faithfulness run (judge = Groq openai/gpt-oss-120b)

- Graded the 11-explanation run (post-safetyWarnings). **Faithfulness: 81%
  (100/123 claims SUPPORTED)**; 10 UNSUPPORTED, 3 OVERSTATED, 10 PARTIALLY.
- **Judge bug found & fixed (eval-of-the-eval):** first pass read 67% because the
  judge was only shown `{title, conditions, briefSummary, eligibilityCriteria}`
  while the generator also sees `status, phase, locations, lastUpdated, sourceUrl`.
  It false-flagged grounded claims ("currently recruiting", dates, locations,
  "on clinicaltrials.gov") as UNSUPPORTED. Fixed judge to full source parity with
  lib/explanation.ts's userPrompt → 81%.
- Recurring real findings (both cluster in `sourceGroundedNotes` / `whyMayBeRelevant`):
  1. **Sponsor hallucination** — invents sponsor names not in any source field
     (Iovance, Case Comprehensive Cancer Center, etc.).
  2. **Reader-assertion** — fabricates the reader's situation ("You are looking
     for alternative surgical procedures...").
  Candidate fix (future slice): drop/constrain `sourceGroundedNotes` like we did
  `safetyWarnings`, and forbid second-person assertions in the prompt.
- **Do not trust 81% yet:** it's the judge's own number. A few flags are borderline
  (e.g. "consult your oncology team" marked unsupported). Calibration template
  generated (`calibration.labels.json`, 6 blind claims) — needs Cody's labels to
  measure judge-vs-human agreement before the number is trustworthy.

### 2026-07-08 — calibration round 1 (n=6, human = Cody)

- Agreement: **exact 2/6 (33%), faithful-vs-not 3/6 (50%)**. Low — so **the 81%
  is not yet trustworthy**; the judge and a human disagree systematically.
- Systematic disagreement #1 (the important one): second-person "You have…/You are
  looking for…" claims. Judge = SUPPORTED (the underlying facts match eligibility);
  human = UNSUPPORTED (the source says nothing about the *reader*). For a medical
  app the conservative human read is the right standard — the app must not assert a
  reader's diagnosis or wishes. **The judge is too lenient on reader-assertions**,
  and the generator shouldn't produce them at all.
- Disagreement #2: "new treatment approach" — here the judge was stricter than the
  human. Genuine gray area.
- Actions (next slice): (a) tighten the judge prompt so claims asserting facts about
  the reader that aren't in the source count UNSUPPORTED; (b) better, fix the
  GENERATOR to stop second-person reader-assertions (product/safety win); (c) re-run
  judge + re-calibrate; (d) expand the calibration sample beyond n=6.
- Caveat: n=6 is a small sample — directional, not definitive. The value here is the
  *pattern* it exposed, not the exact %.
