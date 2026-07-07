export function SiteFooter() {
  return (
    <footer className="no-print border-t border-line bg-white px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 text-sm text-[#7a7594]">
        <span className="font-extrabold text-ink">
          Onco
          <span className="relative italic text-grape">
            path
            <svg
              viewBox="0 0 120 14"
              fill="none"
              aria-hidden="true"
              preserveAspectRatio="none"
              className="pointer-events-none absolute -bottom-[3px] left-0 h-[6px] w-full"
            >
              <path
                d="M4 9C34 3 86 3 116 7"
                stroke="#f5b73d"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </span>
        <span>Public trial information to help you prepare for your care team.</span>
      </div>
    </footer>
  );
}
