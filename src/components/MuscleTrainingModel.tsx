import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useI18n } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { UnitField, val } from "./planner-fields";
import type { Prog } from "@/lib/progression-state";
import { effectiveCurrentCost, evaluateMtDecision, parseLevel } from "@/lib/muscle-training";
import { MUSCLE_TRAINING_MODEL as model } from "@/lib/muscle-training-model";
import { secondsToNext, type ProfState } from "@/lib/proficiency";
import { visibleCandidateRows } from "@/lib/presentation";

type Props = {
  p: Prog; setP: (v: Prog | ((p: Prog) => Prog)) => void;
  g: number | null; c: number | null; target: number | null; next: number | null; prof?: ProfState | null; now: number | null;
  onEditCalculator: () => void;
};

export function MuscleTrainingModel({ p, setP, g, c, target, next, prof = null, now, onEditCalculator }: Props) {
  const { t, fmtSuffix, naturalDuration, fmtFinish } = useI18n();
  const [view, setView] = useState<"summary" | "route" | "all">("summary");
  const [showCost, setShowCost] = useState(p.mtDisplayedCost.v.trim() !== "");
  const level = parseLevel(p.mtLevel);
  const displayed = val(p.mtDisplayedCost);
  const ready = g !== null && c !== null && target !== null && level !== null;
  const decision = ready ? evaluateMtDecision(p, c, g, target, next, prof) : null;
  const sourceIsPlayer = displayed !== null && displayed > 0;
  const invalidCost = p.mtDisplayedCost.v.trim() !== "" && !sourceIsPlayer;
  const sourceCost = effectiveCurrentCost(p);
  const missing = [g === null && t("Aktueller Gain"), c === null && t("Aktuelle Endurance"), target === null && t("Ziel-Endurance")].filter(Boolean).join(", ");

  return <div className="space-y-5" data-testid="mt-model">
    <div className="grid gap-5 min-[1100px]:grid-cols-[minmax(18rem,0.36fr)_minmax(0,0.64fr)]">
      <section className="panel min-w-0 p-4 sm:p-5" aria-labelledby="mt-state-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="mt-state-title" className="text-lg font-semibold">{t("Aktueller Stand")}</h2>
          <Button variant="ghost" size="sm" onClick={onEditCalculator}>{t("Planwerte bearbeiten")}<ArrowRight /></Button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Stat label={t("Aktuelle Endurance")} value={c === null ? "–" : fmtSuffix(c)} />
          <Stat label={t("Aktueller Gain")} value={g === null ? "–" : `${fmtSuffix(g)}/s`} />
          <Stat label={t("Ziel-Endurance")} value={target === null ? "–" : fmtSuffix(target)} />
          {next !== null && <Stat label={t("Nächster Gain nach Increase")} value={`${fmtSuffix(next)}/s`} />}
        </dl>
        {prof && <p className="mt-3 text-xs text-muted-foreground" data-testid="mt-prof-summary">Proficiency: <span className="font-mono text-foreground">Lv {prof.baseLevel}{prof.bonusLevel ? ` (+${prof.bonusLevel})` : ""}</span> · {t("Nächste Proficiency")} {naturalDuration(secondsToNext(prof))}</p>}
        {missing && <p className="mt-4 border-l-2 border-primary pl-3 text-sm text-muted-foreground">{t("Im Rechner ergänzen: {p0}", { p0: missing })}</p>}
        <div className="mt-5 border-t pt-4">
          <label htmlFor="mt-level" className="mb-1.5 block text-sm font-medium">{t("Aktuelles Muscle-Training-Level")}</label>
          <input id="mt-level" data-testid="mt-level-input" inputMode="numeric" placeholder={`0–${model.maxLevel}`} aria-invalid={p.mtLevel.trim() !== "" && level === null} value={p.mtLevel} onChange={(event) => setP((state) => ({ ...state, mtLevel: event.target.value }))} className="field min-h-11 w-full px-3 py-2.5 font-mono outline-none" />
          {p.mtLevel.trim() !== "" && level === null && <p className="mt-1 text-xs text-destructive">{t("Ganzes Level von 0 bis 150 eingeben.")}</p>}
        </div>
        {!showCost ? <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowCost(true)}>{t("Angezeigten Spielpreis verwenden")}</Button> : <div className="mt-4">
          <label htmlFor="mt-mtDisplayedCost" className="mb-1.5 block text-sm font-medium">{t("Angezeigter Preis des nächsten Kaufs")}</label>
          <UnitField id="mt-mtDisplayedCost" label={t("Angezeigter Preis des nächsten Kaufs")} value={p.mtDisplayedCost} onChange={(value) => setP((state) => ({ ...state, mtDisplayedCost: value }))} hideLabel invalid={invalidCost} />
          {invalidCost && <p className="mt-1 text-xs text-destructive">{t("Gültigen positiven Preis eingeben oder leer lassen.")}</p>}
        </div>}
        {level !== null && level < model.maxLevel && <p className="mt-3 text-xs text-muted-foreground" data-testid="mt-cost-source">{t(sourceIsPlayer ? "Angezeigter Spielpreis wird verwendet" : "Geschätzter Spielpreis")}: <span className="font-mono text-foreground">{sourceCost === null ? "–" : fmtSuffix(sourceCost)}</span></p>}
      </section>

      <section className="result-panel min-w-0 p-5 sm:p-6" data-testid="mt-recommendation" aria-labelledby="mt-best-title" aria-live="polite">
        <p className="text-xs font-medium text-muted-foreground">{t("Bester Plan")}</p>
        <h2 id="mt-best-title" className="mt-2 text-2xl font-semibold text-primary sm:text-3xl">{decision && level !== null ? recommendation(t, decision.action, decision.winner.purchases, level) : t("Gemeinsame Werte und aktuelles Level eingeben, um den besten Plan zu sehen.")}</h2>
        {decision && level !== null && <>
          <p className="mt-2 text-sm text-muted-foreground">{decision.winner.purchases > 0 ? t("Level {p0} → {p1}", { p0: level, p1: level + decision.winner.purchases }) : t("Kein Muscle-Training-Kauf vor diesem Ziel")}</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label={t("Nächste Aktion in")} value={decision.action === "increase-first" || decision.action === "buy-now" ? t("Jetzt") : decision.firstPurchase ? naturalDuration(decision.firstPurchase.eta) : naturalDuration(decision.winner.total)} />
            <Stat label={t("Gesamt-ETA")} value={naturalDuration(decision.winner.total)} />
            <Stat label={t("Zeitersparnis gegenüber keinem Kauf")} value={naturalDuration(Math.max(0, decision.saved))} />
            <Stat label={t("Resultierender Gain")} value={`${fmtSuffix(decision.winner.finalGain)}/s`} />
            <Stat label={t("Ziel fertig am")} value={now === null ? "–" : fmtFinish(decision.winner.total, now)} wide />
          </dl>
          <div className="mt-5 border-t pt-4">
            <h3 className="text-sm font-semibold">{t("Warum dieser Plan")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><strong className="text-foreground">{t("Kosten")}:</strong> {sourceCost === null ? "–" : fmtSuffix(sourceCost)} · {t(sourceIsPlayer ? "aus deinem Spiel" : "geschätzter Spielpreis")}</li>
              <li><strong className="text-foreground">{t("Nutzen")}:</strong> {fmtSuffix(decision.winner.finalGain)}/s · {t("spart {p0}", { p0: naturalDuration(Math.max(0, decision.saved)) })}</li>
              <li><strong className="text-foreground">{t("Plan")}:</strong> {decision.winner.purchases > 0 ? t("{p0} sinnvolle Level kaufen, dann direkt bis zum Ziel farmen.", { p0: decision.winner.purchases }) : t("Nichts kaufen; direkt bis zum Ziel farmen.")}</li>
            </ul>
          </div>
          <details className="group mt-4 border-t pt-4" data-testid="mt-alternatives"><summary className="flex cursor-pointer items-center justify-between text-sm font-medium">{t("Alternativen vergleichen")}<ChevronDown className="size-4 transition-transform group-open:rotate-180" /></summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><Stat label={t("Nichts kaufen")} value={naturalDuration(decision.baseline.total)} />{decision.runnerUp && <Stat label={t("Zweitbeste Option")} value={`${alternativeLabel(t, decision.runnerUp.id)} · ${naturalDuration(decision.runnerUp.total)}`} />}</div></details>
        </>}
      </section>
    </div>

    <section className="panel min-w-0 p-4 sm:p-5" data-testid="mt-preview" aria-labelledby="mt-journey-title">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><h2 id="mt-journey-title" className="min-w-0 text-lg font-semibold">{t("Nächste Level")}</h2>
        {decision && decision.plan.rows.length > 4 && <div className="flex flex-wrap justify-end gap-1"><Button size="sm" variant={view === "route" ? "default" : "ghost"} aria-pressed={view === "route"} onClick={() => setView(view === "route" ? "summary" : "route")}>{t("Route zum empfohlenen Level")}</Button><Button size="sm" variant={view === "all" ? "default" : "ghost"} aria-pressed={view === "all"} onClick={() => setView(view === "all" ? "summary" : "all")}>{t("Alle Kandidaten")}</Button></div>}
      </div>
      {decision && level !== null ? (() => { const best = decision.plan.prefix.best; const rows = visibleCandidateRows(decision.plan.rows.length, best, view); return <>
        <div className="grid gap-2 lg:hidden">{rows.map((i, k) => i === "gap" ? <p key={`g${k}`} className="text-center text-muted-foreground" aria-hidden>…</p> : <JourneyCard key={i} row={decision.plan.rows[i]!} level={level} best={i === best} baseline={decision.baseline.total} />)}</div>
        <div className="hidden lg:block"><table className="w-full table-fixed text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th className="w-[12%] py-2">{t("Level")}</th><th>{t("Preis")}</th><th>{t("Gesamtkosten")}</th><th>{t("Gain nach Kauf")}</th><th>{t("Erreicht nach")}</th><th>{t("ETA bei Stopp hier")}</th><th>{t("Zeitersparnis")}</th></tr></thead><tbody>{rows.map((i, k) => i === "gap" ? <tr key={`g${k}`} className="border-t"><td colSpan={7} className="py-1 text-center text-muted-foreground">…</td></tr> : <JourneyRow key={i} row={decision.plan.rows[i]!} level={level} best={i === best} baseline={decision.baseline.total} />)}</tbody></table></div>
      </>; })() : <p className="text-sm text-muted-foreground">{t("Aktuellen Stand vervollständigen, um die Level-Reise zu sehen.")}</p>}
    </section>
  </div>;
}

function recommendation(t: ReturnType<typeof useI18n>["t"], action: string, purchases: number, level: number) {
  if (action === "increase-first") return t("Zuerst Increase verwenden");
  if (action === "buy-now") return purchases === 1 ? t("Level {p0} jetzt kaufen", { p0: level + 1 }) : t("Jetzt {p0} Level kaufen", { p0: purchases });
  if (action === "farm-to-buy") return t("Bis zum nächsten Kauf farmen, dann dem Plan folgen");
  return t("Weiter bis zum Ziel farmen");
}
function alternativeLabel(t: ReturnType<typeof useI18n>["t"], id: string) { return t(id === "baseline" ? "Nichts kaufen" : id === "muscle" ? "Muscle-Training-Plan" : id === "increase" ? "Nur Increase" : "Increase, dann Muscle Training"); }
type Row = NonNullable<ReturnType<typeof evaluateMtDecision>>["plan"]["rows"][number];
function Stat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) { return <div className={wide ? "col-span-2" : ""}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-mono text-sm font-medium">{value}</dd></div>; }
function useRowText(row: Row, baseline: number) {
  const { t, fmtSuffix, naturalDuration } = useI18n(); const saved = baseline - row.total;
  return { price: row.purchases ? fmtSuffix(row.cost) : "–", total: row.purchases ? fmtSuffix(row.cumulativeCost) : "–", gain: `${fmtSuffix(row.finalGain)}/s`, at: row.purchases ? row.stopTime === 0 ? t("Jetzt") : naturalDuration(row.stopTime) : "–", eta: naturalDuration(row.total), saved: row.purchases ? `${saved < 0 ? "−" : "+"}${naturalDuration(Math.abs(saved))}` : "–", name: row.purchases === 0 ? t("Nichts kaufen") : null };
}
function JourneyCard({ row, level, best, baseline }: { row: Row; level: number; best: boolean; baseline: number }) { const { t } = useI18n(); const x = useRowText(row, baseline); return <article className={`border-l-2 p-3 ${best ? "border-success bg-secondary/40" : "border-border"}`} data-testid="mt-preview-row" data-best={best || undefined}><p className="font-semibold">{x.name ?? `Lv. ${level + row.purchases}`}{best && <span className="ml-2 text-xs text-success">{t("Bester Plan")}</span>}</p><dl className="mt-2 grid grid-cols-2 gap-2"><Stat label={t("Preis")} value={x.price} /><Stat label={t("Gesamtkosten")} value={x.total} /><Stat label={t("Gain nach Kauf")} value={x.gain} /><Stat label={t("Erreicht nach")} value={x.at} /><Stat label={t("ETA bei Stopp hier")} value={x.eta} /><Stat label={t("Zeitersparnis")} value={x.saved} /></dl></article>; }
function JourneyRow({ row, level, best, baseline }: { row: Row; level: number; best: boolean; baseline: number }) { const { t } = useI18n(); const x = useRowText(row, baseline); return <tr className={`border-t text-xs ${best ? "bg-secondary/50" : ""}`} data-testid="mt-preview-row" data-best={best || undefined}><td className="py-3 pr-2 font-semibold">{x.name ?? `Lv. ${level + row.purchases}`}{best && <span className="block text-success">{t("Bester Plan")}</span>}</td>{[x.price, x.total, x.gain, x.at, x.eta, x.saved].map((v, i) => <td key={i} className="break-words pr-2 font-mono">{v}</td>)}</tr>; }