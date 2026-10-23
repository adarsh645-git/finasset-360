import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/assets/realestate",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const { AssetClassPage } = await import("@/components/assets/AssetClassPage");
const { buildAssetClassView } = await import("@/lib/views/asset-class");
const { holding, portfolio } = await import("../fixtures/portfolio");

const classes = ["realestate", "stocks", "cash", "crypto", "metals", "other"] as const;
const data = portfolio({
  today: "2026-10-13",
  holdings: classes.map((c) =>
    holding({
      id: c,
      assetClass: c,
      name: `${c} holding`,
      currentValue: 1_000,
      propertyType: c === "realestate" ? "Residential" : null,
      city: c === "realestate" ? "Pune" : null,
    }),
  ),
});
const html = (c: (typeof classes)[number]) =>
  renderToStaticMarkup(<AssetClassPage view={buildAssetClassView(data, c)} />);

describe("which cards render", () => {
  it("AC-09 Real estate shows By property type and By location above Holdings", () => {
    const out = html("realestate");
    expect(out).toContain("By property type");
    expect(out).toContain("By location");
    expect(out.indexOf("By location")).toBeLessThan(out.indexOf(">Holdings<"));
  });

  it.each(["stocks", "cash", "crypto", "metals", "other"] as const)(
    "AC-09 %s shows neither distribution card",
    (c) => {
      const out = html(c);
      expect(out).not.toContain("By property type");
      expect(out).not.toContain("By location");
    },
  );
});
