import { ExternalLink } from "lucide-react";
import { PhaseBadge, StatusBadge } from "@/components/status-badges";

export function TrialExample() {
  return (
    <article className="rounded-md border border-line bg-clinical p-5 shadow-soft">
      <div className="flex flex-wrap gap-2">
        <StatusBadge status="RECRUITING" />
        <PhaseBadge phase="PHASE2" />
        <span className="rounded-md border border-line bg-white px-2 py-1 text-xs font-semibold text-slateblue">
          NCT example
        </span>
      </div>
      <h3 className="mt-5 text-2xl font-semibold leading-tight text-ink">
        Study of a targeted therapy combination for advanced solid tumors
      </h3>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <ExampleSection
          title="Why it may be relevant"
          text="The public record describes a cancer treatment study for people with advanced solid tumors."
        />
        <ExampleSection
          title="Possible eligibility concerns"
          text="Eligibility may depend on diagnosis details, prior treatments, lab results, and performance status."
        />
        <ExampleSection
          title="Missing information"
          text="The record may not state whether a specific biomarker result or prior therapy history applies."
        />
        <ExampleSection
          title="Questions to ask"
          text="Would this trial's diagnosis, treatment history, and travel requirements be worth reviewing for my case?"
        />
      </dl>
      <div className="mt-6 flex items-center gap-2 border-t border-line pt-4 text-sm font-semibold text-action">
        Official source link
        <ExternalLink size={15} />
      </div>
    </article>
  );
}

function ExampleSection({ title, text }: { title: string; text: string }) {
  return (
    <div className="border-t border-line pt-4">
      <dt className="font-semibold text-ink">{title}</dt>
      <dd className="mt-2 leading-6 text-slateblue">{text}</dd>
    </div>
  );
}
