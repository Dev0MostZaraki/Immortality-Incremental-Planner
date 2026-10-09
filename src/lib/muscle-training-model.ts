/** Community observations, not an official game formula. Keep projections at full precision. */
export const MUSCLE_TRAINING_MODEL = {
  id: "community-observed-2026-10",
  version: "2.0.0",
  lastUpdated: "2026-10-09",
  patchNote: null,
  baseCost: 1000,
  costMultiplier: 2.1,
  gainMultiplier: 1.4,
  maxLevel: 150,
  evidence: [
    { level: 59, displayedCost: 10.26, unit: "Sx", source: "community-report" },
    { level: 60, displayedCost: 21.54, unit: "Sx", source: "community-report" },
  ],
} as const;