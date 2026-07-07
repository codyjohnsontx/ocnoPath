"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
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

const fieldClass =
  "rounded-xl border-[1.5px] border-line bg-field px-[15px] py-[13px] text-[15px] text-ink outline-none transition focus:border-grape focus:ring-2 focus:ring-grape/20";
const labelClass = "grid gap-2";
const labelText = "text-sm font-bold text-ink";
const optionalText = "font-medium text-faint";

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
    <main className="flex-1">
      <div className="mx-auto max-w-[900px] animate-[fadeUp_500ms_ease-out] px-5 pb-16 pt-11 sm:px-10">
        <PageIntro
          eyebrow="Trial search"
          title="Enter the basics to search public cancer trial records."
          body="Skip names, dates of birth, and record numbers. Optional fields sharpen the search but are never required."
        />

        <form
          onSubmit={submit}
          className="mt-8 rounded-[26px] bg-white p-[30px] shadow-card"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelText}>Cancer type</span>
              <input
                required
                name="cancerType"
                placeholder="Example: breast cancer"
                className={fieldClass}
              />
            </label>

            <label className={labelClass}>
              <span className={labelText}>
                Stage <span className={optionalText}>(optional)</span>
              </span>
              <input
                name="stage"
                placeholder="Example: stage IV"
                className={fieldClass}
              />
            </label>

            <label className={labelClass}>
              <span className={labelText}>
                Biomarkers or mutations{" "}
                <span className={optionalText}>(optional)</span>
              </span>
              <input
                name="biomarkers"
                placeholder="Example: EGFR, HER2, BRCA"
                className={fieldClass}
              />
            </label>

            <label className={labelClass}>
              <span className={labelText}>
                Prior treatments{" "}
                <span className={optionalText}>(optional)</span>
              </span>
              <input
                name="priorTreatments"
                placeholder="Example: chemotherapy"
                className={fieldClass}
              />
            </label>

            <label className={labelClass}>
              <span className={labelText}>Age group</span>
              <select required name="ageGroup" defaultValue="adult" className={fieldClass}>
                <option value="adult">Adult</option>
                <option value="pediatric">Pediatric</option>
              </select>
            </label>

            <label className={labelClass}>
              <span className={labelText}>ZIP code or city/state</span>
              <input
                required
                name="location"
                placeholder="Example: Austin, TX"
                className={fieldClass}
              />
            </label>

            <label className={labelClass}>
              <span className={labelText}>Travel radius</span>
              <select name="radius" defaultValue="100" className={fieldClass}>
                <option value="25">25 miles</option>
                <option value="50">50 miles</option>
                <option value="100">100 miles</option>
                <option value="250">250 miles</option>
                <option value="500">500 miles</option>
              </select>
            </label>

            <label className={labelClass}>
              <span className={labelText}>
                Willingness to travel{" "}
                <span className={optionalText}>(optional)</span>
              </span>
              <select name="willingnessToTravel" defaultValue="" className={fieldClass}>
                <option value="">No preference</option>
                <option value="local only">Local only</option>
                <option value="regional travel">Regional travel</option>
                <option value="open to travel">Open to travel</option>
              </select>
            </label>

            <label className={`${labelClass} sm:col-span-2`}>
              <span className={labelText}>
                Trial phase preference{" "}
                <span className={optionalText}>(optional)</span>
              </span>
              <select name="phase" defaultValue="" className={fieldClass}>
                <option value="">No phase preference</option>
                {phases.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6">
            <span className={labelText}>Recruiting status</span>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {statuses.map((status) => {
                const on = selectedStatuses.includes(status.value);
                return (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => toggleStatus(status.value)}
                    className={`rounded-xl border-[1.5px] px-4 py-2.5 text-sm font-semibold transition ${
                      on
                        ? "border-grape bg-grape text-white"
                        : "border-line2 bg-white text-muted hover:border-grape"
                    }`}
                  >
                    {status.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-[26px] flex flex-col gap-4 border-t border-hair pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[420px] text-[13.5px] leading-[1.5] text-faint">
              🔒 Searches request public trial records. Saved searches stay in
              this browser only.
            </p>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-grape px-[30px] py-[15px] text-[15.5px] font-bold text-white shadow-btn transition hover:bg-grapeDark"
            >
              Search trials
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
      <MedicalDisclaimer />
    </main>
  );
}
