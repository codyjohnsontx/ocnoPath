const pillBase =
  "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold";

const ok = "bg-okSoft text-okText";
const info = "bg-infoSoft text-infoText";
const warn = "bg-cream text-amberDeep";
const neutral = "bg-neutralSoft text-neutralText";

const statusStyles: Record<string, string> = {
  RECRUITING: ok,
  ENROLLING_BY_INVITATION: ok,
  NOT_YET_RECRUITING: info,
  ACTIVE_NOT_RECRUITING: warn,
  SUSPENDED: warn,
  COMPLETED: neutral,
  TERMINATED: neutral,
  WITHDRAWN: neutral,
  UNKNOWN: neutral
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`${pillBase} ${statusStyles[status] || neutral}`}>
      {format(status)}
    </span>
  );
}

export function PhaseBadge({ phase }: { phase: string }) {
  return <span className={`${pillBase} bg-grapeSoft text-grape`}>{format(phase)}</span>;
}

export function PhaseBadges({ phases }: { phases: string[] }) {
  const values = phases.length ? phases : ["UNKNOWN"];
  return (
    <>
      {values.map((phase) => (
        <PhaseBadge key={phase} phase={phase} />
      ))}
    </>
  );
}

export function IdBadge({ nctId }: { nctId: string }) {
  return <span className={`${pillBase} ${neutral}`}>{nctId}</span>;
}

function format(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/PHASE(\d)/g, "PHASE $1")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
