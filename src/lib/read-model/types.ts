// The read model's shape (design.md "Read model shape"). Later changes consume
// it, so keep it in step with the design. Rates are percent per year as
// stored (7 = 7%); amounts are in the item's native currency; dates are
// `YYYY-MM-DD`; blanks are null.

export type CountryCode = "US" | "IN";
export type AssetClassId = "realestate" | "stocks" | "cash" | "crypto" | "metals" | "other";

export type PositionData = {
  ticker: string;
  shares: number;
  avgCost: number;
  price: number;
  priceSource: "market" | "hand";
  /** Set only for hand-priced Positions. */
  priceAsOf: string | null;
  name: string;
  sector: string;
  exchange: string | null;
};

export type HoldingData = {
  id: string;
  assetClass: AssetClassId;
  country: CountryCode;
  currency: "USD" | "INR";
  name: string;
  description: string | null;
  propertyType: string | null;
  city: string | null;
  quantity: number | null;
  unit: string | null;
  costBasis: number | null;
  currentValue: number;
  archivedAt: string | null;
  createdAt: string;
  positions: PositionData[];
  /** Oldest first. */
  valuations: { date: string; value: number; source: "user" | "cron" }[];
};

export type LiabilityData = {
  id: string;
  country: CountryCode;
  currency: "USD" | "INR";
  name: string;
  principal: number;
  apr: number;
  monthlyPayment: number;
  termYears: number | null;
  startMonth: string;
  revolving: boolean;
  linkedHoldingId: string | null;
  currentBalance: number;
  archivedAt: string | null;
  createdAt: string;
  /** Oldest first. */
  valuations: { date: string; value: number; source: "user" }[];
};

export type CountryAssumptionsData = {
  inflation: number | null;
  realestate: number | null;
  stocks: number | null;
  cash: number | null;
  monthlySavings: number | null;
};

export type PortfolioData = {
  today: string;
  countries: {
    code: CountryCode;
    name: string;
    currency: "USD" | "INR";
    defaults: { inflation: number; realestate: number; stocks: number; cash: number };
  }[];
  fx: {
    today: { rate: number; asOf: string } | null;
    history: { date: string; rate: number }[];
  };
  holdings: HoldingData[];
  liabilities: LiabilityData[];
  assumptions: {
    horizonYears: number | null;
    savingsGrowth: number | null;
    shared: { crypto: number | null; metals: number | null; other: number | null };
    byCountry: Record<CountryCode, CountryAssumptionsData>;
  };
  goals: { id: string; name: string | null; targetUsd: number }[];
};
