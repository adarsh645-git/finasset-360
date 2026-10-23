import type { AssetClassId } from "@/lib/read-model/types";

/** What a class's Holdings are called: "3 accounts", "1 property". */
export const CLASS_NOUNS: Record<AssetClassId, { one: string; many: string }> = {
  realestate: { one: "property", many: "properties" },
  stocks: { one: "account", many: "accounts" },
  cash: { one: "account", many: "accounts" },
  crypto: { one: "account", many: "accounts" },
  metals: { one: "asset", many: "assets" },
  other: { one: "asset", many: "assets" },
};

export const countNoun = (id: AssetClassId, n: number) =>
  `${n} ${n === 1 ? CLASS_NOUNS[id].one : CLASS_NOUNS[id].many}`;
