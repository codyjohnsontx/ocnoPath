# OncoPath Roadmap

North star: **credible + real**. Two tracks move together — the product, and the
evidence that it's safe and accurate. We don't build features that imply
eligibility or ranking. What we refuse to build is part of the product.

Gating principle: each phase depends on the one before it. We don't build trial
matching (Phase 4) before faithfulness is proven (Phase 1).

## Phase 0 — Shipped baseline
- [x] Trial search over ClinicalTrials.gov v2
- [x] Results, trial detail, printable discussion sheet
- [x] AI plain-English explanations w/ safety validator + deterministic fallback
- [x] Browser-local saved searches + sheet (no PHI collected, HIPAA sidestepped by design)
- [x] Purple/amber redesign + accessibility/review passes

## Phase 1 — Prove it works (trust & evidence)  ← CURRENT
- [x] 1.0 Wire Groq hosted model (production model = the model we evaluate)
- [x] 1.1 Gold set of real trials (12; grow toward ~30)
- [x] 1.2 Thin eval: snapshot + run + usability/fallback rate + manual read (Groq llama-3.3-70b: 12/12 usable after the validator fix)
- [ ] 1.3 Automated faithfulness judge (claim-level source grounding) + human-calibrated subset  ← NEXT
- [ ] 1.4 Overstatement/eligibility scan beyond current blocklist; export & harden validateExplanation
      (partial: disclaimer now guaranteed by construction; broader overstatement scan still TODO)
- [ ] 1.5 Published eval REPORT.md + written case study (the flagship portfolio artifact)
- [ ] 1.6 Product principles / non-goals doc + decision log

## Phase 2 — Trustworthy in-product (transparency)
- [ ] 2.1 Show source snippets next to each explanation claim (traceability)
- [ ] 2.2 Surface uncertainty / "missing info" prominently; label when fallback was used
- [ ] 2.3 "How we generate this" methodology page
- [ ] 2.4 Deploy online (Vercel + Groq) with honest model-unavailable UX

## Phase 3 — Reach & usability (distribution + caregiver)
- [ ] 3.1 Caregiver mode (researching for someone else; multiple shortlists)
- [ ] 3.2 Discussion sheet polish (PDF quality, share/print)
- [ ] 3.3 Accessibility pass (WCAG AA)
- [ ] 3.4 Entry points: SEO, methodology transparency, advocacy-org outreach framing

## Phase 4 — Depth & scale (only if going more real)
- [ ] 4.1 Saved profile + trial surfacing (within non-goals: surface, never rank/qualify)
- [ ] 4.2 Data cache/DB (Prisma already scaffolded) + trial-change detection
- [ ] 4.3 Trial status-change alerts
- [ ] 4.4 Privacy-preserving analytics to learn what actually helps

## Cross-cutting (ongoing)
- [ ] Decision-log entry per major choice
- [ ] Case study + changelog updates as items merge
