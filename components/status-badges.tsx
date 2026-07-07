const pillBase =
  "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold";

const statusStyles: Record<string, string> = {
  RECRUITING: "bg-[#eafaf1] text-[#1c8a54]",
  NOT_YET_RECRUITING: "bg-[#eef0fb] text-[#4a45c9]",
  ACTIVE_NOT_RECRUITING: "bg-cream text-amberDeep"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`${pillBase} ${
        statusStyles[status] || "bg-[#eee] text-[#555]"
      }`}
    >
      {format(status)}
    </span>
  );
}

export function PhaseBadge({ phase }: { phase: string }) {
  return (
    <span className={`${pillBase} bg-[#f0ebfb] text-grape`}>
      {format(phase)}
    </span>
  );
}

export function IdBadge({ nctId }: { nctId: string }) {
  return (
    <span className={`${pillBase} bg-[#f4f2fb] text-[#7a7594]`}>{nctId}</span>
  );
}

function format(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/PHASE(\d)/g, "PHASE $1")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
