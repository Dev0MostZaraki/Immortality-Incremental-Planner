import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "./LanguageProvider";
import { SamsaraWorld10 } from "./SamsaraWorld10";

const mount = () =>
  render(
    <LanguageProvider>
      <SamsaraWorld10 />
    </LanguageProvider>,
  );

describe("Samsara World 10 module", () => {
  beforeEach(() => localStorage.clear());

  it("shows verified data and explicitly marks unknown mechanics", () => {
    mount();
    expect(screen.getByRole("heading", { name: "Samsara" })).toBeInTheDocument();
    expect(screen.getByText("Karmic Milestones")).toBeInTheDocument();
    expect(screen.getAllByText("Unbekannt").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /^M11 66 Sp$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^M12 2,2 Oc$/ })).toBeInTheDocument();
    expect(screen.getByText("More Threads")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Thread Mark" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Aktuelle Kartenchance" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Benötigte Base MPS" })).toBeInTheDocument();
    expect(screen.getByText("×5 Soul Threads · ^1.0015 Qi")).toBeInTheDocument();
  });

  it("compares upgrades and creates a purchase route from player inputs", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Aktuelle Karmic Ashes"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Ashes pro Angriff"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Ashes pro Angriff Einheit"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Cooldown (Sekunden)"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /^M1 4 K$/ }));
    expect(screen.getByTestId("samsara-route")).toBeInTheDocument();
    expect(screen.getAllByText("Für dieses Ziel kaufen").length).toBeGreaterThan(0);
  });

  it("calculates Ashes per second from the two displayed game values", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Ashes pro Angriff"), { target: { value: "24.16" } });
    fireEvent.change(screen.getByLabelText("Cooldown (Sekunden)"), {
      target: { value: "0.09" },
    });
    expect(screen.getByTestId("samsara-rate")).not.toHaveTextContent("–");
    expect(screen.queryByText("Ashes-Rate messen (empfohlen)")).not.toBeInTheDocument();
  });

  it("surfaces one clear next step instead of competing recommendations", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Aktuelle Karmic Ashes"), {
      target: { value: "215" },
    });
    fireEvent.change(screen.getByLabelText("Aktuelle Karmic Ashes Einheit"), {
      target: { value: "Qa" },
    });
    fireEvent.change(screen.getByLabelText("Ashes pro Angriff"), {
      target: { value: "24.16" },
    });
    fireEvent.change(screen.getByLabelText("Cooldown (Sekunden)"), {
      target: { value: "0.09" },
    });
    fireEvent.change(screen.getByLabelText("Ashes Boost Aktuelles Level"), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText("More Ashes Aktuelles Level"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Punch Speed Aktuelles Level"), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: /M8 220 Qa/i }));
    expect(screen.getByTestId("samsara-recommendation")).toHaveTextContent(
      "Direkt für Milestone 8 sparen",
    );
    expect(screen.queryByText("Bester einzelner Kauf")).not.toBeInTheDocument();
  });

  it("separates the short wait for the next purchase from the final target time", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Aktuelle Karmic Ashes"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText("Aktuelle Karmic Ashes Einheit"), {
      target: { value: "Qi" },
    });
    fireEvent.change(screen.getByLabelText("Ashes pro Angriff"), {
      target: { value: "31" },
    });
    fireEvent.change(screen.getByLabelText("Ashes pro Angriff Einheit"), {
      target: { value: "Qa" },
    });
    fireEvent.change(screen.getByLabelText("Cooldown (Sekunden)"), {
      target: { value: "0.09" },
    });
    fireEvent.change(screen.getByLabelText("Ashes Boost Aktuelles Level"), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText("More Ashes Aktuelles Level"), {
      target: { value: "23" },
    });
    fireEvent.change(screen.getByLabelText("Punch Speed Aktuelles Level"), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: /M9 2,4 Sx/i }));

    expect(screen.getByTestId("samsara-next-purchase-time")).toHaveTextContent(/^6 Minuten/);
    expect(screen.getByTestId("samsara-total-target-time")).toHaveTextContent(/^1 Stunde/);
    expect(screen.getByTestId("samsara-recommendation")).toHaveTextContent(
      "Die Gesamtzeit bezieht sich auf das Endziel M9 · 2,4 Sx, nicht auf den Kaufpreis.",
    );
  });
});
