// The one column list every Holding route selects — GET, POST, PATCH and
// the archive route all return the exact same shape, so ticket 07's two
// new columns (price_lookup_symbol, quantity), ticket 18's `sector`, and
// ticket 19's `held_at` only need adding once.
export const HOLDING_COLUMNS =
  "id, asset_class_id, name, currency, price_lookup_symbol, quantity, sector, held_at, archived_at, created_at";
