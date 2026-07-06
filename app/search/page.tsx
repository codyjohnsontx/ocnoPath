"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AlertTriangle, ArrowRight, LockKeyhole } from "lucide-react";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { PageIntro } from "@/components/page-intro";

const statuses = [
  { label: "Recruiting", value: "RECRUITING" },
  { label: "Not yet recruiting", value: "NOT_YET_RECRUITING" },
  { label: "Active, not recruiting", value: "ACTIVE_NOT_RECRUITING" }
];

const phases = [
  "EARLY_PHASE1",
  "PHASE1",
  "PHASE2",
  "PHASE3",
  "PHASE4",
  "NOT_APPLICABLE"
];

export default function SearchPage() {
  const router = useRouter();
  const [selectedStatuses, setSelectedStatuses] = useState(["RECRUITING"]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const [key, value] of data.entries()) {
      const text = String(value).trim();
      if (text) params.append(key, text);
    }

    selectedStatuses.forEach((status) => params.append("status", status));
    router.push(`/results?${params.toString()}`);
  }

  function toggleStatus(status: string) {
    setSelectedStatuses((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status]
    );
  }

  return (
    <main className="min-h-screen bg-clinical px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <PageIntro
          eyebrow="Trial search"
          title="Enter the basic details needed to search public cancer trial records."
          body="Avoid names, dates of birth, medical record numbers, or other personal identifiers. Optional fields can improve the search, but they are not required."
        />

        <div className="mt-8 rounded-md border border-line bg-white p-5 shadow-soft">
          <div className="mb-6 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} />
            <p>
              This search does not confirm eligibility. Use results to prepare
              questions for your oncology care team.
            </p>
          </div>

          <form onSubmit={submit} className="grid gap-6">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">
                  Cancer type
                </span>
                <input
                  required
                  name="cancerType"
                  placeholder="Example: breast cancer"
                  className="rounded-md border border-line bg-white px-3 py-3 text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">
                  Stage <span className="font-normal text-slateblue">(optional)</span>
                </span>
                <input
                  name="stage"
                  placeholder="Example: stage IV"
                  className="rounded-md border border-line bg-white px-3 py-3 text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">
                  Biomarkers or mutations{" "}
                  <span className="font-normal text-slateblue">(optional)</span>
                </span>
                <input
                  name="biomarkers"
                  placeholder="Example: EGFR, HER2, BRCA"
                  className="rounded-md border border-line bg-white px-3 py-3 text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">
                  Prior treatments{" "}
                  <span className="font-normal text-slateblue">(optional)</span>
                </span>
                <input
                  name="priorTreatments"
                  placeholder="Example: chemotherapy, immunotherapy"
                  className="rounded-md border border-line bg-white px-3 py-3 text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Age group</span>
                <select
                  required
                  name="ageGroup"
                  defaultValue="adult"
                  className="rounded-md border border-line bg-white px-3 py-3 text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20"
                >
                  <option value="adult">Adult</option>
                  <option value="pediatric">Pediatric</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">
                  ZIP code or city/state
                </span>
                <input
                  required
                  name="location"
                  placeholder="Example: Austin, TX"
                  className="rounded-md border border-line bg-white px-3 py-3 text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">
                  Travel radius
                </span>
                <select
                  name="radius"
                  defaultValue="100"
                  className="rounded-md border border-line bg-white px-3 py-3 text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20"
                >
                  <option value="25">25 miles</option>
                  <option value="50">50 miles</option>
                  <option value="100">100 miles</option>
                  <option value="250">250 miles</option>
                  <option value="500">500 miles</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">
                  Willingness to travel{" "}
                  <span className="font-normal text-slateblue">(optional)</span>
                </span>
                <select
                  name="willingnessToTravel"
                  defaultValue=""
                  className="rounded-md border border-line bg-white px-3 py-3 text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20"
                >
                  <option value="">No preference</option>
                  <option value="local only">Local only</option>
                  <option value="regional travel">Regional travel</option>
                  <option value="open to travel">Open to travel</option>
                </select>
              </label>
            </div>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-ink">
                Recruiting status
              </legend>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => toggleStatus(status.value)}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                      selectedStatuses.includes(status.value)
                        ? "border-action bg-action text-white"
                        : "border-line bg-white text-slateblue hover:border-action"
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">
                Trial phase preference{" "}
                <span className="font-normal text-slateblue">(optional)</span>
              </span>
              <select
                name="phase"
                defaultValue=""
                className="rounded-md border border-line bg-white px-3 py-3 text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20"
              >
                <option value="">No phase preference</option>
                {phases.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex max-w-xl gap-2 text-sm leading-6 text-slateblue">
                <LockKeyhole className="mt-0.5 shrink-0" size={16} />
                Searches are used to request public trial records. Saved
                searches stay in this browser only.
              </p>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-action px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2"
              >
                Search trials
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
      <MedicalDisclaimer />
    </main>
  );
}
