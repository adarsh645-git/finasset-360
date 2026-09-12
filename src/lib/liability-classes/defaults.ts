// Fixed ids for the global default Liability Classes seeded by
// supabase/migrations/20260912160000_create_liability_class_and_liability.sql.
// Kept as named constants (rather than matching on name), mirroring
// src/lib/asset-classes/defaults.ts — see that file's comment for why.
export const DEFAULT_LIABILITY_CLASS_ID = {
  mortgage: "b0000000-0000-0000-0000-000000000001",
  autoLoan: "b0000000-0000-0000-0000-000000000002",
  creditCard: "b0000000-0000-0000-0000-000000000003",
} as const;
