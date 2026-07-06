const statusStyles: Record<string, string> = {
  RECRUITING: "border-teal-200 bg-teal-50 text-teal-900",
  NOT_YET_RECRUITING: "border-blue-200 bg-blue-50 text-blue-900",
  ACTIVE_NOT_RECRUITING: "border-slate-200 bg-slate-50 text-slate-800"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-md border px-2 py-1 text-xs font-semibold ${
        statusStyles[status] || "border-line bg-clinical text-slateblue"
      }`}
    >
      {format(status)}
    </span>
  );
}

export function PhaseBadge({ phase }: { phase: string }) {
  return (
    <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-950">
      {format(phase)}
    </span>
  );
}

function format(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/PHASE(\d)/g, "PHASE $1")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
