import { SUFFIXES } from "./endurance";
import type { NU } from "@/components/planner-fields";
import type { KarmicUpgradeId } from "./samsara";
export const SAMSARA_KEY = "ii-samsara-world10-v1";
export type SamsaraState = {
  selected: KarmicUpgradeId;
  levels: Record<KarmicUpgradeId, number>;
  currentAshes: NU;
  ashesGain: NU;
  targetAshes: NU;
  previewCount: number;
  maxRoutePurchases: number;
};
export const SAMSARA_DEFAULTS: SamsaraState = {
  selected: "ashesBoost",
  levels: { ashesBoost: 0, moreAshes: 0, punchSpeed: 0 },
  currentAshes: { v: "", u: "B" },
  ashesGain: { v: "", u: "M" },
  targetAshes: { v: "", u: "M" },
  previewCount: 3,
  maxRoutePurchases: 5,
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
    restored = { ...SAMSARA_DEFAULTS, levels: { ...SAMSARA_DEFAULTS.levels } };
  if (
    row["selected"] === "ashesBoost" ||
    row["selected"] === "moreAshes" ||
    row["selected"] === "punchSpeed"
  )
    restored.selected = row["selected"];
  for (const key of ["currentAshes", "ashesGain", "targetAshes"] as const)
    if (isNU(row[key])) restored[key] = row[key];
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
  return restored;
}
