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

### <date> — <model>
- Usability: __/12 (__%)
- Notable:
  -
