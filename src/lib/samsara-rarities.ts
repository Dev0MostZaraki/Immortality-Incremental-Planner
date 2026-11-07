export const FORGE_4_DEEPSTONE_COST = 60e9;
export const PART_2_MILESTONE_ASHES_COST = 75e42;
export const PART_2_MILESTONE_DEEPSTONE_MULTIPLIER = 3;

export type ForgeRouteInput = {
  currentDeepstones: number;
  deepstonesPerSecond: number | null;
  currentAshes: number;
  ashesPerSecond: number | null;
  milestonePurchased: boolean;
};

export type ForgeRouteComparison = {
  deepstonesNeeded: number;
  ashesNeeded: number;
  directSeconds: number | null;
  milestoneFarmSeconds: number | null;
  postMilestoneDeepstonesPerSecond: number | null;
  milestoneRouteSeconds: number | null;
  secondsSavedByMilestone: number | null;
  recommendation: "ready" | "direct" | "milestone" | "incomplete";
};

const timeToTarget = (remaining: number, rate: number | null) => {
  if (remaining <= 0) return 0;
  if (rate === null || !Number.isFinite(rate) || rate <= 0) return null;
  return remaining / rate;
};

/**
 * Compares mutually exclusive farming routes. The displayed x3 Deepstones milestone
 * bonus is applied once; the x2 Rarity Luck bonus is deliberately excluded because
 * its contribution to net Deepstones per second is not known.
 */
export function compareForge4Routes(input: ForgeRouteInput): ForgeRouteComparison {
  const currentDeepstones = Math.max(0, input.currentDeepstones);
  const currentAshes = Math.max(0, input.currentAshes);
  const deepstonesNeeded = Math.max(0, FORGE_4_DEEPSTONE_COST - currentDeepstones);
  const ashesNeeded = Math.max(0, PART_2_MILESTONE_ASHES_COST - currentAshes);
  const directSeconds = timeToTarget(deepstonesNeeded, input.deepstonesPerSecond);

  if (deepstonesNeeded <= 0)
    return {
      deepstonesNeeded,
      ashesNeeded,
      directSeconds: 0,
      milestoneFarmSeconds: null,
      postMilestoneDeepstonesPerSecond: null,
      milestoneRouteSeconds: null,
      secondsSavedByMilestone: null,
      recommendation: "ready",
    };

  if (input.milestonePurchased)
    return {
      deepstonesNeeded,
      ashesNeeded: 0,
      directSeconds,
      milestoneFarmSeconds: null,
      postMilestoneDeepstonesPerSecond: input.deepstonesPerSecond,
      milestoneRouteSeconds: null,
      secondsSavedByMilestone: null,
      recommendation: directSeconds === null ? "incomplete" : "direct",
    };

  const milestoneFarmSeconds = timeToTarget(ashesNeeded, input.ashesPerSecond);
  const postMilestoneDeepstonesPerSecond =
    input.deepstonesPerSecond !== null && input.deepstonesPerSecond > 0
      ? input.deepstonesPerSecond * PART_2_MILESTONE_DEEPSTONE_MULTIPLIER
      : null;
  const postMilestoneFarmSeconds = timeToTarget(deepstonesNeeded, postMilestoneDeepstonesPerSecond);
  const milestoneRouteSeconds =
    milestoneFarmSeconds === null || postMilestoneFarmSeconds === null
      ? null
      : milestoneFarmSeconds + postMilestoneFarmSeconds;
  const secondsSavedByMilestone =
    directSeconds === null || milestoneRouteSeconds === null
      ? null
      : directSeconds - milestoneRouteSeconds;

  return {
    deepstonesNeeded,
    ashesNeeded,
    directSeconds,
    milestoneFarmSeconds,
    postMilestoneDeepstonesPerSecond,
    milestoneRouteSeconds,
    secondsSavedByMilestone,
    recommendation:
      directSeconds === null || milestoneRouteSeconds === null
        ? "incomplete"
        : milestoneRouteSeconds < directSeconds
          ? "milestone"
          : "direct",
  };
}

export const RARITY_FORGES = [
  {
    id: 1,
    cost: "120 M Deepstones",
    bonuses: ["×2 Rarity Luck", "×2 Deepstones", "×100 Ud Qi"],
    status: "confirmed",
  },
  {
    id: 2,
    cost: "640 Oc Soul Threads",
    bonuses: ["×1.5 Rarity Speed", "×3 Soul Threads", "×100 Qi Qi"],
    status: "confirmed",
  },
  {
    id: 3,
    cost: "190 Ud Karmic Ashes",
    bonuses: ["Unlock Karmic Milestones 17–22", "×3 Rarity Luck", "×10 Karmic Ashes", "×100 Dc Qi"],
    status: "confirmed",
  },
  {
    id: 4,
    cost: "60 B Deepstones",
    bonuses: ["×5 Deepstones", "×2 Path Luck", "×10 Vg Qi"],
    status: "confirmed",
  },
  {
    id: 5,
    cost: "Unknown",
    bonuses: ["Unlock additional Karmic Ashes upgrades", "Other bonuses unknown"],
    status: "partial",
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    id: index + 6,
    cost: "Unknown",
    bonuses: ["Unknown"],
    status: "unknown",
  })),
] as const;

export const DEEPSTONE_UPGRADE_SNAPSHOTS = [
  {
    name: "Deepstone Boost",
    cap: 50,
    hypothesis:
      "Beobachtetes Effektverhältnis: ungefähr ×1,5 pro Level. Exakte Kostenformel unbekannt.",
    rows: [
      [5, "×7.59", "×11.39", "2.13 K"],
      [9, "×38.44", "×57.67", "42.35 K"],
      [10, "×57.67", "×86.5", "1.94 M"],
      [11, "×86.5", "×129.75", "9.05 M"],
      [12, "×129.75", "×194.62", "44.65 M"],
    ],
  },
  {
    name: "Rarity Luck",
    cap: 50,
    hypothesis:
      "Beobachtetes Effektverhältnis in höheren Leveln: ungefähr ×1,3. Exakte Formel unbekannt.",
    rows: [
      [4, "×2.86", "×3.71", "3.04 K"],
      [7, "×6.27", "×8.16", "226.39 K"],
      [8, "×8.16", "×10.6", "1.09 M"],
      [9, "×10.6", "×13.79", "5.62 M"],
      [10, "×13.79", "×17.92", "31 M"],
      [11, "×17.92", "Unknown", "182.97 M"],
    ],
  },
  {
    name: "Rarity Speed",
    cap: 20,
    hypothesis: "Beobachtetes Effektverhältnis: ungefähr ×1,1 pro Level. Exakte Formel unbekannt.",
    rows: [
      [3, "×1.33", "×1.46", "2.85 K"],
      [6, "×1.77", "×1.95", "383.94 K"],
      [7, "×1.95", "×2.14", "2.38 M"],
      [8, "×2.14", "×2.36", "16.24 M"],
      [9, "×2.36", "Unknown", "121.82 M"],
    ],
  },
] as const;

export const DEEPSTONE_PATHS = [
  {
    name: "Shard",
    baseDisplay: "1 (1/1)",
    observedChance: "99.91%",
    observedCopies: "20.7 K",
    bonuses: ["×644.34 Qi", "×1.01 Deepstones"],
    maxText: "500M copies to max",
  },
  {
    name: "Geode",
    baseDisplay: "1 (1/10 T)",
    observedChance: "1 / 1.08 K",
    observedCopies: "5",
    bonuses: ["×1 T Qi", "×1 Rarity Luck"],
    maxText: "5M copies to max",
  },
  ...["Bedrock", "Vein", "Magmacore", "Abyssal Ore", "Worldroot", "Heartstone"].map((name) => ({
    name,
    baseDisplay: "Unknown",
    observedChance: "Unknown",
    observedCopies: "Unknown",
    bonuses: ["Unknown"],
    maxText: "Unknown",
  })),
] as const;

export const KNOWN_RARITY_CHECKPOINTS = [
  [6, "Basalt"],
  [10, "Jasper"],
  [11, "Agate"],
  [17, "Citrine"],
  [25, "Emerald"],
  [33, "Thunderrock"],
  [41, "Celestite"],
] as const;
