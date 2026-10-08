import { LAWS, MATERIALS, MAT_SOURCE, MULTIPLIERS, clampLevel, type Levels, type Mat, type CoreUnit } from "./lawsynth";

export type MatText = { base: string; obs: string; per: string };
export type LS = {
  levels: Levels; toggles: boolean[]; custom: string; perDrop: string; mode: "source" | "measured";
  mats: Record<Mat, MatText>; inv: Record<Mat, string>; coreRate: string; coreUnit: CoreUnit; note: string;
  filter: "all" | "progress" | "remaining" | "done"; order: "bottleneck" | "cheapest"; showAll: boolean;
  scope: "all" | "selected"; check: Record<string, boolean>; tab: "plan" | "settings";
};
export const LAW_KEY = "ii-lawsynth-v1";
export const srcMats = (): Record<Mat, MatText> => Object.fromEntries(MATERIALS.map((m) => [m, { base: String(MAT_SOURCE[m].sec), obs: "", per: "" }])) as Record<Mat, MatText>;
export const LAW_DEFAULTS: LS = {
  levels: Object.fromEntries(LAWS.map((l) => [l.id, { cur: 0, tgt: 0 }])), toggles: MULTIPLIERS.map(() => false), custom: "1", perDrop: "1",
  mode: "source", mats: srcMats(), inv: Object.fromEntries(MATERIALS.map((m) => [m, ""])) as Record<Mat, string>,
  coreRate: "", coreUnit: "cpm", note: "", filter: "all", order: "bottleneck", showAll: false, scope: "all", check: {}, tab: "plan",
};
const str = (v: unknown, d: string) => (typeof v === "string" ? v.slice(0, 200) : d);
export function restoreLaw(raw: string): LS {
  const x = JSON.parse(raw) as { [K in keyof LS]?: any };
  if (!x || typeof x !== "object") return LAW_DEFAULTS;
  const s: LS = { ...LAW_DEFAULTS, mats: srcMats(), inv: { ...LAW_DEFAULTS.inv }, levels: { ...LAW_DEFAULTS.levels } };
  for (const l of LAWS) { const v = x.levels?.[l.id]; if (v && typeof v.cur === "number" && typeof v.tgt === "number") s.levels[l.id] = { cur: clampLevel(v.cur), tgt: Math.max(clampLevel(v.cur), clampLevel(v.tgt)) }; }
  if (Array.isArray(x.toggles)) s.toggles = MULTIPLIERS.map((_, i) => x.toggles[i] === true);
  for (const m of MATERIALS) {
    const v = x.mats?.[m]; if (v) s.mats[m] = { base: str(v.base, s.mats[m].base), obs: str(v.obs, ""), per: str(v.per, "") };
    s.inv[m] = str(x.inv?.[m], "");
  }
  s.custom = str(x.custom, "1"); s.perDrop = str(x.perDrop, "1"); s.coreRate = str(x.coreRate, ""); s.note = str(x.note, "");
  if (x.mode === "measured") s.mode = "measured";
  if (["cps", "cpm", "sp1k"].includes(x.coreUnit)) s.coreUnit = x.coreUnit;
  if (["all", "progress", "remaining", "done"].includes(x.filter)) s.filter = x.filter;
  if (x.order === "cheapest") s.order = "cheapest";
  if (x.scope === "selected") s.scope = "selected";
  if (x.tab === "settings") s.tab = "settings";
  s.showAll = x.showAll === true;
  if (x.check && typeof x.check === "object") s.check = Object.fromEntries(Object.entries(x.check).filter(([, v]) => v === true)) as Record<string, boolean>;
  return s;
}