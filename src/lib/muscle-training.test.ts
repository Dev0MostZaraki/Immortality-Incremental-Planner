import { describe, expect, it } from "vitest";
import { toValue } from "./endurance";
import { baseCostDiffPct, derivedBaseCost, deriveCostMultiplier, effectiveUpGain, gainAfter, generatePath, projectedCosts, toNU } from "./muscle-training";
import { PROG_DEFAULTS, restoreProg } from "./progression-state";
import { upgradeROI } from "./planner";
import { translate } from "./i18n";

const sx = (n: number) => { const p = toValue(String(n), "Sx"); if (p.ok !== true) throw new Error(); return p.value; };
const back = (x: { v: string; u: string }) => { const p = toValue(x.v, x.u); if (p.ok !== true) throw new Error(); return p.value; };

describe("Muscle Training model", () => {
  it("2 Sx/s ×1.4 = 2.8, 3.92 and 5.488 Sx/s after 1–3 purchases", () => {
    expect(gainAfter(sx(2), 1.4, 1) / sx(1)).toBeCloseTo(2.8, 9);
    expect(gainAfter(sx(2), 1.4, 2) / sx(1)).toBeCloseTo(3.92, 9);
    expect(gainAfter(sx(2), 1.4, 3) / sx(1)).toBeCloseTo(5.488, 9);
  });
  it("derives cost multiplier 1.4 from observed 100 and 140", () => {
    expect(deriveCostMultiplier(100, 140)).toBeCloseTo(1.4, 12);
    expect(deriveCostMultiplier(null, 140)).toBeNull();
  });
  it("never generates future costs without a cost multiplier", () => {
    expect(projectedCosts(100, null, 3)).toEqual([]);
    expect(generatePath({ ...PROG_DEFAULTS, mtCostMultiplier: "", upCost: { v: "100", u: "" } }, 10)).toEqual([]);
  });
  it("first row is the current next purchase: 100, 150, 225 at ×1.5", () => {
    expect(projectedCosts(100, 1.5, 3)).toEqual([100, 150, 225]);
  });
  it("generates path costs, gains and levels", () => {
    const rows = generatePath({ ...PROG_DEFAULTS, mtLevel: "5", upCost: { v: "100", u: "" }, mtCostMultiplier: "1,5" }, 10, 1);
    expect(rows.map((r) => back(r.cost))).toEqual([100, 150, 225]);
    rows.forEach((r, i) => expect(back(r.gain)).toBeCloseTo(10 * 1.4 ** (i + 1), 9));
    expect(rows.map((r) => r.level)).toEqual(["6", "7", "8"]);
    expect(rows[0]?.name).toBe("Muscle Training");
  });
  it("auto mode feeds ROI; manual mode overrides auto gain", () => {
    const auto = effectiveUpGain(PROG_DEFAULTS, 10);
    expect(auto).toBeCloseTo(14, 12);
    expect(upgradeROI(0, 10, 10000, 100, auto ?? 0).b).toBeCloseTo(10 + 10000 / 14, 9);
    expect(effectiveUpGain({ ...PROG_DEFAULTS, mtAutoGain: false, upGain: { v: "20", u: "" } }, 10)).toBe(20);
  });
  it("keeps manual gain for older saves and has no screenshot defaults", () => {
    expect(restoreProg({ upGain: { v: "5", u: "T" } }).mtAutoGain).toBe(false);
    expect(restoreProg({}).mtAutoGain).toBe(true);
    expect([PROG_DEFAULTS.upCost.v, PROG_DEFAULTS.mtLevel, PROG_DEFAULTS.mtBaseCost.v, PROG_DEFAULTS.mtObservedCostA.v, PROG_DEFAULTS.mtObservedCostB.v]).toEqual(["", "", "", "", ""]);
    expect(PROG_DEFAULTS.mtGainMultiplier).toBe("1.4");
    expect(PROG_DEFAULTS.mtPreviewCount).toBe(3);
    expect(PROG_DEFAULTS.mtCostMultiplier).toBe("2.1");
    expect(JSON.stringify(PROG_DEFAULTS)).not.toMatch(/94\.97|10\.26|"59"|2\.8/);
  });
  it("observed 59/150 at 10.26 Sx: first row is the entered next cost, then ×2.1", () => {
    const rows = generatePath({ ...PROG_DEFAULTS, mtLevel: "59", mtPreviewCount: 4, upCost: { v: "10.26", u: "Sx" } }, sx(2), 1);
    expect(rows.map((r) => r.level)).toEqual(["60", "61", "62", "63"]);
    [10.26, 21.546, 45.2466, 95.01786].forEach((c, i) => expect(back(rows[i]!.cost) / sx(1)).toBeCloseTo(c, 6));
    expect(rows[0]!.cost).toEqual({ v: "10.26", u: "Sx" });
  });
  it("observed costs override the default multiplier; users can override 2.1", () => {
    expect(projectedCosts(100, 2.5, 2)).toEqual([100, 250]);
    const p = { ...PROG_DEFAULTS, upCost: { v: "100", u: "" }, mtObservedCostA: { v: "100", u: "" }, mtObservedCostB: { v: "140", u: "" } };
    expect(back(generatePath(p, 10, 1)[1]!.cost)).toBeCloseTo(140, 9);
  });
  it("derives base cost from level 59 and 10.26 Sx consistently with forward costs", () => {
    const base = derivedBaseCost(sx(10.26), 2.1, 59)!;
    expect(base).toBeCloseTo(sx(10.26) / 2.1 ** 59, 0);
    expect(base * 2.1 ** 59 / sx(10.26)).toBeCloseTo(1, 12);
    projectedCosts(sx(10.26), 2.1, 4).forEach((c, k) => expect(c / (base * 2.1 ** (59 + k))).toBeCloseTo(1, 12));
    expect(baseCostDiffPct(base * 1.01, base)).toBeCloseTo(1, 9);
    expect(derivedBaseCost(sx(10.26), 2.1, null)).toBeNull();
  });
  it("crosses suffixes: 800 Sx × 1.4 = 1.12 Sp, and huge values stay suffix-independent", () => {
    const sp = toValue("1", "Sp"); if (sp.ok !== true) throw new Error();
    expect(gainAfter(sx(800), 1.4, 1) / sp.value).toBeCloseTo(1.12, 12);
    expect(toNU(gainAfter(sx(800), 1.4, 1))).toEqual({ v: "1.12", u: "Sp" });
    expect(gainAfter(sx(5), 1.4, 2) / sx(5)).toBeCloseTo(1.96, 12);
    const huge = projectedCosts(sx(10.26), 2.1, 10)[9]!;
    expect(back(toNU(huge)) / huge).toBeCloseTo(1, 9);
    expect(toNU(huge).u).not.toBe("Sx");
  });
  it("round-trips values through suffix units", () => {
    expect(back(toNU(sx(94.97)))).toBeCloseTo(sx(94.97), -20);
  });
  it("translates new labels to English", () => {
    expect(translate("en", "Muscle Training Modell")).toBe("Muscle Training Model");
    expect(translate("en", "Gain automatisch berechnen")).toBe("Auto-calculate Gain");
    expect(translate("en", "Kosten-Skalierung unbekannt – nur der nächste Gain wird automatisch berechnet.")).toBe("Cost scaling unknown — only the next Gain is auto-calculated.");
    expect(translate("en", "Aus zwei Kosten ableiten")).toBe("Derive from two costs");
  });
});