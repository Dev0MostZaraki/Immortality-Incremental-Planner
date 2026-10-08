import { z } from "zod";
import { SUFFIXES, DURATION_UNITS } from "./endurance";
import { ENDURANCE_KEY, DEFAULTS, restoreState } from "./planner-state";
import { LAW_KEY, LAW_DEFAULTS, restoreLaw } from "./law-state";
import { LANGUAGE_KEY, restoreLanguage } from "./i18n";
import { LAWS, MATERIALS } from "./lawsynth";

export const APP_VERSION = "1.2.0";
export const DATA_KEYS = [ENDURANCE_KEY, LAW_KEY, LANGUAGE_KEY] as const;
const text = z.string().max(200);
const numeric = z.number().finite();
const nu = z.object({ v: text, u: z.string().refine((unit) => SUFFIXES.some((u) => u === unit)) });
const duration = z.object({ v: text, u: z.string().refine((unit) => DURATION_UNITS.some((u) => u.id === unit)) });
const prog = z.object({
  upName: text, mtLevel: text, upCost: nu, upGain: nu, nextCost: nu, nextGain: nu, comboGain: nu,
  path: z.array(z.object({ id: numeric, name: text, level: text, cost: nu, gain: nu })).max(6),
  milestones: z.array(nu.extend({ id: numeric, name: text })).max(8),
  resetBefore: nu, resetAfter: nu, resetLoss: nu, wiMult: text, wiFlat: nu, wiTarget: text,
});
const endurance = z.object({
  gain: nu, cur: nu, target: nu, next: nu, dur: duration, proj: duration,
  targets: z.array(nu.extend({ id: numeric })).max(10), mode: z.enum(["simple", "progression", "advanced"]),
  scenarioA: nu.nullable(), scenarioB: nu.nullable(), scenarioC: nu, custom: nu, savedCustom: nu.nullable(),
  prog, tool: z.enum(["endurance", "law"]),
});
const knownMaterials = <T extends z.ZodTypeAny>(value: T) => z.object(Object.fromEntries(MATERIALS.map((m) => [m, value])) as Record<(typeof MATERIALS)[number], T>);
const level = z.object({ cur: z.number().int().min(0).max(10), tgt: z.number().int().min(0).max(10) }).refine((v) => v.tgt >= v.cur);
const law = z.object({
  levels: z.object(Object.fromEntries(LAWS.map((l) => [l.id, level]))),
  toggles: z.array(z.boolean()).length(5), custom: text, perDrop: text, mode: z.enum(["source", "measured"]),
  mats: knownMaterials(z.object({ base: text, obs: text, per: text })), inv: knownMaterials(text),
  coreRate: text, coreUnit: z.enum(["cps", "cpm", "sp1k"]), note: text,
  filter: z.enum(["all", "progress", "remaining", "done"]), order: z.enum(["bottleneck", "cheapest"]), showAll: z.boolean(),
  scope: z.enum(["all", "selected"]), check: z.record(z.boolean()).refine((v) => Object.keys(v).every((k) => MATERIALS.some((m) => k === `m-${m}`) || LAWS.some((l) => k === `l-${l.id}`))),
  tab: z.enum(["plan", "settings"]),
});
const schema = z.object({ app: z.literal("immortality-incremental-planner"), version: z.enum(["1.1.0", APP_VERSION]), dataVersion: z.literal(1), endurance, law, language: z.enum(["de", "en"]) });
export type Backup = z.infer<typeof schema>;

export function parseBackup(raw: string): Backup {
  if (raw.length > 1_000_000) throw new Error("Invalid backup");
  const parsed: unknown = JSON.parse(raw);
  // Reject prototype-related keys even though nothing is evaluated or merged into a prototype.
  if (/"(?:__proto__|constructor|prototype)"\s*:/.test(raw)) throw new Error("Invalid backup");
  return schema.parse(parsed);
}
export function exportBackup(storage: Pick<Storage, "getItem">): string {
  const e = storage.getItem(ENDURANCE_KEY), l = storage.getItem(LAW_KEY);
  const data = { app: "immortality-incremental-planner", version: APP_VERSION, dataVersion: 1,
    endurance: e ? restoreState(e) : DEFAULTS, law: l ? restoreLaw(l) : LAW_DEFAULTS, language: restoreLanguage(storage.getItem(LANGUAGE_KEY)) };
  return JSON.stringify(schema.parse(data), null, 2);
}
export function importBackup(raw: string, storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): void {
  const data = parseBackup(raw);
  const previous = DATA_KEYS.map((key) => storage.getItem(key));
  try {
    storage.setItem(ENDURANCE_KEY, JSON.stringify(restoreState(JSON.stringify(data.endurance))));
    storage.setItem(LAW_KEY, JSON.stringify(restoreLaw(JSON.stringify(data.law))));
    storage.setItem(LANGUAGE_KEY, data.language);
  } catch (error) {
    DATA_KEYS.forEach((key, i) => { try { const value = previous[i]; if (value === null || value === undefined) storage.removeItem(key); else storage.setItem(key, value); } catch { /* Storage unavailable: report failure to caller. */ } });
    throw error;
  }
}
export function clearAppData(storage: Pick<Storage, "removeItem">): void {
  DATA_KEYS.forEach((key) => storage.removeItem(key));
}