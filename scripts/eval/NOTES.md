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
