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
    expect(screen.getByText("Kaufpreis")).toBeInTheDocument();
    expect(screen.getByText("Bonus nach dem Kauf")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Auf dem Spielbrett stehen die bereits aktiven Boni. Der Button darunter zeigt den Kaufpreis des nächsten Milestones.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Unbekannt").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /^M11 4,7 Sx$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^M12 66 Sp$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^M13 2,2 Oc$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^M14 5,3 Oc$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^M15 4,1 No$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^M16 39 No$/ })).toBeInTheDocument();
    expect(screen.getByText("More Threads")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Thread Mark" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader", { name: "Base MPS" })).toHaveLength(2);
    expect(screen.queryByText("310.08M")).not.toBeInTheDocument();
    expect(screen.queryByText("5.5Qa")).not.toBeInTheDocument();
    expect(screen.getByText("×5 Soul Threads · ^1.0015 Qi")).toBeInTheDocument();
  });

  it("lets players enter their own Soul Threads upgrade levels", () => {
    mount();
    const level = screen.getByLabelText("Soul Threads More Threads Aktuelles Level");
    fireEvent.change(level, { target: { value: "18" } });
    expect(level).toHaveValue(18);
    expect(screen.getByText("×112,46 Threads")).toBeInTheDocument();
    expect(screen.getByText("×146,19")).toBeInTheDocument();
    expect(screen.getByText("251,76 T Th.")).toBeInTheDocument();
  });

  it("calculates the video-validated Soul Threads reset yield", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Soul Threads More Threads Aktuelles Level"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Im Run erzeugte Ashes"), {
      target: { value: "56.11" },
    });
    fireEvent.change(screen.getByLabelText("Im Run erzeugte Ashes Einheit"), {
      target: { value: "T" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Soulbrand/ }));
    expect(screen.getByTestId("soul-thread-yield")).toHaveTextContent("3,62 B Threads");

    fireEvent.change(screen.getByLabelText("Dein Thread-Ziel"), {
      target: { value: "8.1" },
    });
    fireEvent.change(screen.getByLabelText("Dein Thread-Ziel Einheit"), {
      target: { value: "B" },
    });
    expect(screen.getByTestId("soul-thread-required-ashes")).toHaveTextContent("280,32 T Ashes");
  });

  it("turns the reset calculation into a concrete farm and reset plan", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Aktuelle Karmic Ashes"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Ashes pro Angriff"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Ashes pro Angriff Einheit"), {
      target: { value: "T" },
    });
    fireEvent.change(screen.getByLabelText("Cooldown (Sekunden)"), {
      target: { value: "1" },
    });
    for (const [name, value] of [
      ["Ashes Boost Aktuelles Level", "50"],
      ["More Ashes Aktuelles Level", "30"],
      ["Punch Speed Aktuelles Level", "25"],
    ])
      fireEvent.change(screen.getByLabelText(name), { target: { value } });
    fireEvent.change(screen.getByLabelText("Soul Threads More Threads Aktuelles Level"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Im Run erzeugte Ashes"), {
      target: { value: "56.11" },
    });
    fireEvent.change(screen.getByLabelText("Im Run erzeugte Ashes Einheit"), {
      target: { value: "T" },
    });
    fireEvent.change(screen.getByLabelText("Dein Thread-Ziel"), {
      target: { value: "8.1" },
    });
    fireEvent.change(screen.getByLabelText("Dein Thread-Ziel Einheit"), {
      target: { value: "B" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Soulbrand/ }));
    expect(screen.getByTestId("soul-thread-advisor")).toHaveTextContent(
      "Farme noch 224,21 T Run-Ashes, dann resetten",
    );
    expect(screen.getByTestId("soul-thread-advisor")).toHaveTextContent(
      "Dann resetten für ungefähr 8,1 B Threads",
    );
  });

  it("calculates tiered Thread Mark chances from the displayed board values", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "threads" } });
    fireEvent.change(screen.getByLabelText("Mark"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Angezeigte Luck"), {
      target: { value: "253.92" },
    });
    fireEvent.change(screen.getByLabelText("Angezeigte Luck Einheit"), {
      target: { value: "M" },
    });
    fireEvent.change(screen.getByLabelText("Angezeigte MPS"), {
      target: { value: "88.04" },
    });
    fireEvent.change(screen.getByLabelText("Angezeigte MPS Einheit"), {
      target: { value: "Qa" },
    });
    fireEvent.change(screen.getByLabelText("Copy / Clone"), { target: { value: "5" } });
    expect(screen.getByTestId("mark-chance")).toHaveTextContent("1 / 2,56");
    expect(screen.getByTestId("mark-result")).toHaveTextContent("Copies pro Sekunde");
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
    fireEvent.click(screen.getByRole("button", { name: /^M2 4 K$/ }));
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
    fireEvent.click(screen.getByRole("button", { name: /M9 220 Qa/i }));
    expect(screen.getByTestId("samsara-recommendation")).toHaveTextContent(
      "Direkt für Milestone 9 sparen",
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
    fireEvent.click(screen.getByRole("button", { name: /M10 2,4 Sx/i }));

    expect(screen.getByTestId("samsara-next-purchase-time")).toHaveTextContent(/^6 Minuten/);
    expect(screen.getByTestId("samsara-total-target-time")).toHaveTextContent(/^1 Stunde/);
    expect(screen.getByTestId("samsara-recommendation")).toHaveTextContent(
      "Die Gesamtzeit bezieht sich auf das Endziel M10 · 2,4 Sx, nicht auf den Kaufpreis.",
    );
  });
});
