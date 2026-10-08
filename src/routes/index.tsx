import { useI18n, LanguageSwitcher } from "@/components/LanguageProvider";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, Save, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnduranceResult } from "@/components/EnduranceResult";
import { SUFFIXES, toValue, eta, DURATION_UNITS, parseNum, type Parsed } from "@/lib/endurance";
import { UnitField, Hint, val, type NU } from "@/components/planner-fields";
import { LawSynthesis } from "@/components/LawSynthesis";
import { ProgressionPlanner } from "@/components/ProgressionPlanner";
import { PublicFooter, PlannerUtilities } from "@/components/PublicFooter";
import { DEFAULTS, ENDURANCE_KEY, restoreState, type State, type Target } from "@/lib/planner-state";
import { calculatePlan, decide, upgradeROI, compareGain, contextTargets } from "@/lib/planner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Immortality Incremental Planner" },
      { name: "description", content: "Independent fan-made Endurance, Progression and Law Synthesis toolkit. Deutsch / English. Local calculations, inventory and farming plans; no account required." },
      { property: "og:title", content: "Immortality Incremental Planner" },
      { property: "og:description", content: "Independent Immortality Incremental planning toolkit: Endurance, upgrades, Law Synthesis, materials and farming times. Deutsch / English." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});


function Index() {
  const { t: tr, locale, fmtPlain, fmtSuffix, fmtDuration, fmtFinishExact: fmtFinish, naturalDuration } = useI18n();

  const [s, setS] = useState<State>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(ENDURANCE_KEY); if (raw) setS(restoreState(raw)); }
    catch { setStorageError(true); }
    setLoaded(true);
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (loaded) {
      try { localStorage.setItem(ENDURANCE_KEY, JSON.stringify(s)); }
      catch { setStorageError(true); }
    }
  }, [s, loaded]);
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }));
  const gainP = toValue(s.gain.v, s.gain.u), curP = toValue(s.cur.v, s.cur.u);
  const tgtP = toValue(s.target.v, s.target.u), nextP = toValue(s.next.v, s.next.u);
  const g = gainP.ok === true ? gainP.value : null;
  const c = curP.ok === true ? curP.value : curP.ok === "empty" ? 0 : null;
  const t = tgtP.ok === true ? tgtP.value : null;
  const n = nextP.ok === true ? nextP.value : null;
  const r = g !== null && c !== null && t !== null ? calculatePlan(c, t, g) : null;
  const cmp = g !== null && c !== null && t !== null && n !== null ? compareGain(c, t, g, n) : null;
  const customP = toValue(s.custom.v, s.custom.u);
  const clock = now === null ? "–" : new Date(now).toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const copy = async () => {
    if (!r || g === null || c === null || t === null || now === null) return;
    const text = [
      "Immortality Incremental – Endurance Planner",
      tr("Gain: {p0}/s | Aktuell: {p1} | Ziel: {p2}", { p0: fmtSuffix(g), p1: fmtSuffix(c), p2: fmtSuffix(t) }),
      tr("Restzeit: {p0} ({p1} Sekunden)", { p0: naturalDuration(r.secs), p1: fmtPlain(r.secs, 3) }),
      tr("Jetzt: {p0} | Fertig: {p1}", { p0: clock, p1: fmtFinish(r.secs, now) }),
      tr("Noch benötigt: {p0} | Fortschritt: {p1} %", { p0: fmtSuffix(r.remaining), p1: fmtPlain(r.pct, 2) }),
      cmp ? tr("{p0} | Mit Increase: {p1} | {p2}: {p3}", { p0: tr(cmp.recommendation), p1: naturalDuration(cmp.b), p2: tr(cmp.saved < 0 ? "Zeitverlust" : "Zeitersparnis"), p3: fmtDuration(Math.abs(cmp.saved)) }) : "",
    ].filter(Boolean).join("\n");
    try { await navigator.clipboard.writeText(text); setCopied(true); setCopyError(false); setTimeout(() => setCopied(false), 1800); }
    catch { setCopyError(true); }
  };
  const [copiedProg, setCopiedProg] = useState(false);
  const copyProg = async () => {
    if (g === null || c === null || t === null) return;
    const pr = s.prog, uc = val(pr.upCost), ug = val(pr.upGain);
    const d = decide(c, g, t, { next: n, upCost: uc, upGain: ug, comboGain: val(pr.comboGain) });
    const text = [
      "Immortality Incremental – Progression",
      tr("Gain: {p0}/s | Aktuell: {p1} | Ziel: {p2}{p3}", { p0: fmtSuffix(g), p1: fmtSuffix(c), p2: fmtSuffix(t), p3: n !== null ? tr(" | Nächster Gain: {p0}/s", { p0: fmtSuffix(n) }) : "" }),
      `${pr.upName || "Upgrade"}${pr.mtLevel ? ` Lv. ${pr.mtLevel}` : ""}${uc !== null && ug !== null ? `: ${tr(upgradeROI(c, g, t, uc, ug).recommendation)}` : tr(": keine Upgrade-Daten")}`,
      tr("Nächster Schritt: {p0} ({p1})", { p0: tr(d.winner.label), p1: naturalDuration(d.winner.secs) }),
      ...d.scenarios.map((x) => `${x.id} ${tr(x.label)}: ${naturalDuration(x.secs)}`),
    ].join("\n");
    try { await navigator.clipboard.writeText(text); setCopiedProg(true); setCopyError(false); setTimeout(() => setCopiedProg(false), 1800); }
    catch { setCopyError(true); }
  };
  const chip = (value: NU, key: string) => (
    <Button key={key} variant="outline" size="sm" aria-pressed={s.target.v === value.v && s.target.u === value.u}
      onClick={() => set("target", value)} className="target-chip font-mono">
      {parseNum(value.v).ok === true ? fmtPlain(Number(value.v.replace(",", ".")), 6) : value.v} {value.u || tr("Einheiten")}
    </Button>
  );

  return (
    <div className="planner-shell">
      <header className="planner-header" data-testid="main-header">
        <h1 className="min-w-0 text-base font-semibold leading-snug sm:text-lg">Immortality Incremental <span className="text-primary">Planner</span></h1>
        <nav className="tool-navigation inline-flex min-w-0 rounded-md border bg-secondary p-1" aria-label={tr("Werkzeug")}>
          <Button variant={s.tool === "endurance" ? "default" : "ghost"} size="sm" aria-pressed={s.tool === "endurance"} onClick={() => set("tool", "endurance")}>Endurance Planner</Button>
          <Button variant={s.tool === "law" ? "default" : "ghost"} size="sm" aria-pressed={s.tool === "law"} onClick={() => set("tool", "law")}>Law Synthesis</Button>
        </nav>
        <div className="header-utilities flex shrink-0 items-center gap-2"><LanguageSwitcher /><PlannerUtilities onReset={() => setS((p) => ({ ...DEFAULTS, tool: p.tool }))} /></div>
      </header>
      {s.tool === "law" ? <main><LawSynthesis /></main> : <>
      <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b pb-4">
        <div className="inline-flex justify-self-start rounded-md border bg-secondary p-1" role="group" aria-label={tr("Ansicht")}>
          <Button variant={s.mode === "simple" ? "default" : "ghost"} size="sm" aria-pressed={s.mode === "simple"} onClick={() => set("mode", "simple")}>{tr("Einfach")}</Button>
          <Button variant={s.mode === "progression" ? "default" : "ghost"} size="sm" aria-pressed={s.mode === "progression"} onClick={() => set("mode", "progression")}>Progression</Button>
          <Button variant={s.mode === "advanced" ? "default" : "ghost"} size="sm" aria-pressed={s.mode === "advanced"} onClick={() => set("mode", "advanced")}>{tr("Erweitert")}</Button>
        </div>
        <span className="hidden text-right text-xs text-muted-foreground sm:block">{s.mode === "progression" ? tr("Empfohlen fürs aktive Spielen") : tr("Endurance · ×1000 je Einheit")}</span>
      </div>
      <main>
        {s.mode === "progression" ? <>
          <ProgressionPlanner core={{ gain: s.gain, cur: s.cur, target: s.target, next: s.next }} setCore={(k, v) => set(k, v)} g={g} c={c} t={t} n={n} p={s.prog} setP={(v) => setS((x) => ({ ...x, prog: typeof v === "function" ? v(x.prog) : v }))} now={now} onCopy={copyProg} copied={copiedProg} />
        </> : <>
        <div className="calculator-layout" data-testid="calculator-layout">
          <section className="min-w-0 space-y-5 py-2" aria-labelledby="inputs-h">
            <h2 id="inputs-h" className="section-label">{tr("Deine Werte")}</h2>
            <NumUnit id="gain" label={tr("Aktueller Gain")} suffix="/ s" value={s.gain} onChange={(v) => set("gain", v)} parsed={gainP} help={tr("Endurance pro Sekunde.")} required />
            <NumUnit id="cur" label={tr("Aktuelle Endurance")} value={s.cur} onChange={(v) => set("cur", v)} parsed={curP} help={tr("Leer = 0.")} />
            <div>
              <NumUnit id="tgt" label={tr("Ziel-Endurance")} value={s.target} onChange={(v) => set("target", v)} parsed={tgtP} help="" required />
               <div className="mt-3 flex flex-wrap gap-2" aria-label={tr("Schnellziele")} data-testid="quick-targets">{contextTargets(s.target.u).map((v) => chip(v, `context-${v.v}-${v.u}`))}{s.savedCustom && chip(s.savedCustom, "custom-saved")}</div>
               <details className="mt-3 text-xs text-muted-foreground">
                 <summary className="cursor-pointer py-1">{tr("Eigenes Schnellziel")}</summary>
                 <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                   <UnitField id="custom" label={tr("Eigenes Schnellziel")} value={s.custom} onChange={(v) => set("custom", v)} invalid={customP.ok === false} />
                   <Button variant="outline" size="icon" title={tr("Schnellziel speichern")} aria-label={tr("Schnellziel speichern")} disabled={customP.ok !== true} onClick={() => set("savedCustom", { ...s.custom })}><Save /></Button>
                 </div>
                 {customP.ok === false && <p className="mt-1 text-destructive">{tr(customP.error)}</p>}
               </details>
               <UnitContext unit={s.target.u} />
              {c !== null && c > 0 && t !== null && t / c >= 1000 && (
                <p className="mt-3 border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">{tr("Dein Ziel liegt")} <strong className="font-mono text-foreground">{fmtPlain(t / c, 0)}×</strong> {tr("über deinem aktuellen Stand.")}</p>
              )}
            </div>
            <NumUnit id="next" label={tr("Nächster Gain (optional)")} suffix="/ s" value={s.next} onChange={(v) => set("next", v)} parsed={nextP} help={tr("Endurance-Gain nach Increase.")} />
          </section>
           <EnduranceResult result={r} gain={g} current={c} target={t} now={now} copied={copied} copyError={copyError} onCopy={copy} />
        </div>

        <section className={`mt-6 border-y ${n === null ? "py-4" : "py-6 sm:py-7"}`} aria-labelledby="increase-h" data-testid="increase-planner" data-expanded={n !== null}>
          <div className={`${n === null ? "mb-2" : "mb-5"} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between`}>
            <h2 id="increase-h" className={`flex min-w-0 items-center gap-2 ${n === null ? "text-base" : "text-xl"} font-semibold`}><Zap className="size-5 text-primary" />Increase Planner</h2>
            {cmp && !r?.reached && <span className={`border-l-2 pl-3 text-sm font-semibold ${cmp.recommendation === "Increase jetzt sinnvoll" ? "border-success text-success" : cmp.recommendation === "Nicht drücken" ? "border-destructive text-destructive" : "border-border text-muted-foreground"}`} data-testid="recommendation">{tr(cmp.recommendation)}</span>}
          </div>
          {!cmp || g === null || n === null ? <p className="text-sm text-muted-foreground">{tr("Gib oben deinen nächsten Gain ein, um vor und nach Increase zu vergleichen.")}</p> : r?.reached ? <p className="text-sm text-success">{tr("Ziel bereits erreicht – für dieses Ziel ist kein Increase nötig.")}</p> : (
            <>
              <div className="grid gap-5 md:grid-cols-3">
                <ScenarioResult label={tr("Ohne Increase")} gain={g} secs={cmp.a} now={now} />
                <ScenarioResult label={tr("Increase jetzt")} gain={n} secs={cmp.b} now={now} />
                <div className="border-t pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                  <p className="text-xs text-muted-foreground">{cmp.saved < 0 ? tr("Zeitverlust") : tr("Zeitersparnis")}</p>
                  <p className={`mt-2 break-words font-mono text-2xl font-semibold ${cmp.saved > 0 ? "text-success" : cmp.saved < 0 ? "text-destructive" : "text-foreground"}`}>{cmp.saved === Infinity ? tr("Ziel wird erreichbar") : fmtDuration(Math.abs(cmp.saved))}</p>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">{Number.isFinite(cmp.pct) ? `${fmtPlain(Math.abs(cmp.pct), 2)} % ${cmp.pct < 0 ? tr("länger") : tr("weniger Zeit")}` : tr("Mit Increase nicht erreichbar")}</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                {cmp.saved > 0 ? tr("Break-even: Ohne Endurance-Reset oder Wartezeit bringt der höhere Gain ab sofort einen Vorteil. Eine Strength-Erholung ist nicht eingerechnet.") : cmp.saved === 0 ? tr("Break-even: Kein Zeitvorteil für dieses Ziel. Beide Optionen benötigen gleich lange.") : tr("Break-even: Der nächste Gain ist niedriger. Für dieses Ziel entsteht kein Zeitvorteil durch Increase.")}
              </p>
            </>
          )}
          <div className={`${n === null ? "mt-2" : "mt-5"} flex flex-wrap items-center justify-between gap-3`}>
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">{tr("Increase setzt Strength zurück. Die Endurance-ETA berücksichtigt nur die eingegebenen Endurance-Gains; die Erholungszeit für Strength ist nicht eingerechnet.")}</p>
            {n !== null && <Button onClick={() => setS((p) => ({ ...p, gain: p.next, next: { v: "", u: p.next.u } }))} className="action-glow">{tr("Next Gain übernehmen")}<ArrowRight /></Button>}
          </div>
          {cmp && <p className="mt-4 text-xs text-muted-foreground">{tr("Jetzt:")} <span className="font-mono">{clock}</span></p>}
        </section>

        {s.mode === "advanced" && (
          <div className="border-t" data-testid="advanced-tools">
            <Section title={tr("Szenarien vergleichen")} right={<Button variant="ghost" size="sm" onClick={() => setS((p) => ({ ...p, scenarioA: null, scenarioB: null, scenarioC: { v: "", u: p.gain.u } }))}>{tr("Aktuelle Gains einsetzen")}</Button>}>
              <ScenarioComparator values={[s.scenarioA ?? s.gain, s.scenarioB ?? s.next, s.scenarioC]} onChange={(i, v) => set(i === 0 ? "scenarioA" : i === 1 ? "scenarioB" : "scenarioC", v)} c={c} t={t} now={now} />
              <p className="mt-4 text-xs text-muted-foreground">{tr("Gleicher Endurance-Stand und gleiches Ziel · Jetzt:")} <span className="font-mono">{clock}</span></p>
            </Section>
            <div className="grid gap-5 md:grid-cols-2">
              <Section title={tr("Benötigter Gain")}><Duration id="dur" label={tr("Ziel erreichen in")} value={s.dur} onChange={(v) => set("dur", v)} /><ReverseResult c={c} t={t} dur={s.dur} /></Section>
              <Section title={tr("Hochrechnung")}><Duration id="proj" label={tr("Zeitraum")} value={s.proj} onChange={(v) => set("proj", v)} /><ProjResult c={c} g={g} t={t} dur={s.proj} /></Section>
            </div>
            <Section title={tr("Mehrere Ziele")} right={<Button variant="outline" size="sm" disabled={s.targets.length >= 10} onClick={() => set("targets", [...s.targets, { id: Date.now(), v: "", u: s.target.u }])}>{tr("+ Ziel (")}{s.targets.length}/10)</Button>}>
              {s.targets.length === 0 ? <p className="text-sm text-muted-foreground">{tr("Noch keine weiteren Ziele.")}</p> : <>
                <div className="mb-4 grid gap-2 sm:grid-cols-2">{s.targets.map((tg, i) => <div key={tg.id} className="flex min-w-0 items-center gap-2"><UnitField id={`mt-${tg.id}`} label={tr("Ziel {p0}", { p0: i + 1 })} value={tg} onChange={(v) => set("targets", s.targets.map((x) => x.id === tg.id ? { ...x, ...v } : x))} /><Button variant="ghost" size="icon" aria-label={tr("Ziel {p0} entfernen", { p0: i + 1 })} onClick={() => set("targets", s.targets.filter((x) => x.id !== tg.id))}><X /></Button></div>)}</div>
                <MultiTable targets={s.targets} c={c} g={g} now={now ?? 0} />
              </>}
              <p className="mt-3 text-xs text-muted-foreground">{tr("Jetzt:")} <span className="font-mono">{clock}</span></p>
            </Section>
            <footer className="mt-7 grid gap-6 border-t pt-6 text-sm text-muted-foreground md:grid-cols-2">
              <div><h2 className="mb-2 font-semibold text-foreground">{tr("Formel")}</h2><code className="block break-words font-mono text-xs text-primary">{tr("Zeit = (Ziel − Aktuell) / Gain pro Sekunde")}</code><p className="mt-2 text-xs leading-relaxed">{tr("Benötigter Gain = (Ziel − Aktuell) / Zeit · Hochrechnung = Aktuell + Gain × Zeit. Monate = 30,44 Tage, Jahre = 365,2425 Tage.")}</p></div>
              <div><h2 className="mb-2 font-semibold text-foreground">{tr("Einheiten · jeder Schritt ×1000")}</h2><p className="break-words font-mono text-xs leading-relaxed">{SUFFIXES.slice(1).map((u, i) => `${u}=1e${(i + 1) * 3}`).join(" · ")}</p><p className="mt-2 text-xs">{tr("1 Qa = 1000 T · 1 Qi = 1000 Qa · 1 Sx = 1000 Qi. Wissenschaftliche Notation z. B. 1e120 mit Einheit „–“.")}</p></div>
            </footer>
          </div>
        )}
        </>}
      </main>
      </>}
      <PublicFooter />
      {storageError && <p role="status" className="mt-2 text-center text-xs text-destructive">{tr("Dein Browser erlaubt das lokale Speichern nicht. Eingaben bleiben nur bis zum Neuladen erhalten.")}</p>}
    </div>
  );
}

function UnitContext({ unit }: { unit: string }) {
  const { t: tr, neighboringConversion } = useI18n();

  const i = SUFFIXES.findIndex((u) => u === unit);
  const previous = SUFFIXES[i - 1], next = SUFFIXES[i + 1];
  return <div className="mt-3 border-t pt-3 text-xs text-muted-foreground"><p className="flex items-center gap-3 font-mono">{previous !== undefined && <span>{previous || tr("Einheiten")} ←</span>}<span className="rounded border px-2 py-1 font-semibold text-primary">{unit || tr("Einheiten")}</span>{next !== undefined && <span>→ {next}</span>}</p><p className="mt-2 break-words font-mono">{neighboringConversion({ v: "1", u: unit })}</p></div>;
}
function ScenarioResult({ label, gain, secs, now }: { label: string; gain: number; secs: number; now: number | null }) {
  const { fmtSuffix, fmtFinish, naturalDuration } = useI18n();

  return <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{label} · <span className="font-mono">{fmtSuffix(gain)}/s</span></p><p className="mt-2 break-words font-mono text-xl font-semibold">{naturalDuration(secs)}</p><p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">{now === null ? "–" : fmtFinish(secs, now)}</p></div>;
}
function ScenarioComparator({ values, onChange, c, t, now }: { values: NU[]; onChange: (i: number, v: NU) => void; c: number | null; t: number | null; now: number | null }) {
  const { t: tr, fmtPlain, fmtDuration, fmtFinish, naturalDuration } = useI18n();

  const rows = values.map((v) => { const p = toValue(v.v, v.u); return { value: v, p, gain: p.ok === true ? p.value : null, secs: p.ok === true && c !== null && t !== null ? eta(c, t, p.value) : null }; });
  const reachable = rows.filter((r) => r.secs !== null && Number.isFinite(r.secs));
  const fastest = reachable.length ? Math.min(...reachable.map((r) => r.secs ?? Infinity)) : null;
  const a = rows[0];
  if (!a) return null;
  return <div className="grid gap-4 md:grid-cols-3">{rows.map((row, i) => {
    const saved = row.secs !== null && a.secs !== null ? a.secs === row.secs ? 0 : a.secs - row.secs : null;
    const speed = row.gain !== null && a.gain !== null && a.gain > 0 ? row.gain / a.gain : null;
    return <div key={i} className={`min-w-0 border-l-2 pl-4 ${row.secs !== null && fastest === row.secs ? "border-success" : "border-border"}`}>
      <div className="mb-2 flex h-6 items-center justify-between gap-2"><label htmlFor={`scenario-${i}`} className="text-sm font-medium">{tr("Szenario")} {"ABC"[i]}</label>{row.secs !== null && fastest === row.secs && <span className="text-xs text-success">{tr("Schnellstes")}</span>}</div>
      <UnitField id={`scenario-${i}`} label={tr("Szenario {p0} Gain", { p0: "ABC"[i] ?? "" })} value={row.value} onChange={(v) => onChange(i, v)} suffix="/ s" invalid={row.p.ok === false} hideLabel />
      {row.p.ok === false && <p className="mt-1 text-xs text-destructive">{tr(row.p.error)}</p>}
      <p className="mt-4 break-words font-mono text-lg font-semibold">{row.secs === null ? "–" : naturalDuration(row.secs)}</p>
      <p className="mt-2 min-h-10 font-mono text-xs leading-relaxed text-muted-foreground">{row.secs === null || now === null ? "–" : fmtFinish(row.secs, now)}</p>
      <dl className="mt-3 space-y-2 border-t pt-3 text-xs"><div><dt className="text-muted-foreground">{tr("Zeitersparnis vs. A")}</dt><dd className="mt-1 font-mono">{saved === null ? "–" : `${saved < 0 ? "−" : ""}${fmtDuration(Math.abs(saved))}`}</dd></div><div><dt className="text-muted-foreground">{tr("Relative Geschwindigkeit")}</dt><dd className="mt-1 font-mono">{speed === null ? "–" : `${fmtPlain(speed, 3)}× A`}</dd></div></dl>
    </div>;
  })}</div>;
}

/* ---------- existing planning tools ---------- */
function ReverseResult({ c, t, dur }: { c: number | null; t: number | null; dur: { v: string; u: string } }) {
  const { t: tr, fmtSuffix } = useI18n();

  const p = parseNum(dur.v);
  const f = (DURATION_UNITS.find((d) => d.id === dur.u)?.f ?? 1);
  if (c === null || t === null) return <Hint>{tr("Aktuelle und Ziel-Endurance oben eingeben.")}</Hint>;
  if (p.ok !== true || p.value <= 0) return <Hint error={p.ok === false}>{p.ok === false ? tr(p.error) : tr("Zeitraum größer 0 eingeben.")}</Hint>;
  if (t <= c) return <Hint>{tr("Ziel bereits erreicht.")}</Hint>;
  if (!Number.isFinite(p.value * f)) return <Hint error>{tr("Zeitraum ist zu groß.")}</Hint>;
  const need = (t - c) / (p.value * f);
  return <Big label={tr("Benötigt für {p0}", { p0: fmtSuffix(t) })} value={`${fmtSuffix(need)} / s`} sub={tr("= {p0} pro Stunde", { p0: fmtSuffix(need * 3600) })} />;
}

function ProjResult({ c, g, t, dur }: { c: number | null; g: number | null; t: number | null; dur: { v: string; u: string } }) {
  const { t: tr, fmtPlain, fmtSuffix } = useI18n();

  const p = parseNum(dur.v);
  const f = (DURATION_UNITS.find((d) => d.id === dur.u)?.f ?? 1);
  if (c === null || g === null) return <Hint>{tr("Gain und aktuelle Endurance oben eingeben.")}</Hint>;
  if (p.ok !== true) return <Hint error={p.ok === false}>{p.ok === false ? tr(p.error) : tr("Zeitraum eingeben.")}</Hint>;
  if (!Number.isFinite(p.value * f)) return <Hint error>{tr("Zeitraum ist zu groß.")}</Hint>;
  const gained = g * p.value * f;
  const total = c + gained;
  return <Big label={tr("Projizierte Endurance")} value={fmtSuffix(total)}
    sub={`+${fmtSuffix(gained)}${t ? ` · ${total >= t ? tr("Ziel erreicht ✓") : tr("{p0} % vom Ziel", { p0: fmtPlain((total / t) * 100, 2) })}` : ""}`} />;
}

function MultiTable({ targets, c, g, now }: { targets: Target[]; c: number | null; g: number | null; now: number }) {
  const { t: tr, fmtSuffix, fmtDuration, fmtFinish } = useI18n();

  const rows = targets
    .map((x) => ({ x, p: toValue(x.v, x.u) }))
    .filter((r): r is { x: Target; p: { ok: true; value: number } } => r.p.ok === true)
    .sort((a, b) => a.p.value - b.p.value);
  if (!rows.length) return <Hint>{tr("Werte eintragen, um die Tabelle zu sehen.")}</Hint>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr><th className="py-2 pr-3 font-medium">{tr("Ziel")}</th><th className="py-2 pr-3 font-medium">{tr("Restzeit")}</th><th className="py-2 font-medium">{tr("Fertig am")}</th></tr>
        </thead>
        <tbody>
          {rows.map(({ x, p }) => {
            const sec = c !== null && g !== null ? eta(c, p.value, g) : NaN;
            const done = c !== null && p.value <= c;
            return (
              <tr key={x.id} className="border-t">
                <td className="py-2 pr-3 font-mono">{fmtSuffix(p.value)}</td>
                <td className="py-2 pr-3">{done ? <span className="text-success">{tr("Erreicht ✓")}</span> : Number.isNaN(sec) ? "–" : fmtDuration(sec)}</td>
                <td className="py-2 font-mono text-xs text-muted-foreground">{done || Number.isNaN(sec) ? "–" : fmtFinish(sec, now)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NumUnit({ id, label, value, onChange, parsed, help, suffix, required }: {
  id: string; label: string; value: NU; onChange: (v: NU) => void; parsed: Parsed; help: string; suffix?: string; required?: boolean;
}) {
  const { t: tr } = useI18n();

  const err = parsed.ok === false ? parsed.error : required && parsed.ok === "empty" ? tr("Pflichtfeld") : null;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
        {label}
        
      </label>
      <UnitField id={id} label={label} value={value} onChange={onChange} suffix={suffix} invalid={!!err} describedBy={`${id}-help`} hideLabel />
      <p id={`${id}-help`} className={`mt-1 text-xs ${err ? "text-destructive" : "text-muted-foreground"}`}>
        {tr(err ?? help)}
      </p>
    </div>
  );
}

function Duration({ id, label, value, onChange }: { id: string; label: string; value: { v: string; u: string }; onChange: (v: { v: string; u: string }) => void }) {
  const { t: tr } = useI18n();

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="field flex overflow-hidden">
        <input id={id} inputMode="decimal" value={value.v} onChange={(e) => onChange({ ...value, v: e.target.value })}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono outline-none" />
        <select aria-label={tr("{p0} Einheit", { p0: label })} value={value.u} onChange={(e) => onChange({ ...value, u: e.target.value })}
          className="border-l bg-secondary px-2 text-sm text-secondary-foreground outline-none">
          {DURATION_UNITS.map((d) => <option key={d.id} value={d.id}>{tr(d.label)}</option>)}
        </select>
      </div>
    </div>
  );
}

function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return <section className="min-w-0 border-t" aria-label={title}>
    <details className="group">
      <summary className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-5 text-base font-semibold"><h2 className="min-w-0">{title}</h2><ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
      <div className="pb-5">{right && <div className="mb-4 flex justify-end">{right}</div>}{children}</div>
    </details>
  </section>;
}

function Big({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}