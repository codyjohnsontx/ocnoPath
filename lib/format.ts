import type { TrialRecord } from "@/lib/types";

/**
 * Human-readable summary of a trial's locations for card/detail display.
 * Shows the first location's city/state (or country), with a "+N more"
 * suffix when the trial lists additional sites.
 */
export function formatLocations(trial: TrialRecord) {
  if (!trial.locations.length) return "Not stated";
  const first = trial.locations[0];
  const cityState = [first.city, first.state].filter(Boolean).join(", ");
  return trial.locations.length > 1
    ? `${cityState || first.country || "Listed"} + ${trial.locations.length - 1} more`
    : cityState || first.country || "Listed";
}
