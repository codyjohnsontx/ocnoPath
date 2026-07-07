/**
 * The OncoPath "doodle" underline — a hand-drawn squiggle that sits under
 * emphasized words. Renders italic grape-colored text with a stretchy SVG
 * underline that scales to the word's width.
 */
export function Squiggle({
  children,
  color = "#f5b73d",
  className = ""
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`relative whitespace-nowrap italic text-grape ${className}`}
    >
      {children}
      <svg
        viewBox="0 0 120 14"
        fill="none"
        aria-hidden="true"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-2 left-0 h-[0.4em] w-full"
      >
        <path
          d="M4 9C34 3 86 3 116 7"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}
