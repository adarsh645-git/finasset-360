// The projection toggle is one setting shared by every chart: a cookie,
// on by default (design D8).
export const ONE_YEAR_SECONDS = 31536000;
export const PROJECTION_COOKIE = "projection";

export const resolveProjection = (stored: string | null | undefined): boolean => stored !== "off";

export const projectionCookie = (on: boolean): string =>
  `${PROJECTION_COOKIE}=${on ? "on" : "off"}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;

export const projectionLabel = (on: boolean, horizonYears: number): string =>
  on ? `${horizonYears}-yr projection on` : "Projection off";
