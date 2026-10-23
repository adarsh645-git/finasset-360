import { describe, expect, it } from "vitest";
import {
  layoutChart,
  nearestIndex,
  placeEndLabels,
  stackSeries,
  tooltipAt,
  type ChartSeries,
  type Point,
} from "@/lib/chart";
import {
  projectionCookie,
  projectionLabel,
  resolveProjection,
} from "@/lib/chart/projection";

const monthEnds = (from: string, to: string, f: (i: number) => number): Point[] => {
  const out: Point[] = [];
  let [y, m] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  let i = 0;
  while (y < ty || (y === ty && m <= tm)) {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    out.push({
      date: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
      value: f(i++),
    });
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
};

const one = (points: Point[], extra: Partial<ChartSeries> = {}): ChartSeries => ({
  name: "Net worth",
  color: "#000",
  points,
  ...extra,
});

const lay = (series: ChartSeries[], extra = {}) =>
  layoutChart({ series, today: "2026-10-13", projection: true, ...extra });

describe("chart axis", () => {
  it("CH-01 ticks for a range of values", () => {
    const l = lay([
      one([
        { date: "2026-01-31", value: 112_000 },
        { date: "2026-10-13", value: 487_000 },
      ]),
    ]);
    expect(l.y.ticks.map((t) => t.label)).toEqual(["$100K", "$200K", "$300K", "$400K", "$500K"]);
  });

  it("CH-02 a flat or single-point series still gets an axis", () => {
    const l = lay([one([{ date: "2026-10-13", value: 0 }])]);
    expect(l.y.hi - l.y.lo).toBeGreaterThan(0);
    expect(l.y.ticks.map((t) => t.value)).toContain(0);
    expect(JSON.stringify(l)).not.toMatch(/NaN|Infinity/);
  });

  it("CH-03 tooltip-only series don't move the axis", () => {
    const l = lay([
      one([
        { date: "2026-01-31", value: 100_000 },
        { date: "2026-10-13", value: 500_000 },
      ]),
      one(
        [
          { date: "2026-01-31", value: 200_000 },
          { date: "2026-10-13", value: 900_000 },
        ],
        { name: "Assets", line: false, scaled: false },
      ),
    ]);
    expect(l.y.ticks.at(-1)?.label).toBe("$500K");
  });
});

describe("chart series", () => {
  const dates = monthEnds("2026-01", "2026-06", () => 0).map((p) => p.date);
  const layers = (endLabel?: boolean) =>
    stackSeries([
      { name: "Stocks", color: "#111", endLabel, points: dates.map((date) => ({ date, value: 30_000 })) },
      { name: "Cash", color: "#222", endLabel, points: dates.map((date) => ({ date, value: 10_000 })) },
    ]);

  it("CH-04 a stacked layer fills between its base and itself", () => {
    const l = lay([layers()[1]!], { today: "2026-06-30" });
    const s = l.series[0]!;
    expect(s.lower.every((v) => v === 30_000)).toBe(true);
    expect(s.upper.every((v) => v === 40_000)).toBe(true);
    expect(s.areaPath).toMatch(/^M/);
  });

  it("CH-15 a stacked layer's tooltip shows its own value", () => {
    const l = lay(layers(true), { today: "2026-06-30" });
    const tip = tooltipAt(l, 2);
    expect(tip.rows.find((r) => r.name === "Cash")?.value).toBe("$10,000");
    expect(l.endLabels.find((e) => e.name === "Cash")?.value).toBe("$10K");
    expect(l.series[1]!.upper.every((v) => v === 40_000)).toBe(true);
  });

  it("CH-16 zero is forced into the y-range", () => {
    const l = lay(
      [
        one([
          { date: "2026-01-31", value: 300_000 },
          { date: "2026-10-13", value: 340_000 },
        ]),
      ],
      { zero: true },
    );
    expect(l.y.ticks[0]?.label).toBe("$0");
    expect(l.y.hi).toBeGreaterThanOrEqual(340_000);
  });
});

describe("chart projection", () => {
  const long = () => one(monthEnds("2024-10", "2036-10", (i) => 100_000 + i * 1000));

  it("CH-05 history is solid and the projection dashed", () => {
    const l = lay([long()]);
    expect(l.series[0]!.solidPath).toMatch(/^M/);
    expect(l.series[0]!.dashedPath).toMatch(/^M/);
    expect(l.projectionRegion).not.toBeNull();
    expect(l.todayLabel).toBe("Today → projected");
    expect(l.nowX).toBeGreaterThan(0);
    expect(l.nowX).toBeLessThan(1000);
  });

  it("CH-06 with the projection off, the chart ends at today", () => {
    const l = lay([long()], { projection: false });
    expect(l.series[0]!.dashedPath).toBe("");
    expect(l.projectionRegion).toBeNull();
    expect(l.todayLabel).toBeNull();
    expect(l.nowX).toBeNull();
    expect(l.dates.at(-1)! <= "2026-10-13").toBe(true);
  });

  it("CH-11 tooltip at a projected point", () => {
    const l = lay([
      one(monthEnds("2024-10", "2036-10", (i) => 100_000 + i), { dot: true }),
      one(monthEnds("2024-10", "2036-10", (i) => 150_000 + i), { name: "Assets", line: false, scaled: false }),
      one(monthEnds("2024-10", "2036-10", (i) => 50_000 + i), { name: "Liabilities", line: false, scaled: false }),
    ]);
    const tip = tooltipAt(l, l.dates.indexOf("2029-03-31"));
    expect(tip.title).toBe("Mar 2029 · projected");
    expect(tip.rows.map((r) => r.name)).toEqual(["Net worth", "Assets", "Liabilities"]);
    expect(tip.rows.every((r) => /^\$\d/.test(r.value))).toBe(true);
    expect(tooltipAt(l, l.dates.indexOf("2026-03-31")).title).toBe("Mar 2026");
  });
});

describe("chart goals", () => {
  it("CH-08 only nearby goals are drawn", () => {
    const l = lay(
      [
        one([
          { date: "2026-01-31", value: 100_000 },
          { date: "2026-10-13", value: 400_000 },
        ]),
      ],
      {
        goals: [
          { label: "$150K", value: 150_000 },
          { label: "$450K", value: 450_000 },
          { label: "$1M", value: 1_000_000 },
        ],
      },
    );
    expect(l.goals.map((g) => g.label)).toEqual(["$150K", "$450K"]);
    expect(l.y.hi).toBeGreaterThanOrEqual(450_000);
  });
});

describe("chart x labels", () => {
  const labels = (a: string, b: string) =>
    lay(
      [
        one([
          { date: a, value: 1 },
          { date: b, value: 2 },
        ]),
      ],
      { today: b },
    ).xLabels.map((x) => x.label);

  it("CH-09 x labels by span", () => {
    expect(labels("2025-10-31", "2026-10-31")).toEqual(["Oct ’25", "Jan ’26", "Apr ’26", "Jul ’26", "Oct ’26"]);
    expect(labels("2020-01-31", "2026-10-31")).toEqual(["2020", "2021", "2022", "2023", "2024", "2025", "2026"]);
    expect(labels("2018-01-31", "2036-10-31")).toEqual(["2018", "2022", "2026", "2030", "2034"]);
  });
});

describe("chart end labels and pointer", () => {
  it("CH-10 end labels never overlap", () => {
    const out = placeEndLabels([
      { name: "A", value: "$10K", y: 100, color: "#000" },
      { name: "B", value: "$9K", y: 110, color: "#000" },
    ]);
    expect(out[1]!.y - out[0]!.y).toBe(32);
    expect(out.map((o) => o.name)).toEqual(["A", "B"]);
    expect(out[1]!.value).toBe("$9K");
  });

  it("CH-12 the pointer picks the nearest point", () => {
    const l = lay([one(monthEnds("2026-01", "2026-12", (i) => i))], { today: "2026-12-31" });
    const at = (f: number) => l.dates[nearestIndex(l, f)];
    expect(at(0)).toBe("2026-01-31");
    expect(at(0.52)).toBe("2026-07-31");
    expect(at(1)).toBe("2026-12-31");
  });
});

describe("projection setting", () => {
  it.each([
    [undefined, true, "10-yr projection on"],
    ["on", true, "10-yr projection on"],
    ["off", false, "Projection off"],
  ])("CH-07 stored %s gives %s", (stored, state, label) => {
    const on = resolveProjection(stored);
    expect(on).toBe(state);
    expect(projectionLabel(on, 10)).toBe(label);
    expect(projectionCookie(false)).toMatch(/^projection=off; Path=\/; Max-Age=31536000/);
  });
});
