import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { UnitField, val, type NU } from "./planner-fields";
import { useI18n } from "./LanguageProvider";
import { SUFFIXES } from "@/lib/endurance";
import {
  bestKarmicRoute,
  compareSamsaraPurchase,
  KARMIC_PATHS,
  KARMIC_PATH_ROLL_COST,
  KARMIC_UPGRADES,
  karmicUpgradeCost,
  karmicUpgradeEffect,
  karmicUpgradeTotalCost,
  SAMSARA_MILESTONES,
  SOUL_THREAD_RESET,
  SOUL_THREAD_UPGRADES,
  THREADS_PATH,
  type KarmicUpgradeId,
} from "@/lib/samsara";
import {
  SAMSARA_DEFAULTS,
  SAMSARA_KEY,
  restoreSamsara,
  type SamsaraState,
} from "@/lib/samsara-state";

const asNU = (value: number): NU => {
  if (!Number.isFinite(value) || value <= 0) return { v: "0", u: "" };
  const index = Math.min(SUFFIXES.length - 1, Math.max(0, Math.floor(Math.log10(value) / 3)));
  return { v: String(value / 10 ** (index * 3)), u: SUFFIXES[index] ?? "" };
};

export function SamsaraWorld10() {
  const { t: tr, fmtSuffix, naturalDuration } = useI18n();
  const [state, setState] = useState<SamsaraState>(SAMSARA_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAMSARA_KEY);
      if (raw) setState(restoreSamsara(raw));
    } catch {
      setStorageError(true);
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem(SAMSARA_KEY, JSON.stringify(state));
      } catch {
        setStorageError(true);
      }
  }, [state, loaded]);
  const set = <K extends keyof SamsaraState>(key: K, value: SamsaraState[K]) =>
    setState((current) => ({ ...current, [key]: value }));
  const ashes = val(state.currentAshes) ?? 0,
    gain = val(state.ashesGain),
    target = val(state.targetAshes);
  const ready = gain !== null && gain > 0 && target !== null;
  const selected = KARMIC_UPGRADES.find((upgrade) => upgrade.id === state.selected)!;
  const previewCount = Math.min(state.previewCount, selected.maxLevel - state.levels[selected.id]);
  const previewCost = karmicUpgradeTotalCost(selected.id, state.levels[selected.id], previewCount);
  const comparisons = ready
    ? KARMIC_UPGRADES.map((upgrade) => {
        const level = state.levels[upgrade.id],
          cost = karmicUpgradeCost(upgrade.id, level);
        const result =
          cost === null
            ? null
            : compareSamsaraPurchase({
                currentAshes: ashes,
                ashesPerSecond: gain,
                targetAshes: target,
                displayedCost: cost,
                postPurchaseGain: gain * upgrade.effectPerLevel,
              });
        return { upgrade, level, cost, result };
      })
    : [];
  const bestSingle = comparisons
    .filter((row) => row.result)
    .sort((a, b) => (a.result?.withPurchase ?? Infinity) - (b.result?.withPurchase ?? Infinity))[0];
  const route = useMemo(
    () =>
      ready
        ? bestKarmicRoute({
            currentAshes: ashes,
            ashesPerSecond: gain,
            targetAshes: target,
            levels: state.levels,
            maxPurchases: state.maxRoutePurchases,
          })
        : null,
    [ashes, gain, ready, state.levels, state.maxRoutePurchases, target],
  );

  return (
    <main className="space-y-6" data-testid="samsara-world10">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <p className="section-label">WORLD 10</p>
          <h2 className="text-2xl font-semibold">Samsara</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {tr(
              "Karmic Ashes, Milestones, Karmic Path und Soul Threads – bestätigte Werte und klar markierte offene Mechaniken.",
            )}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setState(SAMSARA_DEFAULTS)}>
          <RotateCcw />
          {tr("Samsara-Eingaben zurücksetzen")}
        </Button>
      </div>

      <section className="panel p-4 sm:p-5" aria-labelledby="samsara-calculator-title">
        <div className="mb-4">
          <h3 id="samsara-calculator-title" className="text-lg font-semibold">
            {tr("Upgrade-Rechner und Kaufvergleich")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr(
              "Kostenmodelle sind mathematisch stark gegen Screenshots validiert, aber nicht aus dem Spielcode bestätigt.",
            )}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field
            label={tr("Aktuelle Karmic Ashes")}
            id="samsara-current"
            value={state.currentAshes}
            onChange={(value) => set("currentAshes", value)}
          />
          <Field
            label={tr("Ashes pro Sekunde")}
            id="samsara-gain"
            value={state.ashesGain}
            onChange={(value) => set("ashesGain", value)}
            suffix="/ s"
          />
          <Field
            label={tr("Ziel / Milestone-Kosten")}
            id="samsara-target"
            value={state.targetAshes}
            onChange={(value) => set("targetAshes", value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-label={tr("Bekannte Milestone-Ziele")}>
          {SAMSARA_MILESTONES.filter((milestone) => milestone.cost !== null).map((milestone) => (
            <Button
              key={milestone.id}
              variant="outline"
              size="sm"
              onClick={() => set("targetAshes", asNU(milestone.cost!))}
            >
              M{milestone.id} · {fmtSuffix(milestone.cost!)}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {tr(
            "Die eingegebene Produktion enthält bereits freigeschaltete Milestone- und Path-Boni; sie werden nicht erneut multipliziert.",
          )}
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {KARMIC_UPGRADES.map((upgrade) => {
            const level = state.levels[upgrade.id],
              cost = karmicUpgradeCost(upgrade.id, level),
              effect = karmicUpgradeEffect(upgrade.id, level),
              next = karmicUpgradeEffect(upgrade.id, Math.min(upgrade.maxLevel, level + 1));
            return (
              <button
                key={upgrade.id}
                type="button"
                aria-pressed={state.selected === upgrade.id}
                onClick={() => set("selected", upgrade.id)}
                className={`min-w-0 rounded-lg border p-4 text-left ${state.selected === upgrade.id ? "border-primary bg-accent/40" : "bg-card"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <strong>{upgrade.name}</strong>
                  <span className="text-xs text-muted-foreground">
                    {level}/{upgrade.maxLevel}
                  </span>
                </span>
                <input
                  aria-label={`${upgrade.name} ${tr("Aktuelles Level")}`}
                  type="number"
                  min={0}
                  max={upgrade.maxLevel}
                  value={level}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    set("levels", {
                      ...state.levels,
                      [upgrade.id]: Math.min(
                        upgrade.maxLevel,
                        Math.max(0, Number(event.target.value) || 0),
                      ),
                    })
                  }
                  className="field mt-3 w-full px-3 py-2 font-mono outline-none"
                />
                <span className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span>
                    <span className="block text-muted-foreground">{tr("Nächste Kosten")}</span>
                    <span className="font-mono">
                      {cost === null ? tr("Maximiert ✓") : fmtSuffix(cost)}
                    </span>
                  </span>
                  <span>
                    <span className="block text-muted-foreground">{tr("Multiplikator")}</span>
                    <span className="font-mono">
                      {effect === null
                        ? "–"
                        : `${fmtSuffix(effect)}× → ${next === null ? "MAX" : `${fmtSuffix(next)}×`}`}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="preview-count" className="mb-1 block text-xs font-medium">
              {tr("Weitere Level zusammenrechnen")}
            </label>
            <input
              id="preview-count"
              type="number"
              min={1}
              max={10}
              value={state.previewCount}
              onChange={(event) =>
                set("previewCount", Math.min(10, Math.max(1, Number(event.target.value) || 1)))
              }
              className="field w-full px-3 py-2 font-mono outline-none"
            />
          </div>
          <div className="rounded-md border px-4 py-2">
            <span className="block text-xs text-muted-foreground">
              {selected.name} · {previewCount} Lv.
            </span>
            <strong className="font-mono">
              {previewCost === null ? "–" : fmtSuffix(previewCost)} Ashes
            </strong>
          </div>
        </div>

        {!ready ? (
          <Hint>{tr("Produktionsrate und Ziel eintragen, um Käufe zu vergleichen.")}</Hint>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Upgrade</th>
                  <th className="pr-3">{tr("Kosten")}</th>
                  <th className="pr-3">{tr("Zeit bis Kauf")}</th>
                  <th className="pr-3">{tr("Amortisation")}</th>
                  <th className="pr-3">{tr("Gesamtzeit bis Ziel")}</th>
                  <th>{tr("Bewertung")}</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map(({ upgrade, cost, result }) => (
                  <tr key={upgrade.id} className="border-t">
                    <td className="py-3 pr-3 font-medium">{upgrade.name}</td>
                    <td className="pr-3 font-mono">{cost === null ? "MAX" : fmtSuffix(cost)}</td>
                    <td className="pr-3 font-mono">
                      {result ? naturalDuration(result.affordIn) : "–"}
                    </td>
                    <td className="pr-3 font-mono">
                      {result ? naturalDuration(result.payback) : "–"}
                    </td>
                    <td className="pr-3 font-mono">
                      {result ? naturalDuration(result.withPurchase) : "–"}
                    </td>
                    <td>
                      {result?.recommendation === "buy" ? (
                        <span className="text-success">{tr("Für dieses Ziel kaufen")}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {tr("Für dieses Ziel sparen")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bestSingle?.result && (
              <p className="mt-3 border-l-2 border-primary pl-3 text-sm">
                <strong>{tr("Bester einzelner Kauf")}:</strong> {bestSingle.upgrade.name} ·{" "}
                {tr("Zeitersparnis")}: {naturalDuration(Math.max(0, bestSingle.result.saved))}
              </p>
            )}
          </div>
        )}

        {route && (
          <div className="result-panel mt-5 p-4" data-testid="samsara-route">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-semibold">{tr("Beste geprüfte Kaufroute")}</h4>
              <label className="text-xs text-muted-foreground">
                {tr("Max. Käufe")}{" "}
                <input
                  type="number"
                  min={0}
                  max={8}
                  value={state.maxRoutePurchases}
                  onChange={(event) =>
                    set(
                      "maxRoutePurchases",
                      Math.min(8, Math.max(0, Number(event.target.value) || 0)),
                    )
                  }
                  className="field ml-2 w-16 px-2 py-1 font-mono"
                />
              </label>
            </div>
            <p className="mt-2 text-sm">
              {route.purchases.length
                ? route.purchases
                    .map(
                      (purchase) =>
                        `${KARMIC_UPGRADES.find((upgrade) => upgrade.id === purchase.id)?.name} ${purchase.level}`,
                    )
                    .join(" → ")
                : tr("Direkt auf das Ziel sparen")}
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <Stat label={tr("Gesamtzeit")} value={naturalDuration(route.total)} />
              <Stat label={tr("Finale Produktion")} value={`${fmtSuffix(route.finalGain)}/s`} />
              <Stat label={tr("Käufe geprüft")} value={String(route.purchases.length)} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {tr(
                "Soul-Threads-Resets sind nicht Teil der Route, solange ihre Ertragsformel unbekannt ist. Punch-Speed-Produktion bleibt wegen der gerundeten Cooldown-Anzeige eine Näherung.",
              )}
            </p>
          </div>
        )}
      </section>

      <section className="panel p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Karmic Milestones</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {tr(
            "Milestones bleiben nach dem Soul-Threads-Reset erhalten; ein Kauf setzt nichts zurück. Kosten 9–10 sind unbekannt.",
          )}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">#</th>
                <th className="pr-3">{tr("Kosten")}</th>
                <th>{tr("Boni")}</th>
              </tr>
            </thead>
            <tbody>
              {SAMSARA_MILESTONES.map((milestone) => (
                <tr key={milestone.id} className="border-t">
                  <td className="py-3 pr-3 font-mono">{milestone.id}</td>
                  <td className="pr-3 font-mono">
                    {milestone.cost === null ? tr("Unbekannt") : fmtSuffix(milestone.cost)}
                  </td>
                  <td>{milestone.bonuses.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="panel p-4 sm:p-5">
          <h3 className="text-lg font-semibold">Karmic Path</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr(
              "Freischaltung bei Milestone 2 · 10K Ashes pro Roll · Fortschritt bleibt beim Reset erhalten.",
            )}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Path</th>
                  <th className="pr-3">Ashes</th>
                  <th className="pr-3">{tr("Weitere Boni")}</th>
                  <th>{tr("Beobachtete Chance")}</th>
                </tr>
              </thead>
              <tbody>
                {KARMIC_PATHS.map((path) => (
                  <tr key={path.name} className="border-t">
                    <td className="py-3 pr-3">
                      {path.name}
                      {path.maxed && <span className="ml-2 text-xs text-success">MAX</span>}
                    </td>
                    <td className="pr-3 font-mono">
                      {path.ashes === null ? tr("Unbekannt") : `×${path.ashes}`}
                    </td>
                    <td className="pr-3">{path.other.join(" · ") || tr("Unbekannt")}</td>
                    <td className="font-mono text-xs">{path.observedChance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Hint>
            <AlertTriangle className="inline size-4" />{" "}
            {tr(
              "Chancen sind eine Momentaufnahme; Luck-, Bulk-, Speed- und Clone-Formeln sind unbekannt.",
            )}
          </Hint>
          <p className="mt-2 text-xs text-muted-foreground">
            {tr("Roll-Kosten")}: {fmtSuffix(KARMIC_PATH_ROLL_COST)} Ashes
          </p>
        </article>

        <article className="panel p-4 sm:p-5">
          <h3 className="text-lg font-semibold">Soul Threads</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr(
              "Reset ab 500K im Run verdienten Ashes. Die exakte Thread-Ertragsformel ist unbekannt.",
            )}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Upgrade</th>
                  <th className="pr-3">Level</th>
                  <th className="pr-3">{tr("Nächste Kosten")}</th>
                  <th>{tr("Effekt pro Level")}</th>
                </tr>
              </thead>
              <tbody>
                {SOUL_THREAD_UPGRADES.map((upgrade) => (
                  <tr key={upgrade.name} className="border-t">
                    <td className="py-3 pr-3">{upgrade.name}</td>
                    <td className="pr-3 font-mono">
                      {upgrade.level}/{upgrade.maxLevel}
                    </td>
                    <td className="pr-3 font-mono">{fmtSuffix(upgrade.nextCost)}</td>
                    <td>
                      ×{fmtSuffix(upgrade.effectPerLevel)} {upgrade.effect}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
            <p>
              <CheckCircle2 className="mr-1 inline size-4 text-success" />
              {tr("Bleibt erhalten")}: {SOUL_THREAD_RESET.keeps.join(", ")}
            </p>
            <p>
              <AlertTriangle className="mr-1 inline size-4 text-destructive" />
              {tr("Wird zurückgesetzt")}: {SOUL_THREAD_RESET.loses.join(", ")}
            </p>
          </div>
          <details className="mt-4 border-t pt-3">
            <summary className="cursor-pointer text-sm font-medium">Threads Path</summary>
            <p className="mt-2 text-xs text-muted-foreground">
              {fmtSuffix(THREADS_PATH.rollCost)} Threads / Roll · {THREADS_PATH.names.join(" · ")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tr("Freischaltung und Boni sind unbekannt.")}
            </p>
          </details>
        </article>
      </section>
      {storageError && (
        <p role="status" className="text-center text-xs text-destructive">
          {tr(
            "Dein Browser erlaubt das lokale Speichern nicht. Eingaben bleiben nur bis zum Neuladen erhalten.",
          )}
        </p>
      )}
    </main>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  suffix,
}: {
  label: string;
  id: string;
  value: NU;
  onChange: (value: NU) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium">
        {label}
      </label>
      <UnitField
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        suffix={suffix}
        hideLabel
      />
    </div>
  );
}
function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
      {children}
    </p>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong className="font-mono">{value}</strong>
    </div>
  );
}
