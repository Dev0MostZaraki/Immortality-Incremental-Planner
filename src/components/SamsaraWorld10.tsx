import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Flame, Gauge, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { UnitField, val, type NU } from "./planner-fields";
import { useI18n } from "./LanguageProvider";
import { SUFFIXES } from "@/lib/endurance";
import {
  ashesRequiredForSoulThreads,
  ashesPerSecondFromCooldown,
  bestKarmicRoute,
  bestKarmicResetRoute,
  calculateMarkFarmRecommendation,
  calculateMarkOutcome,
  calculateMarkTargetPlan,
  calculateSoulThreadYield,
  compareSamsaraPurchase,
  exactMarkProbability,
  KARMIC_PATHS,
  KARMIC_PATH_ROLL_COST,
  KARMIC_UPGRADES,
  karmicUpgradeCost,
  karmicUpgradeEffect,
  karmicUpgradeTotalCost,
  MARK_FARM_PACES,
  SAMSARA_MILESTONES,
  SOUL_THREAD_BONUSES,
  SOUL_THREAD_RESET,
  SOUL_THREAD_UPGRADES,
  soulThreadUpgradeCost,
  soulThreadUpgradeEffect,
  THREAD_MARKS,
  THREADS_PATH,
  type KarmicUpgradeId,
  type SoulThreadBonusId,
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
  const currentAshes = val(state.currentAshes),
    ashes = currentAshes ?? 0,
    ashesPerAttack = val(state.ashesPerAttack),
    cooldown = Number(state.attackCooldown.trim().replace(",", ".")),
    gain = ashesPerAttack === null ? null : ashesPerSecondFromCooldown(ashesPerAttack, cooldown),
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
  const targetMilestone =
      target === null
        ? undefined
        : SAMSARA_MILESTONES.find(
            (milestone) =>
              milestone.cost !== null &&
              Math.abs(milestone.cost - target) <= Math.max(1, milestone.cost * 1e-9),
          ),
    firstPurchase = route?.purchases[0],
    firstUpgrade = firstPurchase
      ? KARMIC_UPGRADES.find((upgrade) => upgrade.id === firstPurchase.id)
      : undefined,
    remaining = target === null ? null : Math.max(0, target - ashes),
    targetLabel =
      target === null
        ? "–"
        : targetMilestone
          ? `M${targetMilestone.id} · ${fmtSuffix(target)}`
          : fmtSuffix(target),
    recommendationState = !ready
      ? "incomplete"
      : ashes >= target!
        ? "reached"
        : firstPurchase
          ? "buy"
          : "save";
  const markList = state.markBoard === "karmic" ? KARMIC_PATHS : THREAD_MARKS,
    selectedMark = markList[state.markIndex] ?? markList[0]!,
    markRarities = markList.map((mark) => mark.baseRarity),
    markLuck = val(state.markLuck),
    markMps = val(state.markMps),
    markCopy = Number(state.markCopy.trim().replace(",", ".")),
    markProbability =
      markLuck === null ? null : exactMarkProbability(markRarities, state.markIndex, markLuck),
    markOutcome =
      markLuck === null || markMps === null
        ? null
        : calculateMarkOutcome({
            rarities: markRarities,
            markIndex: state.markIndex,
            luck: markLuck,
            marksPerSecond: markMps,
            copy: markCopy,
          }),
    markCurrentCopies = val(state.markCurrentCopies),
    markTargetCopies = val(state.markTargetCopies),
    markMaxCopies =
      state.markBoard === "karmic"
        ? (KARMIC_PATHS[state.markIndex]?.maxCopies ?? null)
        : (THREAD_MARKS[state.markIndex]?.maxCopies ?? null),
    effectiveMarkTargetCopies = markTargetCopies ?? markMaxCopies,
    markTargetPlan =
      markOutcome && effectiveMarkTargetCopies !== null
        ? calculateMarkTargetPlan({
            averageHitSeconds: markOutcome.averageSeconds,
            copy: markCopy,
            currentCopies: markCurrentCopies ?? 0,
            targetCopies: effectiveMarkTargetCopies,
          })
        : null,
    markTargetSeconds = markTargetPlan?.expectedSeconds ?? null,
    usesAutomaticMaxTarget = markTargetCopies === null && markMaxCopies !== null,
    markDuration = (seconds: number) =>
      seconds <= 0
        ? "0 s"
        : seconds < 0.001
          ? "< 1 ms"
          : seconds < 1
            ? `${fmtSuffix(seconds * 1000, 2)} ms`
            : naturalDuration(seconds);
  const markFarmRecommendations =
      markLuck !== null && markMps !== null
        ? MARK_FARM_PACES.map((pace) => ({
            ...pace,
            result: calculateMarkFarmRecommendation({
              rarities: markRarities,
              markIndex: state.markIndex,
              luck: markLuck,
              marksPerSecond: markMps,
              averageHitSeconds: pace.averageHitSeconds,
            }),
          }))
        : [],
    unlockMarkFarm = markFarmRecommendations.find((pace) => pace.id === "unlock")?.result,
    recommendedMarkFarm = markFarmRecommendations.find((pace) => pace.id === "recommended")?.result,
    fastMarkFarm = markFarmRecommendations.find((pace) => pace.id === "fast")?.result,
    selectedSoulThreadBonusIds = SOUL_THREAD_BONUSES.filter(
      (bonus) => state.soulThreadBonuses[bonus.id],
    ).map((bonus) => bonus.id),
    soulThreadRunAshes = val(state.soulThreadRunAshes),
    soulThreadTarget = val(state.soulThreadTarget),
    soulThreadYield =
      soulThreadRunAshes === null
        ? null
        : calculateSoulThreadYield({
            runGeneratedAshes: soulThreadRunAshes,
            moreThreadsLevel: state.soulThreadLevels.moreThreads,
            nextMilestoneId: state.soulThreadNextMilestone,
            bonusIds: selectedSoulThreadBonusIds,
          }),
    soulThreadRequiredAshes =
      soulThreadTarget === null
        ? null
        : ashesRequiredForSoulThreads({
            targetThreads: soulThreadTarget,
            moreThreadsLevel: state.soulThreadLevels.moreThreads,
            nextMilestoneId: state.soulThreadNextMilestone,
            bonusIds: selectedSoulThreadBonusIds,
          }),
    resetPlanReady =
      currentAshes !== null &&
      gain !== null &&
      gain > 0 &&
      soulThreadRunAshes !== null &&
      soulThreadTarget !== null &&
      soulThreadRequiredAshes !== null,
    resetRoute = resetPlanReady
      ? bestKarmicResetRoute({
          currentAshes,
          runGeneratedAshes: soulThreadRunAshes,
          ashesPerSecond: gain,
          targetRunAshes: soulThreadRequiredAshes,
          levels: state.levels,
          maxPurchases: state.maxRoutePurchases,
        })
      : null,
    resetPlanReached =
      soulThreadYield !== null &&
      soulThreadTarget !== null &&
      soulThreadYield.pendingThreads >= soulThreadTarget,
    resetFirstPurchase = resetRoute?.purchases[0],
    resetFirstUpgrade = resetFirstPurchase
      ? KARMIC_UPGRADES.find((upgrade) => upgrade.id === resetFirstPurchase.id)
      : undefined,
    resetLastPurchase = resetRoute?.purchases.at(-1),
    resetFinalFarmAshes =
      resetRoute && soulThreadRequiredAshes !== null && soulThreadRunAshes !== null
        ? Math.max(
            0,
            soulThreadRequiredAshes - (resetLastPurchase?.runAshesAfter ?? soulThreadRunAshes),
          )
        : null;

  return (
    <main className="samsara-theme space-y-6" data-testid="samsara-world10">
      <header className="samsara-hero">
        <div className="relative z-10 flex items-start gap-4">
          <span className="samsara-hero-icon" aria-hidden="true">
            <Flame />
          </span>
          <div>
            <p className="samsara-eyebrow">WORLD 10 · KARMIC ASHES</p>
            <h2 className="samsara-title">Samsara</h2>
            <p className="mt-2 max-w-3xl text-sm text-[#d9b8a6]">
              {tr("Dein World-10-Fahrplan – vom Spielwert zur nächsten Kaufentscheidung.")}
            </p>
            <p className="mt-1 max-w-3xl text-xs text-[#a98f84]">
              {tr(
                "Karmic Ashes, Milestones, Karmic Path und Soul Threads – bestätigte Werte und klar markierte offene Mechaniken.",
              )}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="samsara-reset relative z-10"
          onClick={() => setState(SAMSARA_DEFAULTS)}
        >
          <RotateCcw />
          {tr("Samsara-Eingaben zurücksetzen")}
        </Button>
      </header>

      <section className="samsara-panel p-4 sm:p-6" aria-labelledby="samsara-calculator-title">
        <div className="mb-4">
          <h3 id="samsara-calculator-title" className="text-lg font-semibold">
            {tr("Dein Ashes-Plan")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr(
              "Kostenmodelle sind mathematisch stark gegen Screenshots validiert, aber nicht aus dem Spielcode bestätigt.",
            )}
          </p>
        </div>
        <StepHeader
          number="1"
          title={tr("Spielwerte eintragen")}
          description={tr("Diese drei Werte werden dir direkt im Spiel angezeigt.")}
        />
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Field
            label={tr("Aktuelle Karmic Ashes")}
            id="samsara-current"
            value={state.currentAshes}
            onChange={(value) => set("currentAshes", value)}
          />
          <Field
            label={tr("Ashes pro Angriff")}
            id="samsara-ashes-per-attack"
            value={state.ashesPerAttack}
            onChange={(value) => set("ashesPerAttack", value)}
          />
          <div>
            <label htmlFor="samsara-cooldown" className="mb-1 block text-xs font-medium">
              {tr("Cooldown (Sekunden)")}
            </label>
            <div className="field flex items-stretch overflow-hidden">
              <input
                id="samsara-cooldown"
                inputMode="decimal"
                autoComplete="off"
                value={state.attackCooldown}
                onChange={(event) => set("attackCooldown", event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-base outline-none"
              />
              <span className="flex items-center bg-secondary px-3 text-xs text-muted-foreground">
                s
              </span>
            </div>
          </div>
        </div>
        <div className="samsara-rate-card mt-3">
          <Gauge className="size-5" aria-hidden="true" />
          <div>
            <span className="block text-xs text-[#baa094]">{tr("Berechnete Produktion")}</span>
            <strong className="font-mono text-lg text-[#f7e7dc]" data-testid="samsara-rate">
              {gain === null ? "–" : `${fmtSuffix(gain)}/s`}
            </strong>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr(
              "Die Rate wird automatisch aus Ashes pro Angriff ÷ Cooldown berechnet. Da der Cooldown im Spiel gerundet angezeigt wird, ist das Ergebnis eine Näherung.",
            )}
          </p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {tr(
            "Die angezeigten Ashes pro Angriff enthalten bereits freigeschaltete Milestone- und Path-Boni; sie werden nicht erneut multipliziert.",
          )}
        </p>

        <StepHeader
          number="2"
          title={tr("Ziel auswählen")}
          description={tr("Wähle einen Milestone oder gib ein eigenes Ashes-Ziel ein.")}
        />
        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-end">
          <div className="flex flex-wrap gap-2" aria-label={tr("Bekannte Milestone-Ziele")}>
            {SAMSARA_MILESTONES.filter((milestone) => milestone.cost !== null).map((milestone) => (
              <button
                key={milestone.id}
                type="button"
                aria-pressed={targetMilestone?.id === milestone.id}
                className="samsara-target-chip"
                onClick={() => set("targetAshes", asNU(milestone.cost!))}
              >
                <span>M{milestone.id}</span>
                <strong>{fmtSuffix(milestone.cost!)}</strong>
              </button>
            ))}
          </div>
          <Field
            label={tr("Eigenes Ziel")}
            id="samsara-target"
            value={state.targetAshes}
            onChange={(value) => set("targetAshes", value)}
          />
        </div>

        <StepHeader
          number="3"
          title={tr("Aktuelle Upgrade-Level")}
          description={tr("Trage die drei Level aus dem Karmic-Ashes-Shop ein.")}
        />
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {KARMIC_UPGRADES.map((upgrade) => {
            const level = state.levels[upgrade.id],
              cost = karmicUpgradeCost(upgrade.id, level),
              effect = karmicUpgradeEffect(upgrade.id, level),
              next = karmicUpgradeEffect(upgrade.id, Math.min(upgrade.maxLevel, level + 1));
            return (
              <div
                key={upgrade.id}
                className={`samsara-upgrade-card ${cost === null ? "is-maxed" : ""}`}
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
              </div>
            );
          })}
        </div>

        <section
          className="samsara-recommendation mt-5"
          data-state={recommendationState}
          data-testid="samsara-recommendation"
        >
          <div className="samsara-recommendation-label">
            <Flame className="size-4" />
            {tr("Nächster bester Schritt")}
          </div>
          {recommendationState === "incomplete" && (
            <>
              <h4>{tr("Eingaben vervollständigen")}</h4>
              <p>
                {tr(
                  "Trage aktuelle Ashes, Ashes pro Angriff, Cooldown, Upgrade-Level und ein Ziel ein.",
                )}
              </p>
            </>
          )}
          {recommendationState === "reached" && (
            <>
              <h4>{tr("Ziel erreicht")}</h4>
              <p>{tr("Du hast bereits genug Karmic Ashes für dieses Ziel.")}</p>
            </>
          )}
          {recommendationState === "save" && route && (
            <>
              <h4>
                {targetMilestone
                  ? tr("Direkt für Milestone {p0} sparen", { p0: targetMilestone.id })
                  : tr("Direkt für dein Ziel sparen")}
              </h4>
              <p>{tr("Kein Upgrade spart auf dem Weg zu diesem Ziel Zeit.")}</p>
            </>
          )}
          {recommendationState === "buy" && firstPurchase && firstUpgrade && (
            <>
              <h4 className="flex flex-wrap items-center gap-2">
                {tr("Kaufen, sobald verfügbar")}
                <ArrowRight className="size-5" aria-hidden="true" />
                <span className="text-[#ffbe75]">
                  {firstUpgrade.name} · Level {firstPurchase.level}
                </span>
              </h4>
              <p>
                {tr(
                  "Der Kauf ist in {p0} verfügbar. Die Gesamtzeit bezieht sich auf das Endziel {p1}, nicht auf den Kaufpreis.",
                  {
                    p0: naturalDuration(firstPurchase.wait),
                    p1: targetLabel,
                  },
                )}
              </p>
            </>
          )}
          {ready && route && (
            <div className="samsara-recommendation-stats">
              <Stat label={tr("Aktuelle Ashes")} value={fmtSuffix(ashes)} />
              {recommendationState === "buy" && firstPurchase ? (
                <>
                  <Stat label={tr("Kaufpreis")} value={fmtSuffix(firstPurchase.cost)} />
                  <Stat
                    label={tr("Kauf verfügbar in")}
                    value={naturalDuration(firstPurchase.wait)}
                    testId="samsara-next-purchase-time"
                  />
                  <Stat
                    label={tr("Produktion nach Kauf")}
                    value={`${fmtSuffix(firstPurchase.gainAfter)}/s`}
                  />
                </>
              ) : (
                <>
                  <Stat label={tr("Noch benötigt")} value={fmtSuffix(remaining ?? 0)} />
                  <Stat label={tr("Produktion")} value={`${fmtSuffix(gain)}/s`} />
                </>
              )}
              <Stat label={tr("Gewähltes Endziel")} value={targetLabel} />
              <Stat
                label={tr("Gesamtzeit bis zum Endziel")}
                value={naturalDuration(route.total)}
                testId="samsara-total-target-time"
              />
            </div>
          )}
        </section>

        <details className="samsara-details mt-5">
          <summary>
            <span>
              <strong>{tr("Warum ist das der beste Schritt?")}</strong>
              <small>{tr("Kaufvergleich, Mehrfachkosten und geprüfte Route anzeigen")}</small>
            </span>
          </summary>
          <div className="border-t border-[#58372d] p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_auto] md:items-end">
              <div>
                <label htmlFor="preview-upgrade" className="mb-1 block text-xs font-medium">
                  {tr("Upgrade für Mehrfachkosten")}
                </label>
                <select
                  id="preview-upgrade"
                  value={state.selected}
                  onChange={(event) => set("selected", event.target.value as KarmicUpgradeId)}
                  className="field w-full px-3 py-2.5 font-mono outline-none"
                >
                  {KARMIC_UPGRADES.map((upgrade) => (
                    <option key={upgrade.id} value={upgrade.id}>
                      {upgrade.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="preview-count" className="mb-1 block text-xs font-medium">
                  {tr("Weitere Level")}
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
              <div className="rounded-md border border-[#58372d] bg-black/20 px-4 py-2">
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
                        <td className="pr-3 font-mono">
                          {cost === null ? "MAX" : fmtSuffix(cost)}
                        </td>
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
                    "Soul-Threads-Resets bleiben getrennt von dieser Ashes-Route, weil sie den laufenden Run und die Karmic-Upgrades zurücksetzen. Punch-Speed-Produktion bleibt wegen der gerundeten Cooldown-Anzeige eine Näherung.",
                  )}
                </p>
              </div>
            )}
          </div>
        </details>
      </section>

      <section className="samsara-panel p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Karmic Milestones</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {tr(
            "Milestones bleiben nach dem Soul-Threads-Reset erhalten; ein Kauf setzt nichts zurück. Kosten und Boni M2–M17 sind belegt; M17 ist der finale Milestone (MAX). Für M1 ist kein separater Kaufwert belegt.",
          )}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {tr(
            "Auf dem Spielbrett stehen die bereits aktiven Boni. Der Button darunter zeigt den Kaufpreis des nächsten Milestones.",
          )}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">#</th>
                <th className="pr-3">{tr("Kaufpreis")}</th>
                <th>{tr("Bonus nach dem Kauf")}</th>
              </tr>
            </thead>
            <tbody>
              {SAMSARA_MILESTONES.map((milestone) => (
                <tr key={milestone.id} className="border-t">
                  <td className="py-3 pr-3 font-mono">{milestone.id}</td>
                  <td className="pr-3 font-mono">
                    {milestone.cost === null ? tr("Unbekannt") : fmtSuffix(milestone.cost)}
                  </td>
                  <td>
                    {milestone.bonuses.length > 0 ? milestone.bonuses.join(" · ") : tr("Unbekannt")}
                    {milestone.final && (
                      <span className="ml-2 inline-flex rounded-full border border-emerald-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300">
                        {tr("Final · MAX")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="samsara-panel p-4 sm:p-6" aria-labelledby="mark-calculator-title">
        <div>
          <p className="samsara-eyebrow">WORLD 10 · MARKS</p>
          <h3 id="mark-calculator-title" className="text-xl font-semibold">
            {tr("Mark Calculator")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr(
              "Verwendet direkt die im Board angezeigten Werte für Luck, MPS und Copy. Niedrigere Marks können durch höhere garantierte Stufen IMPOSSIBLE werden.",
            )}
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="mark-board" className="mb-1 block text-xs font-medium">
              {tr("Board")}
            </label>
            <select
              id="mark-board"
              value={state.markBoard}
              onChange={(event) =>
                set("markBoard", event.target.value === "threads" ? "threads" : "karmic")
              }
              className="field w-full px-3 py-2.5 outline-none"
            >
              <option value="karmic">Karmic Path</option>
              <option value="threads">Threads Path</option>
            </select>
          </div>
          <div>
            <label htmlFor="mark-selection" className="mb-1 block text-xs font-medium">
              Mark
            </label>
            <select
              id="mark-selection"
              value={state.markIndex}
              onChange={(event) => set("markIndex", Number(event.target.value))}
              className="field w-full px-3 py-2.5 outline-none"
            >
              {markList.map((mark, index) => (
                <option key={mark.name} value={index}>
                  {mark.name} · {mark.baseMps}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Field
            label={tr("Angezeigte Luck")}
            id="mark-luck"
            value={state.markLuck}
            onChange={(value) => set("markLuck", value)}
          />
          <Field
            label={tr("Angezeigte MPS")}
            id="mark-mps"
            value={state.markMps}
            onChange={(value) => set("markMps", value)}
            suffix="/s"
          />
          <div>
            <label htmlFor="mark-copy" className="mb-1 block text-xs font-medium">
              Copy / Clone
            </label>
            <input
              id="mark-copy"
              inputMode="numeric"
              value={state.markCopy}
              onChange={(event) => set("markCopy", event.target.value)}
              className="field w-full px-3 py-2.5 font-mono outline-none"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field
            label={tr("Aktuelle Copies (optional)")}
            id="mark-current-copies"
            value={state.markCurrentCopies}
            onChange={(value) => set("markCurrentCopies", value)}
          />
          <Field
            label={
              markMaxCopies === null
                ? tr("Copy-Ziel (optional)")
                : tr("Copy-Ziel (optional · MAX {p0})", { p0: String(markMaxCopies) })
            }
            id="mark-target-copies"
            value={state.markTargetCopies}
            onChange={(value) => set("markTargetCopies", value)}
          />
        </div>

        <div className="result-panel mt-5 p-4" data-testid="mark-result">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="block text-xs text-muted-foreground">{tr("Ausgewählte Mark")}</span>
              <strong className="text-lg">{selectedMark.name}</strong>
            </div>
            <div className="text-right">
              <span className="block text-xs text-muted-foreground">{tr("Exakte Chance")}</span>
              <strong className="font-mono text-lg" data-testid="mark-chance">
                {markProbability === null
                  ? "–"
                  : markProbability <= 0
                    ? "IMPOSSIBLE"
                    : `1 / ${fmtSuffix(1 / markProbability, 2)}`}
              </strong>
            </div>
          </div>

          {markOutcome ? (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Stat
                  label={tr("Treffer pro Sekunde")}
                  value={fmtSuffix(markOutcome.hitsPerSecond, 2)}
                />
                <Stat
                  label={tr("Copies pro Sekunde")}
                  value={fmtSuffix(markOutcome.copiesPerSecond, 2)}
                />
                <Stat
                  label={tr("Ø erster Treffer")}
                  value={markDuration(markOutcome.averageSeconds)}
                />
                <Stat
                  label={tr("Treffer bis Ziel")}
                  value={markTargetPlan === null ? "–" : String(markTargetPlan.hitsNeeded)}
                />
                <Stat
                  label={usesAutomaticMaxTarget ? tr("Ø Zeit bis MAX") : tr("Ø Zeit bis Copy-Ziel")}
                  value={markTargetSeconds === null ? "–" : markDuration(markTargetSeconds)}
                />
              </div>
              {markTargetPlan && (
                <p className="mark-target-summary" data-testid="mark-target-plan">
                  {usesAutomaticMaxTarget
                    ? tr(
                        "MAX-Ziel automatisch erkannt: Von {p0} auf {p1} Copies fehlen {p2}. Mit {p3} Clone sind dafür {p4} erfolgreiche Treffer nötig.",
                        {
                          p0: fmtSuffix(markTargetPlan.currentCopies),
                          p1: fmtSuffix(markTargetPlan.targetCopies),
                          p2: fmtSuffix(markTargetPlan.remainingCopies),
                          p3: fmtSuffix(markTargetPlan.copiesPerHit),
                          p4: String(markTargetPlan.hitsNeeded),
                        },
                      )
                    : tr(
                        "Von {p0} auf {p1} Copies: {p2} erfolgreiche Treffer mit jeweils {p3} Clone.",
                        {
                          p0: fmtSuffix(markTargetPlan.currentCopies),
                          p1: fmtSuffix(markTargetPlan.targetCopies),
                          p2: String(markTargetPlan.hitsNeeded),
                          p3: fmtSuffix(markTargetPlan.copiesPerHit),
                        },
                      )}
                </p>
              )}
              <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
                <Stat label="50 %" value={markDuration(markOutcome.chance50Seconds)} />
                <Stat label="90 %" value={markDuration(markOutcome.chance90Seconds)} />
                <Stat label="95 %" value={markDuration(markOutcome.chance95Seconds)} />
              </div>
            </>
          ) : markProbability !== null && markProbability <= 0 ? (
            <Hint>
              <AlertTriangle className="inline size-4" />{" "}
              {tr(
                "Diese Mark kann bei der eingetragenen Luck nicht rollen, weil die nächsthöhere Stufe bereits garantiert ist.",
              )}
            </Hint>
          ) : (
            <Hint>{tr("Luck und MPS aus der rechten Board-Anzeige eintragen.")}</Hint>
          )}
        </div>

        {recommendedMarkFarm && (
          <div className="mark-farm-advisor mt-4" data-testid="mark-farm-advisor">
            <div className="samsara-recommendation-label">
              <Gauge className="size-4" /> {tr("Farm-Empfehlung")}
            </div>
            <h4>
              {fastMarkFarm?.currentMeetsGoal
                ? tr("{p0} ist bereits schnell farmbar", { p0: selectedMark.name })
                : recommendedMarkFarm.currentMeetsGoal
                  ? tr("{p0} ist bereits gut farmbar", { p0: selectedMark.name })
                  : unlockMarkFarm?.currentMeetsGoal
                    ? tr("{p0} ist farmbar, aber noch langsam", { p0: selectedMark.name })
                    : recommendedMarkFarm.recommendedMps !== null &&
                        recommendedMarkFarm.recommendedLuck !== null
                      ? tr("Ziele auf etwa {p0} MPS oder {p1} Luck", {
                          p0: fmtSuffix(recommendedMarkFarm.recommendedMps, 2),
                          p1: fmtSuffix(recommendedMarkFarm.recommendedLuck, 2),
                        })
                      : recommendedMarkFarm.recommendedLuck !== null
                        ? tr("Passe deine Luck auf etwa {p0} an", {
                            p0: fmtSuffix(recommendedMarkFarm.recommendedLuck, 2),
                          })
                        : tr("Für dieses Tempo brauchst du mehr MPS und passende Luck")}
            </h4>
            <p>
              {markOutcome
                ? tr("Deine Kombination ergibt durchschnittlich einen Treffer alle {p0}.", {
                    p0: markDuration(markOutcome.averageSeconds),
                  })
                : tr(
                    "Unsere empfohlene Farmstufe zielt auf durchschnittlich einen erfolgreichen Treffer alle 90 Sekunden.",
                  )}
            </p>
            {markTargetPlan && (
              <p className="mark-farm-plan">
                {tr("Mit {p0} Clone: Ø {p1} bis {p2} Copies ({p3} Treffer).", {
                  p0: fmtSuffix(markTargetPlan.copiesPerHit),
                  p1: markDuration(markTargetPlan.expectedSeconds),
                  p2: fmtSuffix(markTargetPlan.targetCopies),
                  p3: String(markTargetPlan.hitsNeeded),
                })}
              </p>
            )}

            <div className="mark-farm-tier-grid">
              {markFarmRecommendations.map((pace) => {
                const result = pace.result;
                if (!result) return null;
                const label =
                  pace.id === "unlock"
                    ? tr("Nur bekommen")
                    : pace.id === "recommended"
                      ? tr("Gut farmbar")
                      : tr("Schnell farmen");
                return (
                  <article
                    key={pace.id}
                    className={`mark-farm-tier ${pace.id === "recommended" ? "is-recommended" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>{label}</strong>
                      {pace.id === "recommended" && (
                        <span className="mark-farm-badge">{tr("Empfohlen")}</span>
                      )}
                    </div>
                    <p>
                      {tr("Ø ein Treffer alle {p0}", {
                        p0: markDuration(pace.averageHitSeconds),
                      })}
                    </p>
                    <dl>
                      <div>
                        <dt>{tr("MPS bei deiner Luck")}</dt>
                        <dd>
                          {result.recommendedMps === null
                            ? tr("Luck zuerst anpassen")
                            : `${fmtSuffix(result.recommendedMps, 2)} MPS`}
                        </dd>
                      </div>
                      <div>
                        <dt>{tr("Luck bei deiner MPS")}</dt>
                        <dd>
                          {result.recommendedLuck === null
                            ? tr("Mit Luck allein nicht erreichbar")
                            : fmtSuffix(result.recommendedLuck, 2)}
                        </dd>
                      </div>
                    </dl>
                    <span className={`mark-farm-status ${result.currentMeetsGoal ? "is-met" : ""}`}>
                      {result.currentMeetsGoal
                        ? `✓ ${tr("Mit deinen Werten erreicht")}`
                        : tr("Noch nicht erreicht")}
                    </span>
                  </article>
                );
              })}
            </div>

            <p className="mark-farm-note">
              {tr(
                "MPS und Luck wirken gemeinsam. MPS ist der rote Gesamtwert auf dem Board und enthält Speed × Bulk bereits. Copy/Clone erhöht die erhaltenen Copies pro Treffer, nicht die Trefferchance. Die Zeiten sind RNG-Durchschnittswerte und keine Drop-Garantie.",
              )}
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-5">
        <article className="samsara-panel p-4 sm:p-5">
          <h3 className="text-lg font-semibold">Karmic Path</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr(
              "Freischaltung bei Milestone 3 · 10K Ashes pro Roll · Fortschritt bleibt beim Reset erhalten.",
            )}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Path</th>
                  <th className="pr-3">Ashes</th>
                  <th className="pr-3">{tr("Weitere Boni")}</th>
                  <th>Base MPS</th>
                  <th className="pl-3">MAX Copies</th>
                </tr>
              </thead>
              <tbody>
                {KARMIC_PATHS.map((path) => (
                  <tr key={path.name} className="border-t">
                    <td className="py-3 pr-3">{path.name}</td>
                    <td className="pr-3 font-mono">
                      {path.ashes === null ? tr("Unbekannt") : `×${path.ashes}`}
                    </td>
                    <td className="pr-3">
                      {path.other.join(" · ") || tr("Unbekannt")}
                      {path.observedBonuses && (
                        <small className="mt-1 block text-muted-foreground">
                          {tr("Bei {p0} Copies beobachtet", {
                            p0: String(path.observedAtCopies),
                          })}
                          : {path.observedBonuses.join(" · ")}
                        </small>
                      )}
                    </td>
                    <td className="font-mono text-xs">
                      {path.baseMps === null ? tr("Unbekannt") : path.baseMps}
                    </td>
                    <td className="pl-3 font-mono text-xs">
                      {path.maxCopies === null ? tr("Unbekannt") : path.maxCopies}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Hint>
            <AlertTriangle className="inline size-4" />{" "}
            {tr(
              "Persönliche Copies und effektive Chancen werden nicht angezeigt. Base MPS ist der feste Wert aus der Kartenanzeige; fehlende Werte bleiben unbekannt.",
            )}
          </Hint>
          <p className="mt-2 text-xs text-muted-foreground">
            {tr("Roll-Kosten")}: {fmtSuffix(KARMIC_PATH_ROLL_COST)} Ashes
          </p>
        </article>

        <article className="samsara-panel p-4 sm:p-5">
          <p className="samsara-eyebrow">WORLD 10 · RESET</p>
          <h3 className="text-xl font-semibold">{tr("Soul Threads Rechner")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr(
              "Berechnet den Reset-Ertrag aus allen im aktuellen Run erzeugten Ashes. Ausgegebene Ashes bleiben im Run-Zähler enthalten.",
            )}
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <Field
              label={tr("Im Run erzeugte Ashes")}
              id="soul-thread-run-ashes"
              value={state.soulThreadRunAshes}
              onChange={(value) => set("soulThreadRunAshes", value)}
            />
            <div>
              <label
                htmlFor="soul-thread-next-milestone"
                className="mb-1 block text-xs font-medium"
              >
                {tr("Nächster Milestone auf dem Board")}
              </label>
              <select
                id="soul-thread-next-milestone"
                value={state.soulThreadNextMilestone}
                onChange={(event) => set("soulThreadNextMilestone", Number(event.target.value))}
                className="field w-full px-3 py-2.5 outline-none"
              >
                {SAMSARA_MILESTONES.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    M{milestone.id} ·{" "}
                    {milestone.cost === null ? tr("Unbekannt") : fmtSuffix(milestone.cost)}
                  </option>
                ))}
                <option value={18}>{tr("Nach M17")}</option>
              </select>
            </div>
            <Field
              label={tr("Dein Thread-Ziel")}
              id="soul-thread-target"
              value={state.soulThreadTarget}
              onChange={(value) => set("soulThreadTarget", value)}
            />
          </div>

          <div className="mt-4 rounded-lg border bg-background/35 p-3">
            <span className="text-xs font-medium">{tr("Aktive permanente Thread-Boni")}</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SOUL_THREAD_BONUSES.map((bonus) => (
                <label key={bonus.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.soulThreadBonuses[bonus.id]}
                    onChange={(event) =>
                      set("soulThreadBonuses", {
                        ...state.soulThreadBonuses,
                        [bonus.id]: event.target.checked,
                      })
                    }
                    className="size-4 accent-[#d45b35]"
                  />
                  <span>
                    {bonus.name}{" "}
                    <span className="font-mono text-muted-foreground">×{bonus.multiplier}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <section
            className="samsara-recommendation mt-4"
            data-state={!resetPlanReady ? "incomplete" : resetPlanReached ? "reached" : "route"}
            data-testid="soul-thread-advisor"
          >
            <div className="samsara-recommendation-label">
              <Flame className="size-4" />
              {tr("Dein persönlicher Reset-Plan")}
            </div>

            {!resetPlanReady && (
              <>
                <h4>{tr("Sag der Seite, was du erreichen möchtest")}</h4>
                <p>
                  {tr(
                    "Trage oben deine Run-Ashes und dein Thread-Ziel ein. Aktueller Ashes-Bestand, Produktion und Karmic-Upgrade-Level kommen aus deinem Ashes-Plan.",
                  )}
                </p>
              </>
            )}

            {resetPlanReady && resetPlanReached && soulThreadYield && (
              <>
                <h4 className="flex flex-wrap items-center gap-2">
                  {tr("Jetzt resetten")}
                  <ArrowRight className="size-5" aria-hidden="true" />
                  <span className="text-success">
                    {fmtSuffix(soulThreadYield.pendingThreads, 2)} Threads
                  </span>
                </h4>
                <p>{tr("Dein gewähltes Thread-Ziel ist bereits erreicht.")}</p>
              </>
            )}

            {resetPlanReady && !resetPlanReached && resetFirstPurchase && resetFirstUpgrade && (
              <>
                <h4>
                  {resetFirstPurchase.farmAshes > 0
                    ? tr("Farme noch {p0}, dann kaufe {p1} Level {p2}", {
                        p0: `${fmtSuffix(resetFirstPurchase.farmAshes, 2)} Ashes`,
                        p1: resetFirstUpgrade.name,
                        p2: resetFirstPurchase.level,
                      })
                    : tr("Kaufe jetzt {p0} Level {p1}", {
                        p0: resetFirstUpgrade.name,
                        p1: resetFirstPurchase.level,
                      })}
                </h4>
                <p>
                  {tr(
                    "Diese geprüfte Kaufroute erreicht dein Thread-Ziel schneller als direkt bis zum Reset zu farmen.",
                  )}
                </p>
              </>
            )}

            {resetPlanReady && !resetPlanReached && !resetFirstPurchase && (
              <>
                <h4>
                  {tr("Farme noch {p0} Run-Ashes, dann resetten", {
                    p0: fmtSuffix(
                      Math.max(0, (soulThreadRequiredAshes ?? 0) - (soulThreadRunAshes ?? 0)),
                      2,
                    ),
                  })}
                </h4>
                <p>{tr("Kein Karmic-Ashes-Upgrade verkürzt den Weg zu diesem Reset-Ziel.")}</p>
              </>
            )}

            {resetPlanReady && resetRoute && soulThreadTarget !== null && (
              <>
                <div className="samsara-recommendation-stats">
                  <Stat
                    label={tr("Reset-Ertrag jetzt")}
                    value={
                      soulThreadYield?.eligible
                        ? `${fmtSuffix(soulThreadYield.pendingThreads, 2)} Threads`
                        : tr("Noch nicht resetbereit")
                    }
                  />
                  <Stat
                    label={tr("Thread-Ziel")}
                    value={`${fmtSuffix(soulThreadTarget, 2)} Threads`}
                  />
                  <Stat
                    label={tr("Benötigte Run-Ashes")}
                    value={fmtSuffix(soulThreadRequiredAshes ?? 0, 2)}
                  />
                  <Stat label={tr("Zeit bis Reset")} value={naturalDuration(resetRoute.total)} />
                </div>

                {!resetPlanReached && (
                  <ol className="samsara-route-steps" aria-label={tr("Empfohlene Schritte")}>
                    {resetRoute.purchases.map((purchase, index) => {
                      const upgrade = KARMIC_UPGRADES.find((entry) => entry.id === purchase.id);
                      return (
                        <li key={`${purchase.id}-${purchase.level}-${index}`}>
                          <span>{index + 1}</span>
                          <div>
                            <strong>
                              {purchase.farmAshes > 0
                                ? tr("{p0} Ashes farmen", {
                                    p0: fmtSuffix(purchase.farmAshes, 2),
                                  })
                                : tr("Jetzt kaufen")}
                            </strong>
                            <small>
                              {upgrade?.name} · Level {purchase.level}
                              {purchase.wait > 0 ? ` · ${naturalDuration(purchase.wait)}` : ""}
                            </small>
                          </div>
                        </li>
                      );
                    })}
                    <li>
                      <span>{resetRoute.purchases.length + 1}</span>
                      <div>
                        <strong>
                          {resetFinalFarmAshes && resetFinalFarmAshes > 0
                            ? tr("Noch {p0} Run-Ashes erzeugen", {
                                p0: fmtSuffix(resetFinalFarmAshes, 2),
                              })
                            : tr("Thread-Ziel ist bereit")}
                        </strong>
                        <small>
                          {tr("Dann resetten für ungefähr {p0} Threads", {
                            p0: fmtSuffix(soulThreadTarget, 2),
                          })}
                        </small>
                      </div>
                    </li>
                  </ol>
                )}
              </>
            )}
          </section>

          <details className="samsara-details mt-4">
            <summary>
              <span>
                <strong>{tr("Rechnung und Formel anzeigen")}</strong>
                <small>{tr("Reset-Ertrag, Multiplikatoren und Ziel-Rückrechnung")}</small>
              </span>
            </summary>
            <div className="border-t border-[#58372d] p-4 sm:p-5">
              <div className="result-panel p-4" data-testid="soul-thread-result">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="block text-xs text-muted-foreground">
                      {tr("Erwarteter Reset-Ertrag")}
                    </span>
                    <strong className="font-mono text-xl" data-testid="soul-thread-yield">
                      {soulThreadYield === null
                        ? "–"
                        : soulThreadYield.eligible
                          ? `${fmtSuffix(soulThreadYield.pendingThreads, 2)} Threads`
                          : tr("Noch nicht resetbereit")}
                    </strong>
                  </div>
                  <span
                    className={soulThreadYield?.eligible ? "text-success" : "text-muted-foreground"}
                  >
                    {soulThreadYield?.eligible
                      ? tr("500K-Anforderung erfüllt ✓")
                      : tr("Mindestens 500K erzeugte Ashes")}
                  </span>
                </div>
                {soulThreadYield && (
                  <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <Stat
                      label={tr("Basis aus Ashes")}
                      value={fmtSuffix(soulThreadYield.baseThreads, 2)}
                    />
                    <Stat
                      label="More Threads"
                      value={`×${fmtSuffix(soulThreadYield.moreThreadsMultiplier, 2)}`}
                    />
                    <Stat
                      label={tr("Milestone-Boni")}
                      value={`×${fmtSuffix(soulThreadYield.milestoneMultiplier, 2)}`}
                    />
                    <Stat
                      label={tr("Permanente Boni")}
                      value={`×${fmtSuffix(soulThreadYield.permanentMultiplier, 2)}`}
                    />
                  </div>
                )}
                {soulThreadRequiredAshes !== null && (
                  <p className="mt-4 border-t pt-4 text-sm">
                    {tr("Für dein Thread-Ziel benötigte Run-Ashes")}:{" "}
                    <strong className="font-mono" data-testid="soul-thread-required-ashes">
                      {fmtSuffix(soulThreadRequiredAshes, 2)} Ashes
                    </strong>
                  </p>
                )}
              </div>
              <Hint>
                <CheckCircle2 className="inline size-4 text-success" />{" "}
                {tr(
                  "Video-bestätigt: √(erzeugte Ashes ÷ 500K) × More Threads × aktive Thread-Boni. Die interne Rundung des Spiels bleibt unbekannt.",
                )}
              </Hint>
              <p className="mt-3 text-xs text-muted-foreground">
                {tr(
                  "Wichtig: Nicht den aktuellen Restbestand eintragen, sondern alle in diesem Run erzeugten Ashes. Der im Spiel angezeigte Converter-Wert bleibt die exakte Kontrolle.",
                )}
              </p>
            </div>
          </details>

          <h4 className="mt-6 text-lg font-semibold">Soul Threads Upgrades</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr(
              "Trage deine Level aus dem Spiel ein. More Threads fließt direkt in den Rechner ein; Effekte und nächste Kosten stammen aus dem Screenshot-Modell.",
            )}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SOUL_THREAD_UPGRADES.map((upgrade) => {
              const level = state.soulThreadLevels[upgrade.id],
                currentEffect = soulThreadUpgradeEffect(upgrade.id, level),
                nextEffect = soulThreadUpgradeEffect(
                  upgrade.id,
                  Math.min(upgrade.maxLevel, level + 1),
                ),
                nextCost = soulThreadUpgradeCost(upgrade.id, level),
                maxed = level === upgrade.maxLevel;
              return (
                <div key={upgrade.id} className={`samsara-upgrade-card ${maxed ? "is-maxed" : ""}`}>
                  <span className="flex items-center justify-between gap-2">
                    <strong>{upgrade.name}</strong>
                    <span className="text-xs text-muted-foreground">
                      {level}/{upgrade.maxLevel}
                    </span>
                  </span>
                  <label
                    htmlFor={`soul-thread-${upgrade.id}`}
                    className="mt-3 block text-xs text-muted-foreground"
                  >
                    {tr("Dein Level")}
                  </label>
                  <input
                    id={`soul-thread-${upgrade.id}`}
                    aria-label={`Soul Threads ${upgrade.name} ${tr("Aktuelles Level")}`}
                    type="number"
                    min={0}
                    max={upgrade.maxLevel}
                    value={level}
                    onChange={(event) =>
                      set("soulThreadLevels", {
                        ...state.soulThreadLevels,
                        [upgrade.id]: Math.min(
                          upgrade.maxLevel,
                          Math.max(0, Number(event.target.value) || 0),
                        ),
                      })
                    }
                    className="field mt-1 w-full px-3 py-2 font-mono outline-none"
                  />
                  <span className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <span>
                      <span className="block text-muted-foreground">{tr("Aktueller Effekt")}</span>
                      <strong className="font-mono">
                        ×{fmtSuffix(currentEffect ?? 1, 2)} {upgrade.effect}
                      </strong>
                    </span>
                    <span>
                      <span className="block text-muted-foreground">{tr("Nächster Effekt")}</span>
                      <strong className="font-mono">
                        {maxed ? "MAX" : `×${fmtSuffix(nextEffect ?? 1, 2)}`}
                      </strong>
                    </span>
                    <span>
                      <span className="block text-muted-foreground">{tr("Nächste Kosten")}</span>
                      <strong className="font-mono">
                        {maxed
                          ? "MAX"
                          : nextCost === null
                            ? tr("Unbekannt")
                            : `${fmtSuffix(nextCost, 2)} Th.`}
                      </strong>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <Hint>
            <CheckCircle2 className="inline size-4 text-success" />{" "}
            {tr(
              "Die Level sind persönliche, lokal gespeicherte Eingaben. Das Kostenmodell reproduziert alle bekannten Screenshot-Werte innerhalb der Anzeigerundung.",
            )}
          </Hint>
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
        </article>
      </section>

      <section className="samsara-panel p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Thread Mark</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {tr(
            "Gezeigt werden die festen Base-MPS-Werte, MAX-Boni und belegte MAX-Schwellen. Persönliche Bestände und effektive Chancen bleiben Eingaben im Rechner; die Freischaltung ist noch unbekannt.",
          )}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          {tr("Roll-Kosten")}:{" "}
          <strong className="font-mono">{fmtSuffix(THREADS_PATH.rollCost)} Threads</strong> {"·"}{" "}
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href="https://astral3nt.github.io/Immortality-Incremental-Hub/mark_calc.html"
            target="_blank"
            rel="noreferrer"
          >
            Mark Calculator
          </a>
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[50rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Mark</th>
                <th className="pr-3">Base MPS</th>
                <th className="pr-3">{tr("Boni bei MAX")}</th>
                <th>MAX Copies</th>
              </tr>
            </thead>
            <tbody>
              {THREAD_MARKS.map((mark) => (
                <tr key={mark.name} className="border-t align-top">
                  <td className="py-3 pr-3 font-medium">{mark.name}</td>
                  <td className="pr-3 font-mono text-xs">{mark.baseMps}</td>
                  <td className="pr-3">
                    {mark.bonuses.join(" · ")}
                    {mark.observedBonuses && (
                      <small className="mt-1 block text-muted-foreground">
                        {tr("Bei {p0} Copies beobachtet", {
                          p0: String(mark.observedAtCopies),
                        })}
                        : {mark.observedBonuses.join(" · ")}
                      </small>
                    )}
                  </td>
                  <td className="font-mono text-xs">
                    {mark.maxCopies === null ? tr("Unbekannt") : mark.maxCopies}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
function StepHeader({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="samsara-step-header mt-6 first:mt-0">
      <span>{number}</span>
      <div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
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
function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong className="font-mono" data-testid={testId}>
        {value}
      </strong>
    </div>
  );
}
