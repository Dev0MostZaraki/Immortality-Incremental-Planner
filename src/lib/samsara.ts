import { eta } from "./endurance";

export type EvidenceStatus = "verified" | "model" | "observed" | "unknown";
export type KarmicUpgradeId = "ashesBoost" | "moreAshes" | "punchSpeed";
export type KarmicUpgrade = {
  id: KarmicUpgradeId;
  name: string;
  baseCost: number;
  baseCostFactor: number;
  factorGrowth: number;
  maxLevel: number;
  effectPerLevel: number;
  costStatus: "model";
};

/** Screenshot-derived models. C(n) buys level n + 1 when n levels are owned. */
export const KARMIC_UPGRADES: readonly KarmicUpgrade[] = [
  {
    id: "ashesBoost",
    name: "Ashes Boost",
    baseCost: 10,
    baseCostFactor: 1.6,
    factorGrowth: 1.01,
    maxLevel: 50,
    effectPerLevel: 1.2,
    costStatus: "model",
  },
  {
    id: "moreAshes",
    name: "More Ashes",
    baseCost: 25_000,
    baseCostFactor: 3.5,
    factorGrowth: 1.03,
    maxLevel: 30,
    effectPerLevel: 1.5,
    costStatus: "model",
  },
  {
    id: "punchSpeed",
    name: "Punch Speed",
    baseCost: 40,
    baseCostFactor: 2.2,
    factorGrowth: 1,
    maxLevel: 25,
    effectPerLevel: 1.1,
    costStatus: "model",
  },
] as const;

export const KARMIC_COST_ANCHORS = [
  { upgrade: "ashesBoost" as const, level: 0, displayed: 10 },
  { upgrade: "ashesBoost" as const, level: 7, displayed: 331 },
  { upgrade: "ashesBoost" as const, level: 26, displayed: 51.47e6 },
  { upgrade: "ashesBoost" as const, level: 31, displayed: 2.17e9 },
  { upgrade: "ashesBoost" as const, level: 45, displayed: 290.78e12 },
  { upgrade: "moreAshes" as const, level: 0, displayed: 25e3 },
  { upgrade: "moreAshes" as const, level: 2, displayed: 315.44e3 },
  { upgrade: "moreAshes" as const, level: 7, displayed: 299.23e6 },
  { upgrade: "moreAshes" as const, level: 9, displayed: 5.71e9 },
  { upgrade: "moreAshes" as const, level: 16, displayed: 440.04e12 },
  { upgrade: "punchSpeed" as const, level: 0, displayed: 40 },
  { upgrade: "punchSpeed" as const, level: 7, displayed: 9.98e3 },
  { upgrade: "punchSpeed" as const, level: 20, displayed: 282.17e6 },
  { upgrade: "punchSpeed" as const, level: 24, displayed: 6.61e9 },
] as const;

const getUpgrade = (id: KarmicUpgradeId) => KARMIC_UPGRADES.find((upgrade) => upgrade.id === id)!;
export function karmicUpgradeCost(id: KarmicUpgradeId, level: number): number | null {
  const upgrade = getUpgrade(id);
  if (!Number.isInteger(level) || level < 0 || level >= upgrade.maxLevel) return null;
  return (
    upgrade.baseCost *
    upgrade.baseCostFactor ** level *
    upgrade.factorGrowth ** ((level * (level - 1)) / 2)
  );
}
export function karmicUpgradeTotalCost(
  id: KarmicUpgradeId,
  level: number,
  count: number,
): number | null {
  const upgrade = getUpgrade(id);
  if (
    !Number.isInteger(level) ||
    !Number.isInteger(count) ||
    level < 0 ||
    count < 0 ||
    level + count > upgrade.maxLevel
  )
    return null;
  let total = 0;
  for (let current = level; current < level + count; current += 1)
    total += karmicUpgradeCost(id, current) ?? 0;
  return total;
}
export function karmicUpgradeEffect(id: KarmicUpgradeId, level: number): number | null {
  const upgrade = getUpgrade(id);
  if (!Number.isInteger(level) || level < 0 || level > upgrade.maxLevel) return null;
  return upgrade.effectPerLevel ** level;
}

export type SamsaraMilestone = {
  id: number;
  cost: number | null;
  bonuses: readonly string[];
  status: EvidenceStatus;
};
export const SAMSARA_MILESTONES: readonly SamsaraMilestone[] = [
  { id: 1, cost: 4e3, bonuses: ["×2 Ashes", "×10QnDe Qi"], status: "verified" },
  { id: 2, cost: 16e3, bonuses: ["Unlock Karmic Path"], status: "verified" },
  { id: 3, cost: 32e3, bonuses: ["×2.5 Path Luck", "×3 Ashes", "×100B Qi"], status: "verified" },
  { id: 4, cost: 150e3, bonuses: ["×5 Ashes", "×2 Path Speed", "×1T Qi"], status: "verified" },
  { id: 5, cost: 11e6, bonuses: ["×3 Threads", "×1T Qi"], status: "verified" },
  { id: 6, cost: 100e6, bonuses: ["×10 Ashes", "×2 Path Bulk", "×10B Qi"], status: "verified" },
  {
    id: 7,
    cost: 30e15,
    bonuses: ["×2 Threads", "×3 Path Luck", "×10 Luck", "×10B Qi"],
    status: "verified",
  },
  { id: 8, cost: 220e15, bonuses: ["×25 Ashes", "^1.0005 Qi"], status: "observed" },
  {
    id: 9,
    cost: 2.4e21,
    bonuses: ["×5 Threads", "×2 Path Speed", "×100Oc Qi"],
    status: "observed",
  },
  {
    id: 10,
    cost: 4.7e21,
    bonuses: ["×100 Ashes", "×3 Threads", "×1SxDc Qi"],
    status: "observed",
  },
  { id: 11, cost: 66e24, bonuses: [], status: "observed" },
] as const;

export type KarmicPath = {
  name: string;
  ashes: number | null;
  other: readonly string[];
  maxed: boolean;
  observedChance: string;
};
export const KARMIC_PATHS: readonly KarmicPath[] = [
  { name: "Ember", ashes: 1.5, other: ["×100Oc Qi"], maxed: true, observedChance: "1 / 1.79" },
  {
    name: "Cinder",
    ashes: 2,
    other: ["×10Qa Qi", "×1.5 Dao Path Speed"],
    maxed: true,
    observedChance: "1 / 3.29",
  },
  {
    name: "Smoulder",
    ashes: 2.5,
    other: ["×10B Qi", "×2 Dao Path Luck"],
    maxed: true,
    observedChance: "1 / 7.29",
  },
  {
    name: "Pyre",
    ashes: 3,
    other: ["×10T Qi", "×5 Luck", "×2 Dao Path Bulk"],
    maxed: true,
    observedChance: "1 / 1.11K",
  },
  { name: "Wraithflame", ashes: null, other: [], maxed: false, observedChance: "1 / 8.64T" },
  { name: "Soulbrand", ashes: null, other: [], maxed: false, observedChance: "1 / 1.83Qa" },
  { name: "Pyreheart", ashes: null, other: [], maxed: false, observedChance: "1 / 18.4Sp" },
  { name: "Karmic Inferno", ashes: null, other: [], maxed: false, observedChance: "1 / 85.96Sp" },
] as const;
export const KARMIC_PATH_ROLL_COST = 10e3;

export type SoulThreadUpgrade = {
  name: string;
  level: number;
  maxLevel: number;
  nextCost: number;
  effectPerLevel: number;
  effect: string;
  baseCost: number | null;
  status: EvidenceStatus;
};
export const SOUL_THREAD_UPGRADES: readonly SoulThreadUpgrade[] = [
  {
    name: "More Threads",
    level: 9,
    maxLevel: 40,
    nextCost: 1.57e6,
    effectPerLevel: 1.3,
    effect: "Threads",
    baseCost: 5,
    status: "observed",
  },
  {
    name: "Ashes Boost",
    level: 6,
    maxLevel: 50,
    nextCost: 6.94e3,
    effectPerLevel: 1.5,
    effect: "Ashes",
    baseCost: 3,
    status: "observed",
  },
  {
    name: "Qi Boost",
    level: 6,
    maxLevel: 30,
    nextCost: 2.04e3,
    effectPerLevel: 1e3,
    effect: "Qi",
    baseCost: 10,
    status: "observed",
  },
  {
    name: "Luck Boost",
    level: 5,
    maxLevel: 34,
    nextCost: 943,
    effectPerLevel: 1.5,
    effect: "Breakthrough Luck",
    baseCost: null,
    status: "observed",
  },
  {
    name: "Path Luck",
    level: 4,
    maxLevel: 20,
    nextCost: 6.43e3,
    effectPerLevel: 1.25,
    effect: "Path Luck",
    baseCost: null,
    status: "observed",
  },
  {
    name: "Path Speed",
    level: 2,
    maxLevel: 15,
    nextCost: 1.13e3,
    effectPerLevel: 1.2,
    effect: "Path Speed",
    baseCost: null,
    status: "observed",
  },
  {
    name: "Path Bulk",
    level: 1,
    maxLevel: 15,
    nextCost: 510,
    effectPerLevel: 1.2,
    effect: "Path Bulk",
    baseCost: null,
    status: "observed",
  },
] as const;
export const SOUL_THREAD_RESET = {
  minimumRunAshes: 500e3,
  exactYieldFormula: null,
  loses: ["Karmic Ashes", "regular Ashes upgrades"],
  keeps: ["Karmic Milestones", "Karmic Paths", "Soul Threads upgrades"],
  observed: { existingThreads: 800, displayedYield: 518.48e3 },
} as const;
export const THREADS_PATH = {
  rollCost: 170e12,
  names: [
    "Strand",
    "Weft",
    "Loom",
    "Spindle",
    "Tapestry",
    "Fateknot",
    "Red String",
    "Weaver's End",
  ],
  unlock: null,
  bonuses: null,
} as const;

export type PurchaseComparison = {
  affordIn: number;
  withoutPurchase: number;
  withPurchase: number;
  saved: number;
  balanceAfterPurchase: number;
  payback: number;
  recommendation: "buy" | "skip" | "target-reached";
};

/** Converts the two values displayed by the game into an approximate production rate. */
export function ashesPerSecondFromCooldown(
  ashesPerAttack: number,
  cooldownSeconds: number,
): number | null {
  if (
    !Number.isFinite(ashesPerAttack) ||
    !Number.isFinite(cooldownSeconds) ||
    ashesPerAttack < 0 ||
    cooldownSeconds <= 0
  )
    return null;
  return ashesPerAttack / cooldownSeconds;
}

export function compareSamsaraPurchase(input: {
  currentAshes: number;
  ashesPerSecond: number;
  targetAshes: number;
  displayedCost: number;
  postPurchaseGain: number;
}): PurchaseComparison | null {
  const { currentAshes, ashesPerSecond, targetAshes, displayedCost, postPurchaseGain } = input;
  if (
    ![currentAshes, ashesPerSecond, targetAshes, displayedCost, postPurchaseGain].every(
      Number.isFinite,
    ) ||
    currentAshes < 0 ||
    targetAshes < 0 ||
    displayedCost < 0 ||
    ashesPerSecond <= 0 ||
    postPurchaseGain <= 0
  )
    return null;
  const withoutPurchase = eta(currentAshes, targetAshes, ashesPerSecond);
  if (withoutPurchase === 0)
    return {
      affordIn: 0,
      withoutPurchase,
      withPurchase: 0,
      saved: 0,
      balanceAfterPurchase: currentAshes,
      payback: Infinity,
      recommendation: "target-reached",
    };
  const affordIn = Math.max(0, (displayedCost - currentAshes) / ashesPerSecond);
  const balanceAfterPurchase = Math.max(0, currentAshes - displayedCost);
  const withPurchase = affordIn + eta(balanceAfterPurchase, targetAshes, postPurchaseGain);
  const saved = withoutPurchase - withPurchase;
  const extraGain = postPurchaseGain - ashesPerSecond;
  const payback = extraGain > 0 ? displayedCost / extraGain : Infinity;
  return {
    affordIn,
    withoutPurchase,
    withPurchase,
    saved,
    balanceAfterPurchase,
    payback,
    recommendation: saved > 0 ? "buy" : "skip",
  };
}

export type KarmicLevels = Record<KarmicUpgradeId, number>;
export type RoutePurchase = {
  id: KarmicUpgradeId;
  level: number;
  cost: number;
  wait: number;
  gainAfter: number;
};
export type KarmicRoute = { total: number; purchases: RoutePurchase[]; finalGain: number };
/** Exhaustive prefix search over the three verified Karmic upgrade models. */
export function bestKarmicRoute(input: {
  currentAshes: number;
  ashesPerSecond: number;
  targetAshes: number;
  levels: KarmicLevels;
  maxPurchases?: number;
}): KarmicRoute | null {
  const { currentAshes, ashesPerSecond, targetAshes, levels } = input,
    maxPurchases = input.maxPurchases ?? 6;
  if (
    ![currentAshes, ashesPerSecond, targetAshes].every(Number.isFinite) ||
    currentAshes < 0 ||
    ashesPerSecond <= 0 ||
    targetAshes < 0 ||
    !Number.isInteger(maxPurchases) ||
    maxPurchases < 0 ||
    maxPurchases > 8
  )
    return null;
  let best: KarmicRoute = {
    total: eta(currentAshes, targetAshes, ashesPerSecond),
    purchases: [],
    finalGain: ashesPerSecond,
  };
  const visit = (
    ashes: number,
    gain: number,
    owned: KarmicLevels,
    elapsed: number,
    purchases: RoutePurchase[],
  ) => {
    const finish = elapsed + eta(ashes, targetAshes, gain);
    if (finish < best.total) best = { total: finish, purchases, finalGain: gain };
    if (purchases.length >= maxPurchases || elapsed >= best.total) return;
    for (const upgrade of KARMIC_UPGRADES) {
      const level = owned[upgrade.id],
        cost = karmicUpgradeCost(upgrade.id, level);
      if (cost === null) continue;
      const wait = Math.max(0, (cost - ashes) / gain),
        buyAt = elapsed + wait;
      if (buyAt >= best.total) continue;
      visit(
        Math.max(0, ashes - cost),
        gain * upgrade.effectPerLevel,
        { ...owned, [upgrade.id]: level + 1 },
        buyAt,
        [
          ...purchases,
          {
            id: upgrade.id,
            level: level + 1,
            cost,
            wait,
            gainAfter: gain * upgrade.effectPerLevel,
          },
        ],
      );
    }
  };
  visit(currentAshes, ashesPerSecond, levels, 0, []);
  return best;
}
