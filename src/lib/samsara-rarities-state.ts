import type { NU } from "@/components/planner-fields";
import { SUFFIXES } from "./endurance";

export const SAMSARA_RARITIES_KEY = "ii-samsara-rarities-v1";

export type SamsaraRaritiesState = {
  currentDeepstones: NU;
  deepstonesPerSecond: NU;
  currentAshes: NU;
  ashesPerSecond: NU;
  milestonePurchased: boolean;
};

export const SAMSARA_RARITIES_DEFAULTS: SamsaraRaritiesState = {
  currentDeepstones: { v: "", u: "B" },
  deepstonesPerSecond: { v: "", u: "M" },
  currentAshes: { v: "", u: "Td" },
  ashesPerSecond: { v: "", u: "Dd" },
  milestonePurchased: false,
};

const isNU = (value: unknown): value is NU => {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row["v"] === "string" &&
    row["v"].length <= 40 &&
    typeof row["u"] === "string" &&
    SUFFIXES.includes(row["u"])
  );
};

export function restoreSamsaraRarities(raw: unknown): SamsaraRaritiesState {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return SAMSARA_RARITIES_DEFAULTS;
    }
  }
  if (!data || typeof data !== "object") return SAMSARA_RARITIES_DEFAULTS;
  const row = data as Record<string, unknown>;
  const restored = { ...SAMSARA_RARITIES_DEFAULTS };
  for (const key of [
    "currentDeepstones",
    "deepstonesPerSecond",
    "currentAshes",
    "ashesPerSecond",
  ] as const)
    if (isNU(row[key])) restored[key] = row[key];
  if (typeof row["milestonePurchased"] === "boolean")
    restored.milestonePurchased = row["milestonePurchased"];
  return restored;
}
