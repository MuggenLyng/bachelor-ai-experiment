"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { T, type Lang } from "@/lib/translations";

type Step = "intro" | "freeText" | "done" | "invalid";

function FollowUpExperiment() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState<Step>(token ? "intro" : "invalid");
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [followUpDeviceType, setFollowUpDeviceType] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("da");

  useEffect(() => {
    setFollowUpDeviceType(window.innerWidth < 768 ? "mobile" : "desktop");
    // Read language from localStorage — set when participant did the main experiment
    try {
      const stored = localStorage.getItem("lang");
      if (stored === "da" || stored === "en") setLang(stored);
    } catch {}
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

  const freeTextCharCount = freeText.length;
  const tx = T[lang].followup;

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await fetch("/api/log-followup-study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        followUpFreeText: freeText,
        followUpFreeTextWordCount: freeTextCharCount,
        followUpDeviceType,
        language: lang,
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
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{tx.appTitle}</h1>
          <div className="flex gap-1">
            {(["da", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => { setLang(l); try { localStorage.setItem("lang", l); } catch {} }}
                className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                  lang === l
                    ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                    : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {T[l].langToggle[l]}
              </button>
            ))}
          </div>
        </header>

        {/* INVALID TOKEN */}
        {step === "invalid" && (
          <section className="bg-zinc-900 rounded-xl border p-6 border-zinc-800 space-y-3">
            <h2 className="text-lg font-semibold text-red-400">{tx.invalidTitle}</h2>
            <p className="text-sm text-zinc-300">{tx.invalidText}</p>
            <p className="text-xs text-zinc-500">{tx.invalidContact}</p>
          </section>
        )}

        {/* INTRO */}
        {step === "intro" && (
          <section className="bg-zinc-900 rounded-xl border p-6 border-zinc-800 space-y-4">
            <h2 className="text-2xl font-bold text-zinc-50 text-center">{tx.introTitle}</h2>
            <p className="text-base text-zinc-200 leading-relaxed">
              {tx.introText.replace(tx.introHighlight, "")}
              <span className="font-medium text-zinc-100">{tx.introHighlight}</span>.
            </p>
            <p className="text-base text-zinc-200 leading-relaxed">{tx.introInstruction}</p>
            <p className="text-base text-green-400 font-bold text-center">{tx.introTeaser}</p>
            <div className="flex justify-end pt-2">
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2"
                onClick={() => setStep("freeText")}
              >
                {tx.startBtn}
              </button>
            </div>
          </section>
        )}

        {/* FREE TEXT */}
        {step === "freeText" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-4">
            <h2 className="text-lg font-semibold text-center">{tx.freeTextTitle}</h2>
            <p className="text-sm text-zinc-300 leading-relaxed">{tx.freeTextScenario}</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{tx.freeTextQuestion}</p>
            <textarea
              className="w-full rounded-lg bg-zinc-800 text-white px-3 py-2 outline-none placeholder:text-zinc-500 resize-none h-44"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={tx.placeholder}
            />
            <p className="text-xs text-zinc-400">{tx.charCount(freeTextCharCount)}</p>
            <div className="flex justify-end">
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2 disabled:opacity-40"
                disabled={freeTextCharCount < 250 || submitting}
                onClick={handleSubmit}
              >
                {submitting ? tx.savingBtn : tx.submitBtn}
              </button>
            </div>
          </section>
        )}

        {/* DONE */}
        {step === "done" && (
          <section className="bg-zinc-900 rounded-xl border p-6 border-zinc-800 space-y-4">
            <h2 className="text-2xl font-bold text-zinc-50 text-center">{tx.doneTitle}</h2>
            <p className="text-base text-zinc-200 leading-relaxed">{tx.doneText}</p>
            <p className="text-base text-zinc-200 leading-relaxed">
              {tx.doneDrawText.replace(tx.doneHighlight, "")}
              <span className="font-medium text-green-400">{tx.doneHighlight}</span>
              {tx.doneDrawText.split(tx.doneHighlight)[1]}
            </p>
            <p className="text-sm text-zinc-400">{tx.doneSignoff}</p>
            <p className="text-sm text-zinc-400 italic whitespace-pre-line">{tx.doneContact}</p>
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
