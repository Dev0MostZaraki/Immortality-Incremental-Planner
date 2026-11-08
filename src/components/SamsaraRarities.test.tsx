import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "./LanguageProvider";
import { SamsaraRarities } from "./SamsaraRarities";

const mount = () =>
  render(
    <LanguageProvider>
      <SamsaraRarities />
    </LanguageProvider>,
  );

describe("Samsara Rarities and Forge planner", () => {
  beforeEach(() => localStorage.clear());

  it("shows confirmed data separately from unknown mechanics", () => {
    mount();
    expect(screen.getByRole("heading", { name: "Rarity & Forge Planner" })).toBeInTheDocument();
    expect(screen.getAllByText("60 B Deepstones").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unbekannt").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Der zusätzliche ×2-Rarity-Luck-Bonus wird nicht eingerechnet/),
    ).toBeInTheDocument();
    expect(screen.getByText("Deinen Stand eintragen")).toBeInTheDocument();
    expect(screen.getByText("Deine Empfehlung")).toBeInTheDocument();
    expect(screen.getByText("Nur bei Bedarf nachschlagen")).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        Boolean(
          element?.tagName === "SPAN" &&
          element.textContent?.includes("Forge-Boni 1–9 · bekannte Kosten 1–5 & 8–9"),
        ),
      ),
    ).toBeInTheDocument();
  });

  it("shows the newly confirmed Forge 6–9 data without inventing missing costs", () => {
    mount();
    fireEvent.click(screen.getByText("Forge-Reihenfolge 1–10"));
    expect(screen.getByText("×10 Soul Threads · ×2 Path Speed · ^1.0022 Qi")).toBeInTheDocument();
    expect(screen.getByText("×5 Rarity Luck · ×10 Deepstones · ×1 Qitg Qi")).toBeInTheDocument();
    expect(screen.getByText("62 Qid Karmic Ashes")).toBeInTheDocument();
    expect(screen.getByText("×100 Karmic Ashes · ×2 Path Bulk · ^1.0006 Qi")).toBeInTheDocument();
    expect(screen.getByText("5 Td Soul Threads")).toBeInTheDocument();
    expect(
      screen.getByText("×5 Rarity Luck · ×2 Rarity Speed · ×10 Soul Threads · ×10 Tg Qi"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Teilweise")).toHaveLength(2);
  });

  it("shows player-facing Path goals without observed or standalone MAX fields", () => {
    mount();
    fireEvent.click(screen.getByText("Deepstone-Path-Ziele"));
    expect(screen.getAllByText("Basis-Chance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Copies bis volle Stufe").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Boni bei voller Stufe").length).toBeGreaterThan(0);
    expect(screen.getByText("500 K")).toBeInTheDocument();
    expect(screen.getByText("50 K")).toBeInTheDocument();
    expect(screen.getByText("5 K")).toBeInTheDocument();
    expect(screen.getByText("1 K")).toBeInTheDocument();
    expect(screen.getByText("1 / 800 Oc")).toBeInTheDocument();
    expect(screen.getByText("×2 Dao Path Speed · ^1.006 Qi · ×5 Rarity Luck")).toBeInTheDocument();
    expect(screen.getByText("1 / 4.9 Dc")).toBeInTheDocument();
    expect(screen.getByText("^1.0027 Qi · ×10 Deepstones · ×2 Rarity Speed")).toBeInTheDocument();
    expect(screen.queryByText("Beobachtete Chance")).not.toBeInTheDocument();
    expect(screen.queryByText("Beobachtete Copies")).not.toBeInTheDocument();
    expect(screen.queryByText(/^MAX$/)).not.toBeInTheDocument();
  });

  it("recommends the milestone when its sequential route is faster", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Aktuelle Deepstones"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Deepstones pro Sekunde"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Deepstones pro Sekunde Einheit"), {
      target: { value: "B" },
    });
    fireEvent.change(screen.getByLabelText("Karmic Ashes für Part-2-Milestone"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("Karmic Ashes für Part-2-Milestone Einheit"), {
      target: { value: "Td" },
    });
    const recommendation = screen.getByTestId("forge-route-recommendation");
    expect(recommendation).toHaveTextContent("Erst den 75-Td-Milestone holen");
    expect(recommendation).toHaveTextContent("1 Minute");
    expect(recommendation).toHaveTextContent("20 Sekunden");
  });

  it("does not apply the milestone twice after it was purchased", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Aktuelle Deepstones"), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText("Deepstones pro Sekunde"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Deepstones pro Sekunde Einheit"), {
      target: { value: "B" },
    });
    fireEvent.click(screen.getByRole("switch", { name: "75-Td-Milestone bereits gekauft" }));
    expect(screen.getByTestId("forge-route-recommendation")).toHaveTextContent(
      "Deine eingetragene Netto-Rate enthält den Milestone-Bonus bereits.",
    );
  });
});
