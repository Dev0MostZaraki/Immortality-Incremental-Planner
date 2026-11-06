import { SUFFIXES } from "./endurance";
import type { NU } from "@/components/planner-fields";
import {
  SOUL_THREAD_UPGRADES,
  type KarmicUpgradeId,
  type MarkBoardId,
  type SoulThreadBonusId,
  type SoulThreadUpgradeId,
} from "./samsara";
export const SAMSARA_KEY = "ii-samsara-world10-v1";
export type SamsaraState = {
  selected: KarmicUpgradeId;
  levels: Record<KarmicUpgradeId, number>;
  soulThreadLevels: Record<SoulThreadUpgradeId, number>;
  soulThreadRunAshes: NU;
  soulThreadTarget: NU;
  soulThreadNextMilestone: number;
  soulThreadBonuses: Record<SoulThreadBonusId, boolean>;
  currentAshes: NU;
  ashesPerAttack: NU;
  attackCooldown: string;
  targetAshes: NU;
  previewCount: number;
  maxRoutePurchases: number;
  markBoard: MarkBoardId;
  markIndex: number;
  markUseRollableLuck: boolean;
  markUseMarkSpeed: boolean;
  markLuck: NU;
  markMps: NU;
  markCopy: string;
  markCurrentCopies: NU;
  markTargetCopies: NU;
};
export const SAMSARA_DEFAULTS: SamsaraState = {
  selected: "ashesBoost",
  levels: { ashesBoost: 0, moreAshes: 0, punchSpeed: 0 },
  soulThreadLevels: {
    moreThreads: 0,
    ashesBoost: 0,
    qiBoost: 0,
    luckBoost: 0,
    pathLuck: 0,
    pathSpeed: 0,
    pathBulk: 0,
  },
  soulThreadRunAshes: { v: "", u: "T" },
  soulThreadTarget: { v: "", u: "B" },
  soulThreadNextMilestone: 14,
  soulThreadBonuses: {
    soulbrand: false,
    strand: false,
    loom: false,
    tapestry: false,
    fateknot: false,
    weaversEnd: false,
  },
  currentAshes: { v: "", u: "B" },
  ashesPerAttack: { v: "", u: "T" },
  attackCooldown: "",
  targetAshes: { v: "", u: "M" },
  previewCount: 3,
  maxRoutePurchases: 5,
  markBoard: "karmic",
  markIndex: 3,
  markUseRollableLuck: true,
  markUseMarkSpeed: true,
  markLuck: { v: "", u: "M" },
  markMps: { v: "", u: "Qa" },
  markCopy: "1",
  markCurrentCopies: { v: "", u: "" },
  markTargetCopies: { v: "", u: "" },
};
const isNU = (value: unknown): value is NU => {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row["v"] === "string" &&
    typeof row["u"] === "string" &&
    SUFFIXES.some((unit) => unit === row["u"])
  );
};
export function restoreSamsara(raw: unknown): SamsaraState {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return SAMSARA_DEFAULTS;
    }
  }
  if (!data || typeof data !== "object") return SAMSARA_DEFAULTS;
  const row = data as Record<string, unknown>,
    restored = {
      ...SAMSARA_DEFAULTS,
      levels: { ...SAMSARA_DEFAULTS.levels },
      soulThreadLevels: { ...SAMSARA_DEFAULTS.soulThreadLevels },
      soulThreadBonuses: { ...SAMSARA_DEFAULTS.soulThreadBonuses },
    };
  if (
    row["selected"] === "ashesBoost" ||
    row["selected"] === "moreAshes" ||
    row["selected"] === "punchSpeed"
  )
    restored.selected = row["selected"];
  for (const key of [
    "currentAshes",
    "ashesPerAttack",
    "targetAshes",
    "soulThreadRunAshes",
    "soulThreadTarget",
    "markLuck",
    "markMps",
    "markCurrentCopies",
    "markTargetCopies",
  ] as const)
    if (isNU(row[key])) restored[key] = row[key];
  if (typeof row["attackCooldown"] === "string" && row["attackCooldown"].length <= 40)
    restored.attackCooldown = row["attackCooldown"];
  if (row["levels"] && typeof row["levels"] === "object")
    for (const [id, maximum] of [
      ["ashesBoost", 50],
      ["moreAshes", 30],
      ["punchSpeed", 25],
    ] as const) {
      const value = (row["levels"] as Record<string, unknown>)[id];
      if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maximum)
        restored.levels[id] = value;
    }
  if (row["soulThreadLevels"] && typeof row["soulThreadLevels"] === "object")
    for (const upgrade of SOUL_THREAD_UPGRADES) {
      const value = (row["soulThreadLevels"] as Record<string, unknown>)[upgrade.id];
      if (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= upgrade.maxLevel
      )
        restored.soulThreadLevels[upgrade.id] = value;
    }
  if (
    typeof row["soulThreadNextMilestone"] === "number" &&
    Number.isInteger(row["soulThreadNextMilestone"]) &&
    row["soulThreadNextMilestone"] >= 2 &&
    row["soulThreadNextMilestone"] <= 18
  )
    restored.soulThreadNextMilestone = row["soulThreadNextMilestone"];
  if (row["soulThreadBonuses"] && typeof row["soulThreadBonuses"] === "object")
    for (const id of [
      "soulbrand",
      "strand",
      "loom",
      "tapestry",
      "fateknot",
      "weaversEnd",
    ] as const) {
      const value = (row["soulThreadBonuses"] as Record<string, unknown>)[id];
      if (typeof value === "boolean") restored.soulThreadBonuses[id] = value;
    }
  if (
    typeof row["previewCount"] === "number" &&
    Number.isInteger(row["previewCount"]) &&
    row["previewCount"] >= 1 &&
    row["previewCount"] <= 10
  )
    restored.previewCount = row["previewCount"];
  if (
    typeof row["maxRoutePurchases"] === "number" &&
    Number.isInteger(row["maxRoutePurchases"]) &&
    row["maxRoutePurchases"] >= 0 &&
    row["maxRoutePurchases"] <= 8
  )
    restored.maxRoutePurchases = row["maxRoutePurchases"];
  if (row["markBoard"] === "karmic" || row["markBoard"] === "threads")
    restored.markBoard = row["markBoard"];
  if (typeof row["markUseRollableLuck"] === "boolean")
    restored.markUseRollableLuck = row["markUseRollableLuck"];
  if (typeof row["markUseMarkSpeed"] === "boolean")
    restored.markUseMarkSpeed = row["markUseMarkSpeed"];
  if (
    typeof row["markIndex"] === "number" &&
    Number.isInteger(row["markIndex"]) &&
    row["markIndex"] >= 0 &&
    row["markIndex"] < 8
  )
    restored.markIndex = row["markIndex"];
  if (typeof row["markCopy"] === "string" && row["markCopy"].length <= 20)
    restored.markCopy = row["markCopy"];
  return restored;
}
