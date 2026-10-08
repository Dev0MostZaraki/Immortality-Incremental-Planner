// Law Synthesis snapshot: Astral3nt Immortality Incremental Hub (fan-maintained, snapshot Oct 2026).
// Pure, deterministic math. Times are expected averages, never RNG guarantees.

export const MATERIALS = ["Lucent", "Ichor", "Cindral", "Kismet", "Aster", "Aeon", "Solace", "Morrow", "Sable", "Axiom", "Grace"] as const;
export type Mat = (typeof MATERIALS)[number];

export const MAT_SOURCE: Record<Mat, { chance: number; sec: number; mark: string }> = {
  Lucent: { chance: 3.5, sec: 29, mark: "Insight Mark" },
  Ichor: { chance: 3.1, sec: 32, mark: "Essence Mark" },
  Cindral: { chance: 2.7, sec: 37, mark: "Soulfire Mark" },
  Kismet: { chance: 2.35, sec: 43, mark: "Karma Mark" },
  Aster: { chance: 2.05, sec: 49, mark: "Stars Mark" },
  Aeon: { chance: 1.8, sec: 56, mark: "Nebulae Mark" },
  Solace: { chance: 1.55, sec: 65, mark: "Quasar Mark" },
  Morrow: { chance: 1.35, sec: 74, mark: "Miasma Mark" },
  Sable: { chance: 1.15, sec: 87, mark: "Ash Mark" },
  Axiom: { chance: 1, sec: 100, mark: "Laws Mark" },
  Grace: { chance: 0.85, sec: 118, mark: "Faith Mark" },
};

export type Law = { id: string; name: string; mats: Mat[]; step: number; coreStep: number };
const law = (name: string, mats: Mat[], step: number, coreStep: number): Law => ({ id: name.toLowerCase(), name, mats, step, coreStep });
export const LAWS: Law[] = [
  law("Perception", ["Lucent"], 5, 25_000), law("Illusion", ["Ichor"], 5, 25_000), law("Anima", ["Cindral"], 5, 25_000),
  law("Alacrity", ["Kismet", "Morrow"], 10, 50_000), law("Strength", ["Aster", "Sable"], 10, 50_000), law("Darkness", ["Aeon", "Axiom"], 10, 50_000),
  law("Time", ["Solace", "Grace"], 15, 100_000), law("Life", ["Cindral", "Morrow"], 15, 100_000), law("Death", ["Grace", "Axiom"], 15, 100_000),
];
export const MAX_LEVEL = 10;

export const MULTIPLIERS = ["First Reincarnation", "Mark of Ash Secret Maxed", "Beast Stage 300", "World 5 Secret Upgrade", "Divinity Board 3"] as const;

export type MatAmounts = Partial<Record<Mat, number>>;
export const clampLevel = (n: number) => Math.min(MAX_LEVEL, Math.max(0, Math.round(Number.isFinite(n) ? n : 0)));

/** Cumulative cost for levels current+1..target only. target < current yields zero (never negative). */
export function lawCost(l: Law, current: number, target: number) {
  const c = clampLevel(current), t = clampLevel(target);
  let sum = 0;
  for (let lv = c + 1; lv <= t; lv++) sum += lv;
  const mats: MatAmounts = {};
  for (const m of l.mats) mats[m] = (mats[m] ?? 0) + l.step * sum;
  return { mats, cores: l.coreStep * sum, levels: Math.max(0, t - c) };
}

export type Levels = Record<string, { cur: number; tgt: number }>;
export function clearLawTargets(levels: Levels): Levels {
  return Object.fromEntries(LAWS.map((law) => {
    const cur = clampLevel(levels[law.id]?.cur ?? 0);
    return [law.id, { cur, tgt: cur }];
  }));
}
export function totalCost(levels: Levels, ids?: string[]) {
  const mats: MatAmounts = {};
  let cores = 0, levelsLeft = 0;
  for (const l of LAWS) {
    if (ids && !ids.includes(l.id)) continue;
    const lv = levels[l.id] ?? { cur: 0, tgt: 0 };
    const r = lawCost(l, lv.cur, lv.tgt);
    for (const [m, v] of Object.entries(r.mats) as [Mat, number][]) mats[m] = (mats[m] ?? 0) + v;
    cores += r.cores; levelsLeft += r.levels;
  }
  return { mats, cores, levels: levelsLeft };
}

export const multiplier = (toggles: boolean[], custom: number) =>
  toggles.reduce((m, on) => (on ? m * 2 : m), 1) * (Number.isFinite(custom) && custom > 0 ? custom : 1);

export type MatSetting = { base: number; observed: number | null; perDrop: number | null };
export type FarmSettings = { mult: number; perDrop: number; mode: "source" | "measured"; mats: Record<Mat, MatSetting> };

/** Expected seconds per material. Source/base time is divided by the multiplier;
 * a measured time is used as-is (it already includes your boosts), only in "measured" mode. */
export function effSec(m: Mat, s: FarmSettings) {
  const x = s.mats[m];
  const per = x.perDrop && x.perDrop > 0 ? x.perDrop : s.perDrop > 0 ? s.perDrop : 1;
  const measured = s.mode === "measured" && x.observed !== null && x.observed > 0;
  const perDrop = measured && x.observed !== null ? x.observed : x.base / (s.mult > 0 ? s.mult : 1);
  return { sec: perDrop / per, perDrop, measured };
}

export function planMaterials(needed: MatAmounts, have: MatAmounts, s: FarmSettings) {
  const rows = MATERIALS.map((m) => {
    const need = needed[m] ?? 0, own = Math.max(0, have[m] ?? 0);
    const missing = Math.max(0, need - own);
    const e = effSec(m, s);
    return { mat: m, mark: MAT_SOURCE[m].mark, need, have: own, missing, surplus: Math.max(0, own - need), base: s.mats[m].base, eff: e.sec, measured: e.measured, eta: missing * e.sec };
  });
  const active = rows.filter((r) => r.missing > 0);
  const total = active.reduce((a, r) => a + r.eta, 0); // sequential: one Mark at a time
  const bottleneck = active.reduce<(typeof rows)[number] | null>((b, r) => (!b || r.eta > b.eta ? r : b), null);
  return { rows, total, bottleneck };
}

export type CoreUnit = "cps" | "cpm" | "sp1k";
/** Cores per second, or null when no usable rate is supplied. */
export function coreRate(value: number | null, unit: CoreUnit): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  return unit === "cps" ? value : unit === "cpm" ? value / 60 : 1000 / value;
}
export const coreSeconds = (cores: number, rate: number | null) => (rate === null ? null : cores / rate);

/** Per-law expected time from gross requirements (inventory is shared, so it is applied only in the route). */
export function lawTime(l: Law, cur: number, tgt: number, s: FarmSettings, rate: number | null) {
  const c = lawCost(l, cur, tgt);
  const parts = l.mats.map((m) => ({ mat: m, amount: c.mats[m] ?? 0, secs: (c.mats[m] ?? 0) * effSec(m, s).sec }));
  const mat = parts.reduce((a, p) => a + p.secs, 0);
  const core = coreSeconds(c.cores, rate);
  return { ...c, parts, mat, core, total: mat + (core ?? 0) };
}

export function farmSummary(label: string, rows: { mat: Mat; missing: number }[], cores: number, fmt: (n: number) => string, emptyLabel = "keine Materialien") {
  const parts = rows.filter((r) => r.missing > 0).map((r) => `${fmt(r.missing)} ${r.mat} @ ${MAT_SOURCE[r.mat].mark}`);
  return `${label}: ${parts.length ? parts.join(", ") : emptyLabel}${cores > 0 ? ` + ${fmt(cores)} Cores` : ""}`;
}

export const sourceSettings = (): Record<Mat, MatSetting> =>
  Object.fromEntries(MATERIALS.map((m) => [m, { base: MAT_SOURCE[m].sec, observed: null, perDrop: null }])) as Record<Mat, MatSetting>;