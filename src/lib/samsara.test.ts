import { describe, expect, it } from "vitest";
import {
  ashesPerSecondFromCooldown,
  bestKarmicRoute,
  compareSamsaraPurchase,
  KARMIC_COST_ANCHORS,
  karmicUpgradeCost,
  karmicUpgradeEffect,
  karmicUpgradeTotalCost,
  KARMIC_PATHS,
  SAMSARA_MILESTONES,
  THREAD_MARKS,
  THREADS_PATH,
} from "./samsara";
describe("Samsara World 10 cost models", () => {
  it("derives production from the displayed Ashes and cooldown", () => {
    expect(ashesPerSecondFromCooldown(24.16e12, 0.09)).toBeCloseTo(268_444_444_444_444.44, -1);
    expect(ashesPerSecondFromCooldown(100, 0)).toBeNull();
    expect(ashesPerSecondFromCooldown(-1, 1)).toBeNull();
  });
  it("reproduces every displayed cost anchor within UI rounding", () => {
    for (const anchor of KARMIC_COST_ANCHORS) {
      const modeled = karmicUpgradeCost(anchor.upgrade, anchor.level)!;
      expect(Math.abs(modeled - anchor.displayed) / anchor.displayed).toBeLessThan(0.002);
    }
  });
  it("sums sequential prices without crossing level caps", () => {
    expect(karmicUpgradeTotalCost("ashesBoost", 0, 3)).toBeCloseTo(51.856, 3);
    expect(karmicUpgradeTotalCost("moreAshes", 29, 2)).toBeNull();
  });
  it("calculates verified per-level effects", () => {
    expect(karmicUpgradeEffect("ashesBoost", 45)).toBeCloseTo(3657.26, 1);
    expect(karmicUpgradeEffect("moreAshes", 16)).toBeCloseTo(656.8408, 3);
    expect(karmicUpgradeEffect("punchSpeed", 25)).toBeCloseTo(10.8347, 3);
  });
  it("includes all observed milestone costs", () => {
    const milestone = (id: number) => SAMSARA_MILESTONES.find((entry) => entry.id === id)!;
    expect(SAMSARA_MILESTONES.map((entry) => entry.id)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    ]);
    expect(milestone(9).cost).toBe(220e15);
    expect(milestone(10).cost).toBe(2.4e21);
    expect(milestone(11).cost).toBe(4.7e21);
    expect(milestone(12).cost).toBe(66e24);
    expect(milestone(12).bonuses).toEqual(["×50 Ashes", "×2 Path Luck", "^1.0018 Qi"]);
    expect(milestone(13).cost).toBe(2.2e27);
    expect(milestone(14).cost).toBe(5.3e27);
    expect(milestone(15).cost).toBe(4.1e30);
    expect(milestone(16).cost).toBe(39e30);
    expect(SAMSARA_MILESTONES.slice(0, -1).every((entry) => entry.cost !== null)).toBe(true);
    expect(milestone(17).cost).toBeNull();
    expect(milestone(17).bonuses).toEqual(["×100 Threads", "^1.0005 Qi"]);
  });
  it("keeps only standard base values and bonuses for Karmic Path and Thread Mark", () => {
    expect(KARMIC_PATHS.find((path) => path.name === "Wraithflame")).toMatchObject({
      ashes: 4,
      baseMps: "1 / 3.8Qn",
    });
    expect(KARMIC_PATHS.find((path) => path.name === "Soulbrand")).toMatchObject({
      ashes: 5,
      baseMps: "1 / 810Qn",
    });
    expect(THREADS_PATH.rollCost).toBe(170e12);
    expect(THREAD_MARKS).toHaveLength(8);
    expect(THREAD_MARKS.find((mark) => mark.name === "Weft")).toMatchObject({
      baseMps: "1 / 470M",
    });
    expect(THREAD_MARKS.find((mark) => mark.name === "Weaver's End")?.bonuses).toEqual([
      "×5 Soul Threads",
      "^1.0015 Qi",
    ]);
  });
});
describe("Samsara purchase comparison and routes", () => {
  it("includes waiting, spending, post-purchase gain and payback", () => {
    expect(
      compareSamsaraPurchase({
        currentAshes: 0,
        ashesPerSecond: 10,
        targetAshes: 1000,
        displayedCost: 100,
        postPurchaseGain: 20,
      }),
    ).toEqual({
      affordIn: 10,
      withoutPurchase: 100,
      withPurchase: 60,
      saved: 40,
      balanceAfterPurchase: 0,
      payback: 10,
      recommendation: "buy",
    });
  });
  it("finds a faster multi-purchase prefix", () => {
    const result = bestKarmicRoute({
      currentAshes: 0,
      ashesPerSecond: 1,
      targetAshes: 1000,
      levels: { ashesBoost: 0, moreAshes: 0, punchSpeed: 0 },
      maxPurchases: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.total).toBeLessThan(1000);
    expect(result!.purchases.length).toBeGreaterThan(0);
  });
  it("rejects invalid gains", () => {
    expect(
      compareSamsaraPurchase({
        currentAshes: 0,
        ashesPerSecond: 0,
        targetAshes: 1,
        displayedCost: 1,
        postPurchaseGain: 1,
      }),
    ).toBeNull();
  });
});
