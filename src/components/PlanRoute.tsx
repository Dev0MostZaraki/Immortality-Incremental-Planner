import { useState } from "react";
import { useI18n } from "./LanguageProvider";
import { Button } from "./ui/button";
import type { evaluateMtDecision } from "@/lib/muscle-training";
import type { RouteEvent } from "@/lib/route-engine";

type Decision = NonNullable<ReturnType<typeof evaluateMtDecision>>;

export function BestNextMove({ d, level, now, hasProf }: { d: Decision | null; level: number | null; now: number | null; hasProf: boolean }) {
  const { t, fmtSuffix, naturalDuration, fmtFinishExact } = useI18n();
  if (!d) return <section className="result-panel min-w-0 p-5 sm:p-6" data-testid="best-next-move"><p className="text-xs font-medium text-muted-foreground">{t("Bester nächster Schritt")}</p><p className="mt-3 text-muted-foreground">{t("Bitte gültige Werte für Gain und Ziel eingeben.")}</p></section>;
  const w = d.winner, from = level ?? 0;
  const head = d.action === "increase-first" ? t("Zuerst Increase verwenden")
    : d.action === "buy-now" ? t("Muscle Training Lv {p0} jetzt kaufen", { p0: from + 1 })
    : d.action === "farm-to-buy" ? t("Farmen, dann Muscle Training Lv {p0} kaufen", { p0: from + 1 })
    : t("Direkt bis zum Ziel farmen");
  const when = d.action === "increase-first" || d.action === "buy-now" ? t("Jetzt") : d.firstPurchase ? t("in {p0}", { p0: naturalDuration(d.firstPurchase.eta) }) : "–";
  const finalGain = d.events.at(-1)?.gain ?? w.finalGain;
  return <section className="result-panel min-w-0 p-5 sm:p-6" data-testid="best-next-move" aria-live="polite">
    <p className="text-xs font-medium text-muted-foreground">{t("Bester nächster Schritt")}</p>
    <h2 className="mt-2 text-2xl font-semibold text-primary sm:text-3xl" data-testid="next-move">{head}</h2>
    {w.purchases > 0 && <p className="mt-2 text-sm text-muted-foreground" data-testid="route-levels">{t("Route: Muscle Training Lv {p0} → {p1}", { p0: from, p1: from + w.purchases })}</p>}
    <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
      <S l={t("Wann")} v={when} />
      <S l={t("Ziel-ETA")} v={naturalDuration(w.total)} id="route-eta" />
      <S l={t("Fertig am")} v={now === null || !Number.isFinite(w.total) ? "–" : fmtFinishExact(w.total, now)} />
      <S l={t("Ersparnis gegenüber direktem Farmen")} v={naturalDuration(Math.max(0, d.saved))} />
      <S l={t("Erwarteter Gain am Ziel")} v={`${fmtSuffix(finalGain)}/s`} />
      {hasProf && <S l={t("Level vor dem Ziel")} v={String(w.profLevels)} />}
    </dl>
  </section>;
}

function S({ l, v, id }: { l: string; v: string; id?: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="mt-1 break-words font-mono text-sm font-medium" data-testid={id}>{v}</dd></div>;
}

export function RouteTimeline({ events }: { events: RouteEvent[] }) {
  const { t, fmtSuffix, naturalDuration } = useI18n();
  const [all, setAll] = useState(false);
  const limit = 10;
  const shown: (RouteEvent | number)[] = all || events.length <= limit ? events : [...events.slice(0, 6), events.length - 9, ...events.slice(-3)];
  const label = (e: RouteEvent) => e.kind === "now" ? t("Jetzt") : e.kind === "increase" ? t("Increase verwenden") : e.kind === "prof" ? t("Proficiency Lv {p0}", { p0: e.profLevel ?? "–" }) : e.kind === "mt" ? t("Muscle Training Lv {p0} kaufen", { p0: e.mtLevel ?? "–" }) : t("Ziel erreicht");
  return <section className="panel min-w-0 p-4 sm:p-5" data-testid="route-timeline" aria-labelledby="timeline-h">
    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><h2 id="timeline-h" className="min-w-0 text-lg font-semibold">{t("Routen-Zeitachse")}</h2>{events.length > limit && <Button variant="ghost" size="sm" onClick={() => setAll(!all)}>{t(all ? "Weniger anzeigen" : "Alle Ereignisse anzeigen")}</Button>}</div>
    <ol className="grid gap-2">{shown.map((e, i) => typeof e === "number" ? <li key={`gap${i}`} className="pl-4 text-xs text-muted-foreground">{t("… {p0} weitere Ereignisse", { p0: e })}</li> :
      <li key={i} data-testid="timeline-event" data-kind={e.kind} className={`grid min-w-0 gap-1 border-l-2 py-1 pl-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center ${e.kind === "target" ? "border-success" : e.kind === "mt" || e.kind === "increase" ? "border-primary" : "border-border"}`}>
        <span className="min-w-0 text-sm font-medium">{label(e)}</span>
        <span className="font-mono text-xs text-muted-foreground">{e.time === 0 ? t("Start") : `+${naturalDuration(e.time)}`}</span>
        <span className="break-words font-mono text-xs">{fmtSuffix(e.endurance)}</span>
        <span className="break-words font-mono text-xs">{fmtSuffix(e.gain)}/s</span>
      </li>)}</ol>
  </section>;
}