"use client";

import { useEffect, useMemo, useState } from "react";

type Step = "consent" | "read" | "chat" | "quiz" | "done";
type Group = "control" | "intervention";

function generateUUID() {
  // Fallback hvis crypto.randomUUID ikke findes (sjældent i moderne browsere)
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Home() {
  const [step, setStep] = useState<Step>("consent");
  const [consented, setConsented] = useState(false);

  const [group, setGroup] = useState<Group | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  useEffect(() => {
    const storedGroup = localStorage.getItem("group") as Group | null;
    const storedId = localStorage.getItem("participantId");

    if (storedGroup && storedId) {
      setGroup(storedGroup);
      setParticipantId(storedId);
      return;
    }

    const newGroup: Group = Math.random() < 0.5 ? "control" : "intervention";
    const newId = generateUUID();

    localStorage.setItem("group", newGroup);
    localStorage.setItem("participantId", newId);

    setGroup(newGroup);
    setParticipantId(newId);
  }, []);

  const groupLabel = useMemo(() => {
    if (!group) return "Loader...";
    return group === "control" ? "Kontrol" : "Intervention";
  }, [group]);

  if (!group || !participantId) {
    return <div className="p-10">Loader...</div>;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Bachelor-eksperiment</h1>
          <p className="text-sm opacity-80">
            Gruppe: <span className="font-medium">{groupLabel}</span> (test)
          </p>
          <p className="text-xs opacity-60">ID: {participantId}</p>
        </header>

        {step === "consent" && (
          <section className="space-y-4 rounded-xl border p-5">
            <h2 className="text-lg font-semibold">Samtykke</h2>
            <p className="text-sm opacity-90">
              Du deltager i et kort studie om læring med en AI-assistent. Dine
              svar gemmes anonymt. Du kan stoppe når som helst.
            </p>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
              />
              <span>Jeg giver samtykke til deltagelse og databehandling.</span>
            </label>

            <div className="flex justify-end">
              <button
                className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-40"
                disabled={!consented}
                onClick={() => setStep("read")}
              >
                Næste →
              </button>
            </div>
          </section>
        )}

        {step === "read" && (
          <section className="space-y-4 rounded-xl border p-5">
            <h2 className="text-lg font-semibold">Læs tekst (placeholder)</h2>
            <p className="text-sm opacity-90">
              Her indsætter I jeres læringstekst. Hold den kort (fx 400–800 ord).
            </p>

            <div className="rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-900">
              <p className="font-medium">Eksempeltekst:</p>
              <p className="mt-2">
                Inflation beskriver en generel stigning i prisniveauet over tid.
                Når inflationen stiger, falder købekraften af penge...
              </p>
            </div>

            <div className="flex justify-between">
              <button
                className="rounded-lg border px-4 py-2"
                onClick={() => setStep("consent")}
              >
                ← Tilbage
              </button>
              <button
                className="rounded-lg bg-black text-white px-4 py-2"
                onClick={() => setStep("chat")}
              >
                Videre til chat →
              </button>
            </div>
          </section>
        )}

        {step === "chat" && (
          <section className="space-y-4 rounded-xl border p-5">
            <h2 className="text-lg font-semibold">Chat (placeholder)</h2>
            <p className="text-sm opacity-90">Her skal vi senere koble til API.</p>

            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-900">
              <p className="font-medium">Foreløbig demo:</p>
              <p className="mt-2">
                {group === "control"
                  ? "Kontrol: ‘Du kan spørge mig om teksten.’"
                  : "Intervention: ‘Lad os bruge active recall. Fortæl med egne ord: hvad er inflation, og hvorfor opstår den?’"}
              </p>
            </div>

            <div className="flex justify-between">
              <button
                className="rounded-lg border px-4 py-2"
                onClick={() => setStep("read")}
              >
                ← Tilbage
              </button>
              <button
                className="rounded-lg bg-black text-white px-4 py-2"
                onClick={() => setStep("quiz")}
              >
                Videre til quiz →
              </button>
            </div>
          </section>
        )}

        {step === "quiz" && (
          <section className="space-y-4 rounded-xl border p-5">
            <h2 className="text-lg font-semibold">Quiz (placeholder)</h2>
            <p className="text-sm opacity-90">
              Her laver vi senere multiple choice + evt. Likert.
            </p>

            <div className="space-y-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-900">
              <p className="font-medium">Q1: Hvad betyder inflation bedst?</p>
              <label className="flex items-center gap-2">
                <input type="radio" name="q1" />
                <span>At priser generelt falder over tid</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="q1" />
                <span>At priser generelt stiger over tid</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="q1" />
                <span>At løn altid stiger hurtigere end priser</span>
              </label>
            </div>

            <div className="flex justify-between">
              <button
                className="rounded-lg border px-4 py-2"
                onClick={() => setStep("chat")}
              >
                ← Tilbage
              </button>
              <button
                className="rounded-lg bg-black text-white px-4 py-2"
                onClick={() => setStep("done")}
              >
                Afslut →
              </button>
            </div>
          </section>
        )}

        {step === "done" && (
          <section className="space-y-4 rounded-xl border p-5">
            <h2 className="text-lg font-semibold">Tak!</h2>
            <p className="text-sm opacity-90">Done.</p>
            <button
              className="rounded-lg border px-4 py-2"
              onClick={() => setStep("consent")}
            >
              Start forfra
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
