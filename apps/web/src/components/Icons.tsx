/**
 * @file Inline SVG icons and the logo. Inline so they inherit color and need no extra requests.
 */

/** Attack icon, drawn with `currentColor` so it takes the color of the text around it. */
export function SwordIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeLinecap="round" fill="none">
        <path d="M13.5 2.5 6 10" strokeWidth="2.2" />
        <path d="m3.8 8.6 3.6 3.6" strokeWidth="1.6" />
        <path d="M5.2 10.8 2.4 13.6" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

/** Heart used on every sponsor call to action. */
export function HeartIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 14s-5.5-3.3-5.5-7.2C2.5 4.6 4 3 5.9 3c1 0 1.7.5 2.1 1.2C8.4 3.5 9.1 3 10.1 3 12 3 13.5 4.6 13.5 6.8 13.5 10.7 8 14 8 14Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** GitHub mark, for the links to the repository and the author's profile. */
export function GitHubIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  );
}

/**
 * Métrix logo: a tile with the brand gradient (cyan to violet) and a cut-out M.
 * Keep it in sync with `public/favicon.svg` and `docs/logo.svg`.
 */
export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00f0ff" />
          <stop offset="1" stopColor="#7b2ff7" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-gradient)" />
      <path
        d="M14 46V19l18 17 18-17v27"
        fill="none"
        stroke="#0d1117"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Defense icon, drawn with `currentColor` so it takes the color of the text around it. */
export function ShieldIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M8 1.5 2.5 3.5v4c0 3.3 2.3 5.9 5.5 7 3.2-1.1 5.5-3.7 5.5-7v-4L8 1.5Z" fill="currentColor" />
    </svg>
  );
}
