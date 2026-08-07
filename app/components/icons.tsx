/**
 * Small outline icon set (Heroicons-style paths, hand-picked, MIT-equivalent
 * shapes) used across the dashboard stat tiles. Kept local instead of an
 * extra dependency since we only need a handful.
 */
type IconProps = { className?: string };

export function IconCurrency({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 6v12M15.5 8.5c0-1.38-1.57-2.5-3.5-2.5s-3.5 1.12-3.5 2.5c0 1.38 1.57 2.25 3.5 2.5s3.5 1.12 3.5 2.5-1.57 2.5-3.5 2.5-3.5-1.12-3.5-2.5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.8} />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth={1.8} />
      <path
        d="M3.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path
        d="M15.5 5.5c1.66.4 2.9 1.9 2.9 3.7 0 1.8-1.24 3.3-2.9 3.7M18 14.5c2 .5 3.5 2.4 3.5 4.7"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconTag({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M11.6 3.5H6a2.5 2.5 0 0 0-2.5 2.5v5.6c0 .53.21 1.04.59 1.41l8.8 8.8a2 2 0 0 0 2.82 0l5.6-5.6a2 2 0 0 0 0-2.82l-8.8-8.8a2 2 0 0 0-1.41-.6Z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <circle cx="8.25" cy="8.25" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function IconCursorClick({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 4.5 8.2 18l2.9-4.3 3.4 3.4 1.6-1.6-3.4-3.4L17 9.2 6 4.5Z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M3 3l1 1M3 9h1.5M9 3v1.5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconTrendUp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 16l6-6 4 4 8-8M21 6h-5.5M21 6v5.5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
