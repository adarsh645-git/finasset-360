import type { HoldingData, LiabilityData, PortfolioData } from "@/lib/read-model/types";

export const TODAY = "2026-06-15";

export function portfolio(over: Partial<PortfolioData> = {}): PortfolioData {
  return {
    today: TODAY,
    countries: [],
    fx: { today: { rate: 80, asOf: TODAY }, history: [] },
    holdings: [],
    liabilities: [],
    assumptions: {
      horizonYears: null,
      savingsGrowth: null,
      shared: { crypto: null, metals: null, other: null },
      byCountry: {
        US: { inflation: null, realestate: null, stocks: null, cash: null, monthlySavings: null },
        IN: { inflation: null, realestate: null, stocks: null, cash: null, monthlySavings: null },
      },
    },
    goals: [],
    ...over,
  };
}

export function holding(over: Partial<HoldingData> = {}): HoldingData {
  return {
    id: "h1",
    assetClass: "stocks",
    country: "US",
    currency: "USD",
    name: "Holding",
    description: null,
    propertyType: null,
    city: null,
    quantity: null,
    unit: null,
    costBasis: null,
    currentValue: 0,
    archivedAt: null,
    createdAt: "2020-01-01T00:00:00Z",
    positions: [],
    valuations: [],
    ...over,
  };
}

export function liability(over: Partial<LiabilityData> = {}): LiabilityData {
  return {
    id: "l1",
    country: "US",
    currency: "USD",
    name: "Loan",
    principal: 0,
    apr: 5,
    monthlyPayment: 0,
    termYears: null,
    startMonth: "2020-01",
    revolving: false,
    linkedHoldingId: null,
    currentBalance: 0,
    archivedAt: null,
    createdAt: "2020-01-01T00:00:00Z",
    valuations: [],
    ...over,
  };
}
