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
  { id: 2, cost: 4e3, bonuses: ["×2 Ashes", "×10QnDe Qi"], status: "verified" },
  { id: 3, cost: 16e3, bonuses: ["Unlock Karmic Path"], status: "verified" },
  { id: 4, cost: 32e3, bonuses: ["×2.5 Path Luck", "×3 Ashes", "×100B Qi"], status: "verified" },
  { id: 5, cost: 150e3, bonuses: ["×5 Ashes", "×2 Path Speed", "×1T Qi"], status: "verified" },
  { id: 6, cost: 11e6, bonuses: ["×3 Threads", "×1T Qi"], status: "verified" },
  { id: 7, cost: 100e6, bonuses: ["×10 Ashes", "×2 Path Bulk", "×10B Qi"], status: "verified" },
  {
    id: 8,
    cost: 30e15,
    bonuses: ["×2 Threads", "×3 Path Luck", "×10 Luck", "×10B Qi"],
    status: "verified",
  },
  { id: 9, cost: 220e15, bonuses: ["×25 Ashes", "^1.0005 Qi"], status: "observed" },
  {
    id: 10,
    cost: 2.4e21,
    bonuses: ["×5 Threads", "×2 Path Speed", "×100Oc Qi"],
    status: "observed",
  },
  {
    id: 11,
    cost: 4.7e21,
    bonuses: ["×100 Ashes", "×3 Threads", "×1SxDc Qi"],
    status: "observed",
  },
  {
    id: 12,
    cost: 66e24,
    bonuses: ["×50 Ashes", "×2 Path Luck", "^1.0018 Qi"],
    status: "observed",
  },
  {
    id: 13,
    cost: 2.2e27,
    bonuses: ["×10 Threads", "×10SxDc Qi"],
    status: "observed",
  },
  {
    id: 14,
    cost: 5.3e27,
    bonuses: ["×100 Ashes", "×3 Path Bulk", "×3 Path Speed", "^1.0005 Qi"],
    status: "observed",
  },
  {
    id: 15,
    cost: 4.1e30,
    bonuses: ["×25 Threads", "×5 Path Luck", "×10B Qi"],
    status: "observed",
  },
  { id: 16, cost: 39e30, bonuses: ["×250 Ashes", "^1.0005 Qi"], status: "observed" },
  { id: 17, cost: null, bonuses: ["×100 Threads", "^1.0005 Qi"], status: "observed" },
] as const;

export type KarmicPath = {
  name: string;
  ashes: number | null;
  other: readonly string[];
  baseMps: string;
  baseRarity: number;
};
export const KARMIC_PATHS: readonly KarmicPath[] = [
  {
    name: "Ember",
    ashes: 1.5,
    other: ["×100Oc Qi"],
    baseMps: "1 / 1",
    baseRarity: 1,
  },
  {
    name: "Cinder",
    ashes: 2,
    other: ["×100Qa Qi", "×1.5 Dao Path Speed"],
    baseMps: "1 / 1M",
    baseRarity: 1e6,
  },
  {
    name: "Smoulder",
    ashes: 2.5,
    other: ["×10B Qi", "×2 Dao Path Luck"],
    baseMps: "1 / 3.2M",
    baseRarity: 3.2e6,
  },
  {
    name: "Pyre",
    ashes: 3,
    other: ["×10T Qi", "×5 Luck", "×2 Dao Path Bulk"],
    baseMps: "1 / 490M",
    baseRarity: 490e6,
  },
  {
    name: "Wraithflame",
    ashes: 4,
    other: ["×10B Qi", "×2.5 Dao Path Luck"],
    baseMps: "1 / 3.8Qn",
    baseRarity: 3.8e18,
  },
  {
    name: "Soulbrand",
    ashes: 5,
    other: ["×10B Qi", "×2 Soul Threads"],
    baseMps: "1 / 810Qn",
    baseRarity: 810e18,
  },
  {
    name: "Pyreheart",
    ashes: null,
    other: [],
    baseMps: "1 / 6.7No",
    baseRarity: 6.7e30,
  },
  {
    name: "Karmic Inferno",
    ashes: null,
    other: [],
    baseMps: "1 / 38No",
    baseRarity: 38e30,
  },
] as const;
export const KARMIC_PATH_ROLL_COST = 10e3;

export type SoulThreadUpgradeId =
  "moreThreads" | "ashesBoost" | "qiBoost" | "luckBoost" | "pathLuck" | "pathSpeed" | "pathBulk";
export type SoulThreadUpgrade = {
  id: SoulThreadUpgradeId;
  name: string;
  maxLevel: number;
  effectPerLevel: number;
  effect: string;
  baseCost: number;
  costMultiplier: number;
  costGrowth: number;
  status: EvidenceStatus;
};
export const SOUL_THREAD_UPGRADES: readonly SoulThreadUpgrade[] = [
  {
    id: "moreThreads",
    name: "More Threads",
    maxLevel: 40,
    effectPerLevel: 1.3,
    effect: "Threads",
    baseCost: 5,
    costMultiplier: 3,
    costGrowth: 1.08,
    status: "observed",
  },
  {
    id: "ashesBoost",
    name: "Ashes Boost",
    maxLevel: 50,
    effectPerLevel: 1.5,
    effect: "Ashes",
    baseCost: 3,
    costMultiplier: 3,
    costGrowth: 1.08,
    status: "observed",
  },
  {
    id: "qiBoost",
    name: "Qi Boost",
    maxLevel: 30,
    effectPerLevel: 1e3,
    effect: "Qi",
    baseCost: 10,
    costMultiplier: 2.2,
    costGrowth: 1.04,
    status: "observed",
  },
  {
    id: "luckBoost",
    name: "Luck Boost",
    maxLevel: 34,
    effectPerLevel: 1.5,
    effect: "Breakthrough Luck",
    baseCost: 8,
    costMultiplier: 2.4,
    costGrowth: 1.04,
    status: "observed",
  },
  {
    id: "pathLuck",
    name: "Path Luck",
    maxLevel: 20,
    effectPerLevel: 1.25,
    effect: "Path Luck",
    baseCost: 50,
    costMultiplier: 3,
    costGrowth: 1.08,
    status: "observed",
  },
  {
    id: "pathSpeed",
    name: "Path Speed",
    maxLevel: 15,
    effectPerLevel: 1.2,
    effect: "Path Speed",
    baseCost: 100,
    costMultiplier: 3.2,
    costGrowth: 1.1,
    status: "observed",
  },
  {
    id: "pathBulk",
    name: "Path Bulk",
    maxLevel: 15,
    effectPerLevel: 1.2,
    effect: "Path Bulk",
    baseCost: 150,
    costMultiplier: 3.4,
    costGrowth: 1.1,
    status: "observed",
  },
] as const;

export function soulThreadUpgradeEffect(id: SoulThreadUpgradeId, level: number): number | null {
  const upgrade = SOUL_THREAD_UPGRADES.find((entry) => entry.id === id);
  if (!upgrade || !Number.isInteger(level) || level < 0 || level > upgrade.maxLevel) return null;
  return upgrade.effectPerLevel ** level;
}

export function soulThreadUpgradeCost(id: SoulThreadUpgradeId, level: number): number | null {
  const upgrade = SOUL_THREAD_UPGRADES.find((entry) => entry.id === id);
  if (!upgrade || !Number.isInteger(level) || level < 0 || level >= upgrade.maxLevel) return null;
  return (
    upgrade.baseCost *
    upgrade.costMultiplier ** level *
    upgrade.costGrowth ** ((level * (level - 1)) / 2)
  );
}

export const SOUL_THREAD_COST_ANCHORS: readonly {
  upgrade: SoulThreadUpgradeId;
  level: number;
  displayed: number;
}[] = [
  { upgrade: "moreThreads", level: 9, displayed: 1.57e6 },
  { upgrade: "moreThreads", level: 14, displayed: 26.32e9 },
  { upgrade: "moreThreads", level: 15, displayed: 231.89e9 },
  { upgrade: "moreThreads", level: 18, displayed: 251.76e12 },
  { upgrade: "ashesBoost", level: 6, displayed: 6.94e3 },
  { upgrade: "ashesBoost", level: 14, displayed: 15.79e9 },
  { upgrade: "ashesBoost", level: 15, displayed: 139.13e9 },
  { upgrade: "ashesBoost", level: 18, displayed: 151.06e12 },
  { upgrade: "qiBoost", level: 6, displayed: 2.04e3 },
  { upgrade: "qiBoost", level: 17, displayed: 1.37e9 },
  { upgrade: "qiBoost", level: 18, displayed: 5.88e9 },
  { upgrade: "qiBoost", level: 19, displayed: 26.23e9 },
  { upgrade: "qiBoost", level: 22, displayed: 2.94e12 },
  { upgrade: "luckBoost", level: 5, displayed: 943 },
  { upgrade: "luckBoost", level: 16, displayed: 1.07e9 },
  { upgrade: "luckBoost", level: 17, displayed: 4.82e9 },
  { upgrade: "luckBoost", level: 19, displayed: 109.6e9 },
  { upgrade: "luckBoost", level: 21, displayed: 2.91e12 },
  { upgrade: "pathLuck", level: 4, displayed: 6.43e3 },
  { upgrade: "pathLuck", level: 13, displayed: 32.26e9 },
  { upgrade: "pathLuck", level: 14, displayed: 263.17e9 },
  { upgrade: "pathLuck", level: 17, displayed: 226.81e12 },
  { upgrade: "pathSpeed", level: 2, displayed: 1.13e3 },
  { upgrade: "pathSpeed", level: 11, displayed: 6.81e9 },
  { upgrade: "pathSpeed", level: 12, displayed: 62.19e9 },
  { upgrade: "pathBulk", level: 1, displayed: 510 },
  { upgrade: "pathBulk", level: 11, displayed: 19.98e9 },
  { upgrade: "pathBulk", level: 12, displayed: 193.09e9 },
] as const;
export const SOUL_THREAD_RESET = {
  minimumRunAshes: 500e3,
  exactYieldFormula: null,
  loses: ["Karmic Ashes", "regular Ashes upgrades"],
  keeps: ["Karmic Milestones", "Karmic Paths", "Soul Threads upgrades"],
  observed: { existingThreads: 800, displayedYield: 518.48e3 },
} as const;
export type ThreadMark = {
  name: string;
  baseMps: string;
  baseRarity: number;
  bonuses: readonly string[];
};

export const THREAD_MARKS: readonly ThreadMark[] = [
  {
    name: "Strand",
    baseMps: "1 / 1",
    baseRarity: 1,
    bonuses: ["×1Spd Qi", "×1.5 Soul Threads"],
  },
  {
    name: "Weft",
    baseMps: "1 / 470M",
    baseRarity: 470e6,
    bonuses: ["×233.82Ocgaa Qi", "×1.94 Karmic Ashes"],
  },
  {
    name: "Loom",
    baseMps: "1 / 1.7B",
    baseRarity: 1.7e9,
    bonuses: ["×1Qa Qi", "×2 Dao Path Speed", "×2 Soul Threads"],
  },
  {
    name: "Spindle",
    baseMps: "1 / 5.4B",
    baseRarity: 5.4e9,
    bonuses: ["×1Sp Qi", "×2 Dao Path Bulk", "×2.5 Dao Path Luck"],
  },
  {
    name: "Tapestry",
    baseMps: "1 / 17B",
    baseRarity: 17e9,
    bonuses: ["×10 Karmic Ashes", "×2.5 Soul Threads", "^1.004 Qi"],
  },
  {
    name: "Fateknot",
    baseMps: "1 / 390B",
    baseRarity: 390e9,
    bonuses: ["×100T Qi", "×10 Luck", "×3 Soul Threads"],
  },
  {
    name: "Red String",
    baseMps: "1 / 2.1Qn",
    baseRarity: 2.1e18,
    bonuses: ["×25 Karmic Ashes", "^1.004 Qi"],
  },
  {
    name: "Weaver's End",
    baseMps: "1 / 2.1Sx",
    baseRarity: 2.1e21,
    bonuses: ["×5 Soul Threads", "^1.0015 Qi"],
  },
] as const;

export type MarkBoardId = "karmic" | "threads";
export type MarkOutcome = {
  probability: number;
  denominator: number;
  hitsPerSecond: number;
  copiesPerSecond: number;
  averageSeconds: number;
  chance50Seconds: number;
  chance90Seconds: number;
  chance95Seconds: number;
};

export function exactMarkProbability(
  rarities: readonly number[],
  markIndex: number,
  luck: number,
): number | null {
  if (
    !Number.isInteger(markIndex) ||
    markIndex < 0 ||
    markIndex >= rarities.length ||
    !Number.isFinite(luck) ||
    luck <= 0 ||
    rarities.some((rarity) => !Number.isFinite(rarity) || rarity <= 0)
  )
    return null;
  const reachesThis = Math.min(1, luck / rarities[markIndex]!);
  const reachesNext =
    markIndex + 1 < rarities.length ? Math.min(1, luck / rarities[markIndex + 1]!) : 0;
  return Math.max(0, reachesThis - reachesNext);
}

export function calculateMarkOutcome({
  rarities,
  markIndex,
  luck,
  marksPerSecond,
  copy,
}: {
  rarities: readonly number[];
  markIndex: number;
  luck: number;
  marksPerSecond: number;
  copy: number;
}): MarkOutcome | null {
  const probability = exactMarkProbability(rarities, markIndex, luck);
  if (
    probability === null ||
    probability <= 0 ||
    !Number.isFinite(marksPerSecond) ||
    marksPerSecond <= 0 ||
    !Number.isFinite(copy) ||
    copy <= 0
  )
    return null;
  const hitsPerSecond = marksPerSecond * probability,
    copiesPerSecond = hitsPerSecond * copy,
    averageSeconds = 1 / hitsPerSecond,
    confidenceTime = (confidence: number) => {
      if (probability >= 1) return 1 / marksPerSecond;
      return Math.log1p(-confidence) / (marksPerSecond * Math.log1p(-probability));
    };
  return {
    probability,
    denominator: 1 / probability,
    hitsPerSecond,
    copiesPerSecond,
    averageSeconds,
    chance50Seconds: confidenceTime(0.5),
    chance90Seconds: confidenceTime(0.9),
    chance95Seconds: confidenceTime(0.95),
  };
}

export const THREADS_PATH = {
  rollCost: 170e12,
  unlock: null,
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
