# OncoPath Roadmap

North star: **credible and real**. OncoPath must be honest about what it searched,
what the public record says, what the model inferred, and what remains unknown.
Search correctness and explanation faithfulness are release gates, not polish.

## Product gates

1. Search results must honor every visible filter.
2. Synthetic records must never appear as live trial data.
3. Every AI factual claim must be traceable to supplied source text.
4. The product must not imply eligibility, ranking, treatment advice, or expected benefit.
5. User-entered health context must be minimized, short-lived, and disclosed when transmitted.

## Phase 0 - Shipped baseline

- [x] Next.js MVP with landing, search, results, trial detail, and discussion sheet
- [x] ClinicalTrials.gov v2 integration
- [x] Browser-local saved searches and discussion sheet
- [x] Deterministic explanation fallback and prohibited-language validator
- [x] Groq/OpenAI-compatible and local Ollama model options
- [x] Explanation evaluation fixtures, judge, and human-calibration harness

## Phase 1 - Search integrity (current release gate)

- [x] 1.1 Map cancer, age, phase, status, stage, biomarker, and prior-treatment inputs to valid ClinicalTrials.gov queries
- [x] 1.2 Resolve US ZIP or City, ST locally and enforce the selected geographic radius
- [x] 1.3 Return the nearest site whose site status matches the selected recruiting status
- [x] 1.4 Remove silent synthetic fallback records; show a source-unavailable state instead
- [x] 1.5 Return and display source status, resolved origin, radius, and applied-filter metadata
- [x] 1.6 Add regression tests for query construction, distance, site status, invalid location, and upstream failure
- [x] 1.7 Add pagination and a documented ordering policy after distance correctness is proven

Success criteria: every returned card has a matching site inside the selected radius,
phase and age filters are verified against the returned record, and an upstream error
cannot produce a trial card.

## Phase 2 - Explanation faithfulness (release gate)

- [x] 2.1 Gold set of 12 real trials and reproducible model runs
- [x] 2.2 Claim-level faithfulness judge and first human calibration
- [ ] 2.3 Remove free-form source-grounded notes and second-person reader assertions
- [ ] 2.4 Require each factual claim to include a source field and exact supporting excerpt
- [ ] 2.5 Reject or replace any claim whose evidence cannot be verified deterministically
- [ ] 2.6 Keep oncology-team questions deterministic until generated questions pass a separate safety eval
- [ ] 2.7 Expand the gold set to at least 30 varied oncology trials
- [ ] 2.8 Recalibrate the judge; do not publish an accuracy percentage until agreement is acceptable
- [ ] 2.9 Publish `REPORT.md` with methods, failures, limitations, and representative examples

Success criteria: no unsupported claim reaches the UI in the gold-set run, and the
human-calibrated evaluator is conservative about reader-specific assertions.

## Phase 3 - Privacy and API hardening

- [ ] 3.1 Remove medical search details from browser URLs and hosting access logs
- [ ] 3.2 Stop sending user search context to the explanation model
- [ ] 3.3 Make the explanation endpoint accept only an NCT ID and fetch trusted source data server-side
- [ ] 3.4 Add request-size limits, timeouts, retry policy, rate limiting, and granular provider errors
- [ ] 3.5 Publish clear privacy copy covering ClinicalTrials.gov and AI-provider transmission
- [ ] 3.6 Add retention rules and a one-action local-data reset
- [ ] 3.7 Add structured audit events that contain no medical search content

## Phase 4 - Product usefulness and transparency

- [ ] 4.1 Show why each trial matched without implying eligibility
- [ ] 4.2 Flag obvious search conflicts, such as a negative biomarker when a positive biomarker was entered
- [ ] 4.3 Distinguish official source text, deterministic notes, AI explanations, and fallback content
- [ ] 4.4 Add explanation error and retry states instead of indefinite loading
- [ ] 4.5 Add saved-search management or remove the unfinished save control
- [ ] 4.6 Add confirmations for save, add-to-sheet, remove, and clear actions
- [ ] 4.7 Improve the discussion sheet with concerns, missing information, source links, dates, and generation mode
- [ ] 4.8 Add caregiver mode and multiple local shortlists

## Phase 5 - Accessibility and design credibility

- [ ] 5.1 Meet WCAG AA contrast and keyboard/focus requirements
- [ ] 5.2 Replace the generic purple SaaS treatment with a quieter clinical research system
- [ ] 5.3 Use the primary tagline and a real, clearly labeled trial-explanation example on the homepage
- [ ] 5.4 Add methodology, privacy, limitations, and trust pages
- [ ] 5.5 Improve mobile navigation, result scanning, long-summary handling, and print/PDF output
- [ ] 5.6 Run browser and assistive-technology checks across desktop and mobile breakpoints

## Phase 6 - Deployment and enterprise path

- [ ] 6.1 Deploy the gated MVP with health checks and honest provider-unavailable UX
- [ ] 6.2 Add a locally ingested ClinicalTrials.gov dataset and change detection
- [ ] 6.3 Support local database, private vector search, and local/private model adapters
- [ ] 6.4 Add RBAC, audit logs, human review, and clinician/trial-coordinator workflows
- [ ] 6.5 Add EHR/FHIR integration and medical terminology support only inside a secure deployment
- [ ] 6.6 Prove a no-third-party-API, no-cloud-egress enterprise configuration

## Ongoing evidence

- [ ] Record major safety and architecture decisions in a decision log
- [ ] Keep the evaluation model aligned with the production model
- [ ] Add a regression case for every confirmed search or explanation failure
- [ ] Keep portfolio claims narrower than the evidence in the latest published report
