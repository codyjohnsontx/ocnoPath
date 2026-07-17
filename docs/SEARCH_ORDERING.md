# Search ordering and pagination

OncoPath does not rank trials by expected benefit, treatment quality, or likely
eligibility. Search ordering is limited to source relevance and travel logistics.

## Candidate sequence

ClinicalTrials.gov determines the initial candidate sequence using its search
relevance behavior. OncoPath consumes that sequence through the API's opaque
forward cursor. A cursor is an implementation detail and does not contain an
eligibility or relevance score from OncoPath.

## Local validation

Before a candidate can appear, OncoPath verifies that:

- its registered condition is consistent with the entered cancer type;
- it has a site inside the selected straight-line radius;
- that site has one of the selected recruiting statuses; and
- age, phase, status, and optional search terms were included in the source query.

Records that fail these checks are skipped. The service continues consuming
source records until it has 12 validated records, reaches the end of the source
results, or reaches its request safety limit. No skipped or unshown record is
silently converted into sample data.

## Page ordering

Each page contains at most 12 validated records. Within that page, records are
ordered by straight-line distance to the nearest matching site. Equal distances
are ordered by NCT ID for deterministic output.

This means source relevance determines which candidates are considered before
later pages, while distance controls presentation inside the current page. A
record on page 2 may be closer than a record on page 1. Proximity is logistical
information only and does not indicate medical relevance or eligibility.

## Counts

The ClinicalTrials.gov total shown by the product is the number of source
candidates before OncoPath's local condition and site checks. It is not a count
of trials for which a person may be eligible.
