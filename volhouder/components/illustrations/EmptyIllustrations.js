// Eigen, lichtjes "handgetekende" lijnillustraties voor lege staten — bewust
// geen icoon uit de standaard-set, dit is precies het soort detail dat een
// individuele build onderscheidt van iets dat door een heel team is gemaakt.

export function AllDoneIllustration({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path
        d="M32 6c14 0 24 9 24 22 0 8-4 14-10 18 1 3 2 6 4 8-4 1-8 0-11-2-4 1-9 1-13 0C15 50 6 41 6 28 6 15 18 6 32 6Z"
        stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
      />
      <path
        d="M22 29c2 3 5 7 6 9 4-6 9-13 14-16"
        stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function StartJourneyIllustration({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path
        d="M10 50C22 36 18 20 30 10"
        stroke="var(--border-strong)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 7"
      />
      <circle cx="10" cy="50" r="3.5" fill="var(--accent)" />
      <path
        d="M30 10v30M30 10c6-2 10 1 15-1-1 4-1 7 0 11-5 2-9-1-15 1"
        stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
