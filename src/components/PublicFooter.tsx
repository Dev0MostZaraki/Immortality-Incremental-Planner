import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { useI18n } from "./LanguageProvider";
import { ConfirmAction } from "./ConfirmAction";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "./ui/alert-dialog";
import { APP_VERSION, clearAppData, exportBackup, importBackup, parseBackup } from "@/lib/backup";

const GITHUB = "https://github.com/Dev0MostZaraki/Immortality-Incremental-Planner";
export function PublicFooter() {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const download = () => {
    try {
      const blob = new Blob([exportBackup(localStorage)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `immortality-planner-${APP_VERSION}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setFeedback("Daten exportiert.");
    } catch { setFeedback("Daten konnten nicht exportiert werden."); }
  };
  const reload = (message: string) => { setFeedback(message); setTimeout(() => window.location.reload(), 800); };
  return <footer className="mt-7 space-y-3 border-t pt-5 text-center text-xs text-muted-foreground">
    <p>{t("Berechnungen und Fortschritt werden lokal in deinem Browser gespeichert. Keine Anmeldung erforderlich.")}</p>
    <p>v{APP_VERSION} · {t("Law-Daten: Okt. 2026")} · {t("Inoffizielles Fan-Tool")}</p>
    <div className="flex flex-wrap justify-center gap-4"><a className="underline underline-offset-4" href={GITHUB} target="_blank" rel="noopener noreferrer">GitHub</a><a className="underline underline-offset-4" href={`${GITHUB}/issues`} target="_blank" rel="noopener noreferrer">{t("Fehler melden")}</a></div>
    <details className="mx-auto max-w-xl border-t pt-3">
      <summary className="cursor-pointer font-medium text-foreground">{t("Daten")}</summary>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={download}><Download />{t("JSON exportieren")}</Button>
        <Button variant="outline" size="sm" onClick={() => input.current?.click()}><Upload />{t("JSON importieren")}</Button>
        <ConfirmAction label={t("Alle lokalen Daten löschen")} description={t("Alle gespeicherten Eingaben, Law-Daten und die Spracheinstellung werden gelöscht. Exportiere vorher ein Backup, wenn du sie behalten möchtest.")} onConfirm={() => {
          try { clearAppData(localStorage); reload("Lokale Daten gelöscht."); } catch { setFeedback("Lokale Daten konnten nicht gelöscht werden."); }
        }} />
      </div>
      <input ref={input} type="file" accept=".json,application/json" className="hidden" aria-label={t("JSON importieren")} onChange={async (event) => {
        const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
        try { if (file.size > 1_000_000) throw new Error("Too large"); const raw = await file.text(); parseBackup(raw); setPending(raw); }
        catch { setFeedback("Ungültiges Backup. Bitte eine gültige v1.1.0-JSON-Datei auswählen."); }
      }} />
    </details>
    {feedback && <p role="status" aria-live="polite">{t(feedback)}</p>}
    <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null); }}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <AlertDialogTitle>{t("Backup importieren?")}</AlertDialogTitle>
        <AlertDialogDescription>{t("Das Backup ersetzt deine gespeicherten Eingaben, Law-Daten und Spracheinstellung.")}</AlertDialogDescription>
        <AlertDialogFooter><AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel><AlertDialogAction onClick={() => {
          if (pending === null) return;
          try { importBackup(pending, localStorage); reload("Backup importiert. Die Seite wird neu geladen."); }
          catch { setFeedback("Backup konnte nicht gespeichert werden."); }
        }}>{t("Importieren")}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </footer>;
}