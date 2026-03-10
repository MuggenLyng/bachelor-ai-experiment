"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Step = "intro" | "freeText" | "done" | "invalid";


function FollowUpExperiment() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState<Step>(token ? "intro" : "invalid");
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [followUpDeviceType, setFollowUpDeviceType] = useState<string | null>(null);

  useEffect(() => {
    setFollowUpDeviceType(window.innerWidth < 768 ? "mobile" : "desktop");
  }, []);

  // Restore state from localStorage on mount
  useEffect(() => {
    if (!token) return;
    try {
      const saved = localStorage.getItem(`followup_${token}`);
      if (saved) {
        const { step: savedStep, freeText: savedFreeText } = JSON.parse(saved);
        if (savedStep) setStep(savedStep);
        if (savedFreeText) setFreeText(savedFreeText);
      }
    } catch {}
  }, []);

  // Save state to localStorage on every change
  useEffect(() => {
    if (!token || step === "invalid") return;
    try {
      localStorage.setItem(`followup_${token}`, JSON.stringify({ step, freeText }));
    } catch {}
  }, [step, freeText, token]);

  const freeTextWordCount = freeText.trim()
    ? freeText.trim().split(/\s+/).length
    : 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await fetch("/api/log-followup-study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        followUpFreeText: freeText,
        followUpFreeTextWordCount: freeTextWordCount,
        followUpDeviceType,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setStep("done");
    } else {
      const data = await res.json();
      if (data.error === "Already completed") {
        setStep("done");
      } else {
        console.error("log-followup-study failed:", data.error);
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Bachelor-eksperiment – Follow-up</h1>
        </header>

        {/* INVALID TOKEN */}
        {step === "invalid" && (
          <section className="bg-zinc-900 rounded-xl border p-6 border-zinc-800 space-y-3">
            <h2 className="text-lg font-semibold text-red-400">Ugyldigt link</h2>
            <p className="text-sm text-zinc-300">
              Dette link er ugyldigt eller udløbet. Tjek at du har brugt det korrekte link fra
              vores e-mail.
            </p>
            <p className="text-xs text-zinc-500">
              Spørgsmål? Kontakt lyngmagnus@gmail.com
            </p>
          </section>
        )}

        {/* INTRO */}
        {step === "intro" && (
          <section className="bg-zinc-900 rounded-xl border p-6 border-zinc-800 space-y-4">
            <h2 className="text-2xl font-bold text-zinc-50 text-center">
              Tak fordi du er tilbage! :)
            </h2>
            <p className="text-base text-zinc-200 leading-relaxed">
              Dette er follow-up delen af Magnus og Oles bacheloreksperiment. Det tager kun{" "}
              <span className="font-medium text-zinc-100">ca. 3–5 minutter</span>.
            </p>
            <p className="text-base text-zinc-200 leading-relaxed">
              Du vil blive bedt om at forklare emnet fra det første eksperiment med egne ord uden ingen hjælpemidler.
            </p>
            <p className="text-sm text-zinc-400">
              Svar så godt du kan, det er helt okay at have glemt detaljer.
            </p>
            <div className="flex justify-end pt-2">
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2"
                onClick={() => setStep("freeText")}
              >
                Start →
              </button>
            </div>
          </section>
        )}

        {/* FREE TEXT */}
        {step === "freeText" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-4">
            <h2 className="text-lg font-semibold text-center">Forklar med egne ord</h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Forklar med egne ord, hvordan mRNA-vacciner virker. Skriv så meget du kan uden
               hjælpemidler.
            </p>
            <textarea
              className="w-full rounded-lg bg-zinc-800 text-white px-3 py-2 outline-none placeholder:text-zinc-500 resize-none h-44"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Skriv her..."
            />
            <p className="text-xs text-zinc-400">
              Ord: {freeTextWordCount} (skriv minimum 50 ord)
            </p>
            <div className="flex justify-end">
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2 disabled:opacity-40"
                disabled={freeTextWordCount < 50 || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Gemmer..." : "Afslut →"}
              </button>
            </div>
          </section>
        )}

        {/* DONE */}
        {step === "done" && (
          <section className="bg-zinc-900 rounded-xl border p-6 border-zinc-800 space-y-4">
            <h2 className="text-2xl font-bold text-zinc-50 text-center">Tusind tak!</h2>
            <p className="text-base text-zinc-200 leading-relaxed">
              Du har nu gennemført follow-up studiet. Dine svar er gemt og bidrager enormt til
              vores bachelorprojekt og dermed til viden om, hvordan man bedst bruger Generativ AI!
            </p>
            <p className="text-base text-zinc-200 leading-relaxed">
              Vi trækker lod om{" "}
              <span className="font-medium text-green-400">10 gavekort på 100 kr.</span> inden
              for de næste dage og kontakter vinderne (måske dig?!) på e-mail.
            </p>
            <p className="text-sm text-zinc-400">— Ole og Magnus</p>
            <p className="text-sm text-zinc-400 italic">
              PS.!
              <br/> Hvis i har nogle spørgsmål kan i evt. kontakte os på:<br/>
              lyngmagnus@gmail.com<br/>
              ole-thomassen@hotmail.com
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

export default function FollowUpPage() {
  return (
    <Suspense fallback={<div className="p-10 text-zinc-400">Loader...</div>}>
      <FollowUpExperiment />
    </Suspense>
  );
}
