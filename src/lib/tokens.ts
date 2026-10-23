// Class and Country colours as the mockup's tokens. `cssVar` is the variable
// defined in globals.css (use `var(...)` for SVG fills); `color` is its value.
export type Token = { cssVar: string; color: string };

export const CLASS_TOKENS = {
  realestate: { cssVar: "--cls-realestate", color: "oklch(0.7 0.11 65)" },
  stocks: { cssVar: "--cls-stocks", color: "oklch(0.62 0.12 255)" },
  cash: { cssVar: "--cls-cash", color: "oklch(0.68 0.1 175)" },
  crypto: { cssVar: "--cls-crypto", color: "oklch(0.62 0.12 305)" },
  metals: { cssVar: "--cls-metals", color: "oklch(0.78 0.11 95)" },
  other: { cssVar: "--cls-other", color: "oklch(0.66 0.04 250)" },
} as const satisfies Record<string, Token>;

export const COUNTRY_TOKENS = {
  US: { cssVar: "--country-us", color: "oklch(0.62 0.1 250)" },
  IN: { cssVar: "--country-in", color: "oklch(0.72 0.12 60)" },
} as const satisfies Record<string, Token>;

export const classFill = (id: keyof typeof CLASS_TOKENS) => `var(${CLASS_TOKENS[id].cssVar})`;
export const countryFill = (id: keyof typeof COUNTRY_TOKENS) =>
  `var(${COUNTRY_TOKENS[id].cssVar})`;
