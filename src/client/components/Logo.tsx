/** VIO logo (#227, N3 arredondada): open O, round ends, square dot on the baseline. */
export function Logo({ label = true }: { label?: boolean }) {
  return (
    <svg
      className="brand-logo"
      viewBox="0 0 268 100"
      role={label ? "img" : undefined}
      aria-label={label ? "VIO" : undefined}
      aria-hidden={label ? undefined : true}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="24"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 12 L44 88 L68.4 30" />
        <path d="M106 36 L106 88" />
        <path d="M195.17 15.16 A38 38 0 1 1 145.3 34.51" />
      </g>
      <rect
        className="brand-logo-dot"
        data-ponto="logo"
        x="244"
        y="78"
        width="22"
        height="22"
        rx="6"
      />
    </svg>
  );
}
