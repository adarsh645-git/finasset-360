// Fixed ids for the global default Asset Classes seeded by
// supabase/migrations/20260912145721_create_asset_class_and_holding.sql.
// Kept as named constants (rather than matching on name) so a User renaming
// their view of a class, or a future locale, can never change which icon a
// default class renders with — and so a custom class, which never has one
// of these ids, takes the fallback path in AssetClassIcon by construction
// rather than by string comparison.
export const DEFAULT_ASSET_CLASS_ID = {
  realEstate: "a0000000-0000-0000-0000-000000000001",
  equity: "a0000000-0000-0000-0000-000000000002",
  preciousMetal: "a0000000-0000-0000-0000-000000000003",
  cash: "a0000000-0000-0000-0000-000000000004",
  crypto: "a0000000-0000-0000-0000-000000000005",
} as const;
