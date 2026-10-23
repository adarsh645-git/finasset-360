// Class and Country colours as the mockup's tokens. `cssVar` is the variable
// defined in globals.css, the one place the colour values live (use `var(...)` for SVG fills).
export type Token = { cssVar: string };

export const CLASS_TOKENS = {
  realestate: { cssVar: "--cls-realestate" },
  stocks: { cssVar: "--cls-stocks" },
  cash: { cssVar: "--cls-cash" },
  crypto: { cssVar: "--cls-crypto" },
  metals: { cssVar: "--cls-metals" },
  other: { cssVar: "--cls-other" },
} as const satisfies Record<string, Token>;

export const COUNTRY_TOKENS = {
  US: { cssVar: "--country-us" },
  IN: { cssVar: "--country-in" },
} as const satisfies Record<string, Token>;

export const classFill = (id: keyof typeof CLASS_TOKENS) => `var(${CLASS_TOKENS[id].cssVar})`;
export const countryFill = (id: keyof typeof COUNTRY_TOKENS) =>
  `var(${COUNTRY_TOKENS[id].cssVar})`;
