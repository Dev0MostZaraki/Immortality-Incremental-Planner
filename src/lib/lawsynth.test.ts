import { describe, expect, it } from "vitest";
import { LAWS, coreRate, coreSeconds, effSec, farmSummary, lawCost, lawTime, multiplier, planMaterials, sourceSettings, totalCost, type FarmSettings } from "./lawsynth";

const law = (id: string) => LAWS.find((l) => l.id === id)!;
const settings = (p: Partial<FarmSettings> = {}): FarmSettings => ({ mult: 1, perDrop: 1, mode: "source", mats: sourceSettings(), ...p });

describe("Law Synthesis math", () => {
  it("Perception 0 -> 10", () => expect(lawCost(law("perception"), 0, 10)).toEqual({ mats: { Lucent: 275 }, cores: 1_375_000, levels: 10 }));
  it("Strength 0 -> 10", () => expect(lawCost(law("strength"), 0, 10)).toEqual({ mats: { Aster: 550, Sable: 550 }, cores: 2_750_000, levels: 10 }));
  it("Life 0 -> 10", () => expect(lawCost(law("life"), 0, 10)).toEqual({ mats: { Cindral: 825, Morrow: 825 }, cores: 5_500_000, levels: 10 }));
  it("5 -> 10 sums only levels 6-10", () => expect(lawCost(law("perception"), 5, 10).mats.Lucent).toBe(5 * (6 + 7 + 8 + 9 + 10)));
  it("target below current is zero, never negative; levels are clamped", () => {
    expect(lawCost(law("life"), 8, 3)).toEqual({ mats: { Cindral: 0, Morrow: 0 }, cores: 0, levels: 0 });
    expect(lawCost(law("perception"), -4, 99).mats.Lucent).toBe(275);
  });
  it("inventory subtraction never below zero and reports surplus", () => {
    const r = planMaterials({ Lucent: 10 }, { Lucent: 40 }, settings()).rows.find((x) => x.mat === "Lucent")!;
    expect(r.missing).toBe(0); expect(r.surplus).toBe(30);
  });
  it("five x2 toggles => x32", () => expect(multiplier([true, true, true, true, true], 1)).toBe(32));
  it("sequential total is the sum of missing-material times", () => {
    const p = planMaterials({ Lucent: 10, Grace: 2 }, {}, settings());
    expect(p.total).toBe(10 * 29 + 2 * 118);
    expect(p.bottleneck?.mat).toBe("Lucent");
  });
  it("observed rate only overrides in measured mode", () => {
    const mats = sourceSettings(); mats.Lucent.observed = 5;
    expect(effSec("Lucent", settings({ mats, mult: 2 })).sec).toBe(14.5);
    expect(effSec("Lucent", settings({ mats, mult: 2, mode: "measured" })).sec).toBe(5);
    expect(effSec("Ichor", settings({ mats, mode: "measured" })).sec).toBe(32);
  });
  it("core time excluded without rate and included with rate", () => {
    expect(coreSeconds(1000, coreRate(null, "cps"))).toBeNull();
    expect(coreSeconds(6000, coreRate(100, "cpm"))).toBe(3600);
    expect(coreSeconds(5000, coreRate(2, "sp1k"))).toBe(10);
    const t = lawTime(law("perception"), 0, 1, settings(), 1000);
    expect(t.total).toBe(5 * 29 + 25);
  });
  it("max all from 0 totals", () => {
    const all = Object.fromEntries(LAWS.map((l) => [l.id, { cur: 0, tgt: 10 }]));
    const t = totalCost(all);
    expect(t.mats.Morrow).toBe(550 + 825);
    expect(t.cores).toBe(3 * 1_375_000 + 3 * 2_750_000 + 3 * 5_500_000);
  });
  it("no NaN/Infinity in summaries", () => {
    const p = planMaterials({ Morrow: 550 }, {}, settings({ mult: 0 }));
    const s = farmSummary("Max Laws", p.rows, 5_500_000, (n) => String(n));
    expect(s).toContain("550 Morrow @ Miasma Mark");
    expect(s).not.toMatch(/NaN|Infinity/);
  });
});