import { describe, expect, it } from "vitest";
import { buildShell } from "@/lib/views/shell";
import { holding, portfolio } from "../fixtures/portfolio";
import { ADDING, EXISTING_ROUTES, hrefFor } from "@/lib/views/links";

const data = portfolio({ holdings: [holding({ currentValue: 1 })] });
const user = { email: "a@example.test", user_metadata: { full_name: "Adarsh Reddy" } };

describe("shell view", () => {
  it.each([
    ["/", "Overview"],
    ["/assets/stocks", "Assets"],
    ["/holdings/abc", "Assets"],
    ["/liabilities/xyz", "Liabilities"],
    ["/growth", "Growth"],
    ["/goals", "Goals"],
  ])("SH-03 the active item follows the path %s to %s", (pathname, item) => {
    const shell = buildShell({ user, portfolio: data }, { pathname });
    expect(shell.items.filter((i) => i.active).map((i) => i.label)).toEqual([item]);
  });

  it("SH-10 the registry has the Overview, Holding detail and Goals on, adding on, and the shell knows the first name", () => {
    expect([...EXISTING_ROUTES]).toEqual([
      "overview",
      "assets",
      "assetClass",
      "holding",
      "liabilities",
      "liability",
      "growth",
      "goals",
    ]);
    expect(ADDING).toBe(true);
    expect(hrefFor({ kind: "overview" })).toBe("/");
    expect(hrefFor({ kind: "assets" })).toBe("/assets");
    expect(hrefFor({ kind: "assetClass", id: "cash" })).toBe("/assets/cash");
    expect(buildShell({ user, portfolio: data }, { pathname: "/" }).userName).toBe("Adarsh");
  });
});
