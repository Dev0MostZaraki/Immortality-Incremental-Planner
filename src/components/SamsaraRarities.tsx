import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Gem, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { UnitField, val, type NU } from "./planner-fields";
import { useI18n } from "./LanguageProvider";
import {
  DEEPSTONE_PATHS,
  DEEPSTONE_UPGRADE_SNAPSHOTS,
  FORGE_4_DEEPSTONE_COST,
  KNOWN_RARITY_CHECKPOINTS,
  PART_2_MILESTONE_ASHES_COST,
  RARITY_FORGES,
  compareForge4Routes,
} from "@/lib/samsara-rarities";
import {
  SAMSARA_RARITIES_DEFAULTS,
  SAMSARA_RARITIES_KEY,
  restoreSamsaraRarities,
  type SamsaraRaritiesState,
} from "@/lib/samsara-rarities-state";

export function SamsaraRarities() {
  const { t: tr, fmtSuffix, naturalDuration } = useI18n();
  const [state, setState] = useState<SamsaraRaritiesState>(SAMSARA_RARITIES_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAMSARA_RARITIES_KEY);
      if (raw) setState(restoreSamsaraRarities(raw));
    } catch {
      setStorageError(true);
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SAMSARA_RARITIES_KEY, JSON.stringify(state));
    } catch {
      setStorageError(true);
    }
  }, [loaded, state]);

  const set = <K extends keyof SamsaraRaritiesState>(key: K, value: SamsaraRaritiesState[K]) =>
    setState((current) => ({ ...current, [key]: value }));
  const currentDeepstones = val(state.currentDeepstones) ?? 0;
  const deepstonesPerSecond = val(state.deepstonesPerSecond);
  const currentAshes = val(state.currentAshes) ?? 0;
  const ashesPerSecond = val(state.ashesPerSecond);
  const comparison = useMemo(
    () =>
      compareForge4Routes({
        currentDeepstones,
        deepstonesPerSecond,
        currentAshes,
        ashesPerSecond,
        milestonePurchased: state.milestonePurchased,
      }),
    [
      ashesPerSecond,
      currentAshes,
      currentDeepstones,
      deepstonesPerSecond,
      state.milestonePurchased,
    ],
  );
  const duration = (seconds: number | null) => (seconds === null ? "–" : naturalDuration(seconds));
  const recommendation =
    comparison.recommendation === "ready"
      ? {
          title: tr("Forge 4 ist bereit"),
          body: tr("Du hast die benötigten 60 B Deepstones erreicht."),
        }
      : comparison.recommendation === "milestone"
        ? {
            title: tr("Erst den 75-Td-Milestone holen"),
            body: tr(
              "Mit deinen gemessenen Raten ist der Weg über den ×3-Deepstone-Bonus schneller.",
            ),
          }
        : comparison.recommendation === "direct"
          ? {
              title: state.milestonePurchased
                ? tr("Direkt auf Forge 4 farmen")
                : tr("Direkt 60 B Deepstones farmen"),
              body: state.milestonePurchased
                ? tr("Deine eingetragene Netto-Rate enthält den Milestone-Bonus bereits.")
                : tr("Der Umweg über 75 Td Ashes spart mit diesen Raten keine Zeit."),
            }
          : {
              title: tr("Netto-Raten ergänzen"),
              body: tr(
                "Trage deine tatsächlichen Deepstones pro Sekunde und – falls nötig – Karmic Ashes pro Sekunde ein.",
              ),
            };

  return (
    <section
      className="samsara-panel rarity-panel p-4 sm:p-6"
      aria-labelledby="rarity-planner-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rarity-icon" aria-hidden="true">
            <Gem />
          </span>
          <div>
            <p className="samsara-eyebrow">WORLD 10 · PART 2</p>
            <h3 id="rarity-planner-title" className="text-xl font-semibold">
              {tr("Rarity & Forge Planner")}
            </h3>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
              {tr(
                "Trage deinen aktuellen Stand ein, lies die Empfehlung und öffne Detaildaten nur dann, wenn du sie wirklich brauchst.",
              )}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="samsara-reset"
          onClick={() => setState(SAMSARA_RARITIES_DEFAULTS)}
        >
          <RotateCcw />
          {tr("Part-2-Eingaben zurücksetzen")}
        </Button>
      </div>

      <div className="rarity-usage-flow mt-5" aria-label={tr("So benutzt du den Planner")}>
        <article>
          <span>1</span>
          <div>
            <strong>{tr("Stand eingeben")}</strong>
            <small>{tr("Bestand und echte Netto-Raten aus dem Spiel.")}</small>
          </div>
        </article>
        <article>
          <span>2</span>
          <div>
            <strong>{tr("Empfehlung lesen")}</strong>
            <small>{tr("Eine klare Route statt mehrerer konkurrierender Tabellen.")}</small>
          </div>
        </article>
        <article>
          <span>3</span>
          <div>
            <strong>{tr("Details nachschlagen")}</strong>
            <small>{tr("Forge-, Upgrade- und Path-Daten bleiben eingeklappt.")}</small>
          </div>
        </article>
      </div>

      <div className="rarity-status-strip mt-4">
        <span>
          <CheckCircle2 aria-hidden="true" /> {tr("Dokumentiert")}:{" "}
          {tr("Forge-Boni 1–9 · bekannte Kosten 1–5 & 8–9")}
        </span>
        <span>
          <AlertTriangle aria-hidden="true" /> {tr("Forschungsbedarf")}:{" "}
          {tr("Forge-6/7-Kosten · Forge 10 · Luck-Formel · Kostenkurven")}
        </span>
      </div>

      <div className="rarity-section-heading mt-6">
        <span>1</span>
        <div>
          <h4>{tr("Deinen Stand eintragen")}</h4>
          <p>{tr("Übernimm Bestand und Netto-Zuwachs direkt aus dem Spiel.")}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <RarityField
          label={tr("Aktuelle Deepstones")}
          id="rarity-current-deepstones"
          value={state.currentDeepstones}
          onChange={(value) => set("currentDeepstones", value)}
        />
        <RarityField
          label={tr("Deepstones pro Sekunde")}
          id="rarity-deepstones-per-second"
          value={state.deepstonesPerSecond}
          onChange={(value) => set("deepstonesPerSecond", value)}
          suffix="/s"
        />
        <RarityField
          label={tr("Karmic Ashes für Part-2-Milestone")}
          id="rarity-current-ashes"
          value={state.currentAshes}
          onChange={(value) => set("currentAshes", value)}
        />
        <RarityField
          label={tr("Karmic Ashes pro Sekunde")}
          id="rarity-ashes-per-second"
          value={state.ashesPerSecond}
          onChange={(value) => set("ashesPerSecond", value)}
          suffix="/s"
        />
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={state.milestonePurchased}
        aria-label={tr("75-Td-Milestone bereits gekauft")}
        onClick={() => set("milestonePurchased", !state.milestonePurchased)}
        className={`rarity-milestone-switch mt-4 ${state.milestonePurchased ? "is-on" : "is-off"}`}
      >
        <span>
          <strong>{tr("75-Td-Milestone bereits gekauft")}</strong>
          <small>×2 Rarity Luck · ×3 Deepstones · ×1 T Qi</small>
        </span>
        <span>{state.milestonePurchased ? tr("Ja") : tr("Nein")}</span>
      </button>

      <div className="rarity-section-heading mt-6">
        <span>2</span>
        <div>
          <h4>{tr("Deine Empfehlung")}</h4>
          <p>{tr("Der Rechner zeigt nur die schnellere Route zu deinem nächsten Ziel.")}</p>
        </div>
      </div>

      <div
        className="samsara-recommendation mt-4"
        data-state={comparison.recommendation}
        data-testid="forge-route-recommendation"
      >
        <span className="samsara-recommendation-label">
          <Gem className="size-4" /> {tr("NÄCHSTER BESTER SCHRITT")}
        </span>
        <h4>{recommendation.title}</h4>
        <p>{recommendation.body}</p>
        <div className="samsara-recommendation-stats">
          <RarityStat
            label={tr("Noch benötigte Deepstones")}
            value={fmtSuffix(comparison.deepstonesNeeded)}
          />
          <RarityStat label={tr("Direkter Weg")} value={duration(comparison.directSeconds)} />
          {!state.milestonePurchased && (
            <>
              <RarityStat
                label={tr("Zeit bis 75 Td Ashes")}
                value={duration(comparison.milestoneFarmSeconds)}
              />
              <RarityStat
                label={tr("Gesamtzeit über Milestone")}
                value={duration(comparison.milestoneRouteSeconds)}
              />
            </>
          )}
        </div>
        {comparison.secondsSavedByMilestone !== null && comparison.secondsSavedByMilestone > 0 && (
          <p className="rarity-time-saving">
            {tr("Geschätzte Zeitersparnis: {p0}", {
              p0: naturalDuration(comparison.secondsSavedByMilestone),
            })}
          </p>
        )}
      </div>

      <div className="rarity-caveats mt-4">
        <p>
          <CheckCircle2 />
          {tr(
            "Der angezeigte ×3-Deepstone-Bonus wird genau einmal auf deine gemessene Netto-Rate angewendet.",
          )}
        </p>
        <p>
          <AlertTriangle />
          {tr(
            "Der zusätzliche ×2-Rarity-Luck-Bonus wird nicht eingerechnet, weil sein Einfluss auf Deepstones pro Sekunde unbekannt ist.",
          )}
        </p>
        <p>
          <AlertTriangle />
          {tr(
            "Nutze eine echte Netto-Messung. Eingeblendete Belohnungen pro Roll sind nicht automatisch dein Kontozuwachs pro Sekunde.",
          )}
        </p>
      </div>

      <div className="rarity-section-heading mt-6">
        <span>3</span>
        <div>
          <h4>{tr("Nur bei Bedarf nachschlagen")}</h4>
          <p>
            {tr("Forge-, Upgrade- und Path-Daten sind getrennt und standardmäßig eingeklappt.")}
          </p>
        </div>
      </div>

      <details className="samsara-details mt-4">
        <summary>
          <span>
            <strong>{tr("Forge-Reihenfolge 1–10")}</strong>
            <small>
              {tr("Bestätigte Kosten und Boni bleiben von unbekannten Stufen getrennt.")}
            </small>
          </span>
        </summary>
        <div className="overflow-x-auto border-t p-4">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 pr-3">Forge</th>
                <th className="pr-3">{tr("Kosten")}</th>
                <th className="pr-3">{tr("Boni")}</th>
                <th>{tr("Datenstatus")}</th>
              </tr>
            </thead>
            <tbody>
              {RARITY_FORGES.map((forge) => (
                <tr key={forge.id} className="border-t align-top">
                  <td className="py-3 pr-3 font-mono">{forge.id}</td>
                  <td className="pr-3 font-mono">
                    {forge.cost === "Unknown" ? tr("Unbekannt") : forge.cost}
                  </td>
                  <td className="pr-3">
                    {forge.bonuses
                      .map((bonus) => (bonus === "Unknown" ? tr("Unbekannt") : bonus))
                      .join(" · ")}
                  </td>
                  <td>
                    <span className={`rarity-data-status is-${forge.status}`}>
                      {forge.status === "confirmed"
                        ? tr("Bestätigt")
                        : forge.status === "partial"
                          ? tr("Teilweise")
                          : tr("Unbekannt")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="samsara-details mt-3">
        <summary>
          <span>
            <strong>{tr("Upgrade-Nachschlagewerte")}</strong>
            <small>{tr("Screenshot-Werte statt erfundener Kostenformeln.")}</small>
          </span>
        </summary>
        <div className="rarity-upgrade-grid border-t p-4">
          {DEEPSTONE_UPGRADE_SNAPSHOTS.map((upgrade) => (
            <article key={upgrade.name} className="rarity-data-card">
              <h4>{upgrade.name}</h4>
              <p>{tr("Stufen 0–{p0}", { p0: String(upgrade.cap) })}</p>
              <div className="overflow-x-auto">
                <table className="mt-3 w-full min-w-[26rem] text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="pb-2 pr-2">{tr("Level")}</th>
                      <th className="pr-2">{tr("Aktuell")}</th>
                      <th className="pr-2">{tr("Nächster")}</th>
                      <th>{tr("Kosten")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upgrade.rows.map(([level, current, next, cost]) => (
                      <tr key={level} className="border-t">
                        <td className="py-2 pr-2 font-mono">{level}</td>
                        <td className="pr-2 font-mono">{current}</td>
                        <td className="pr-2 font-mono">
                          {next === "Unknown" ? tr("Unbekannt") : next}
                        </td>
                        <td className="font-mono">{cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <small>{tr(upgrade.hypothesis)}</small>
            </article>
          ))}
        </div>
      </details>

      <details className="samsara-details mt-3">
        <summary>
          <span>
            <strong>{tr("Deepstone-Path-Ziele")}</strong>
            <small>
              {tr(
                "Basis-Chance, benötigte Copies und Boni bei voller Stufe – ohne persönliche Messwerte.",
              )}
            </small>
          </span>
        </summary>
        <div className="border-t p-4">
          <div className="rarity-path-grid">
            {DEEPSTONE_PATHS.map((path) => (
              <article key={path.name} className="rarity-path-card">
                <h4>{path.name}</h4>
                <dl>
                  <div>
                    <dt>{tr("Basis-Chance")}</dt>
                    <dd>{path.baseDisplay === "Unknown" ? tr("Unbekannt") : path.baseDisplay}</dd>
                  </div>
                  <div>
                    <dt>{tr("Copies bis volle Stufe")}</dt>
                    <dd>{path.copiesToFull === "Unknown" ? tr("Unbekannt") : path.copiesToFull}</dd>
                  </div>
                </dl>
                <div className="rarity-path-bonuses">
                  <span>{tr("Boni bei voller Stufe")}</span>
                  <p>
                    {path.bonuses
                      .map((bonus) => (bonus === "Unknown" ? tr("Unbekannt") : bonus))
                      .join(" · ")}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {tr("Bekannte Rarity-Checkpoints")}:{" "}
            {KNOWN_RARITY_CHECKPOINTS.map(([id, name]) => `#${id} ${name}`).join(" · ")}
          </p>
        </div>
      </details>

      <p className="mt-4 text-xs text-muted-foreground">
        {tr("Forge-4-Ziel")}:{" "}
        <strong className="font-mono">{fmtSuffix(FORGE_4_DEEPSTONE_COST)} Deepstones</strong>
        {" · "}
        {tr("Milestone-Ziel")}:{" "}
        <strong className="font-mono">{fmtSuffix(PART_2_MILESTONE_ASHES_COST)} Ashes</strong>
      </p>
      {storageError && (
        <p role="status" className="mt-3 text-xs text-destructive">
          {tr("Part-2-Eingaben konnten nicht lokal gespeichert werden.")}
        </p>
      )}
    </section>
  );
}

function RarityField({
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

function RarityStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong className="font-mono">{value}</strong>
    </div>
  );
}
