import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "./LanguageProvider";
import { LawSynthesis } from "./LawSynthesis";
import { LAW_DEFAULTS, LAW_KEY } from "@/lib/law-state";

describe("Law Synthesis data controls", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);
  const mount = () => render(<LanguageProvider><LawSynthesis /></LanguageProvider>);
  it("per-law clear target preserves its current level", async () => {
    mount(); const card = screen.getByTestId("law-perception");
    fireEvent.change(within(card).getByLabelText("Aktuelles Level"), { target: { value: "5" } });
    fireEvent.change(within(card).getByLabelText("Ziel-Level"), { target: { value: "10" } });
    fireEvent.click(within(card).getByRole("button", { name: "Ziel entfernen" }));
    expect(within(card).getByLabelText("Aktuelles Level")).toHaveValue("5");
    expect(within(card).getByLabelText("Ziel-Level")).toHaveValue("5");
  });
  it("full reset changes nothing until confirmed, then restores law data", async () => {
    localStorage.setItem(LAW_KEY, JSON.stringify({ ...LAW_DEFAULTS, tab: "settings", inv: { ...LAW_DEFAULTS.inv, Lucent: "100" }, note: "my route", coreRate: "500", levels: { ...LAW_DEFAULTS.levels, perception: { cur: 6, tgt: 10 } } }));
    mount(); fireEvent.click(screen.getByRole("button", { name: "Alle Law-Daten zurücksetzen" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Core-Rate (optional)")).toHaveValue("500");
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.getByLabelText("Core-Rate (optional)")).toHaveValue("500");
    fireEvent.click(screen.getByRole("button", { name: "Alle Law-Daten zurücksetzen" }));
    fireEvent.click(screen.getByRole("button", { name: "Bestätigen" }));
    expect(screen.getByLabelText("Core-Rate (optional)")).toHaveValue("");
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(LAW_KEY) ?? "{}");
      expect(saved.levels.perception).toEqual({ cur: 0, tgt: 0 });
      expect(saved.inv.Lucent).toBe(""); expect(saved.note).toBe(""); expect(saved.check).toEqual({});
    });
  });
  it("route inventory shortcuts add exactly 1, 10 and 100", () => {
    mount(); fireEvent.click(screen.getByRole("button", { name: "Alle Ziele auf 10" }));
    for (const amount of [1, 10, 100]) fireEvent.click(screen.getByRole("button", { name: `${amount} Lucent hinzufügen` }));
    expect(document.getElementById("inv-r-Lucent")).toHaveValue("111");
    expect(document.getElementById("inv-Lucent")).toHaveValue("111");
  });
});