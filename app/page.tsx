"use client";

import { useEffect, useRef, useState } from "react";

type Step =
  | "consent"
  | "demographics"
  | "pretest"
  | "read"
  | "zpd"
  | "chat"
  | "chatSurvey"
  | "freeText"
  | "learningSurvey"
  | "done";

type Group = "control" | "intervention";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_DURATION = 5 * 60; // 300 sekunder

const PRETEST_QUESTIONS = [
  {
    question:
      "Hvis en person begynder at motionere betydeligt mere end før, hvad vil der sandsynligvis ske med personens samlede energiforbrug (TEE)?",
    options: [
      "Det vil stige proportionalt med mængden af motion",
      "Det vil stige, men ikke nødvendigvis proportionalt",
      "Det vil falde",
      "Det vil være helt uændret",
    ],
    correct: 1,
  },
  {
    question:
      "Hvad udgør typisk den største del af en persons daglige energiforbrug?",
    options: [
      "Fysisk aktivitet",
      "Fordøjelse af mad",
      "Basal metabolic rate (BMR)",
      "Hjernens aktivitet",
    ],
    correct: 2,
  },
  {
    question:
      "Ifølge constrained energy model, hvad kan kroppen gøre, når en person øger sit aktivitetsniveau?",
    options: [
      "Øge energiindtaget automatisk",
      "Reducere energiforbruget i andre biologiske processer",
      "Forbrænde fedt hurtigere end normalt",
      "Øge BMR proportionalt med aktiviteten",
    ],
    correct: 1,
  },
  {
    question: "Hvad beskriver basal metabolic rate (BMR) bedst?",
    options: [
      "Energiforbrug under intens træning",
      "Energiforbrug i hvile til grundlæggende kropsfunktioner",
      "Energi kroppen bruger på fordøjelse",
      "Energi kroppen bruger til muskelopbygning",
    ],
    correct: 1,
  },
];

const EDUCATION_OPTIONS = [
  "Grundskole",
  "Gymnasial uddannelse (STX, HF, HTX, HHX)",
  "Erhvervsuddannelse",
  "Professionsbachelor",
  "Bachelor",
  "Kandidat",
  "PhD eller højere",
  "Andet",
];

const GENDER_OPTIONS = ["Mand", "Kvinde", "Andet"];

function generateUUID() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function loadSavedState(): Record<string, any> | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("experimentState");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [step, setStep] = useState<Step>("consent");
  const [consented, setConsented] = useState(false);
  const [consentedAge, setConsentedAge] = useState(false);

  const [group, setGroup] = useState<Group | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Demographics
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [education, setEducation] = useState("");

  // ZPD / baseline
  const [confidence, setConfidence] = useState<number | null>(null);

  // Pretest
  const [pretestAnswers, setPretestAnswers] = useState<(number | null)[]>([
    null, null, null, null,
  ]);

  // Chat
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Chat timer
  const chatStartTimeRef = useRef<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(CHAT_DURATION);

  // Timing refs
  const readStartTimeRef = useRef<number | null>(null);
  const readingTimeRef = useRef<number | null>(null);

  // Chat survey
  const [trust, setTrust] = useState<(number | null)[]>([null, null, null]);
  const [engagement, setEngagement] = useState<(number | null)[]>([null, null, null]);

  // Free text
  const [freeTextResponse, setFreeTextResponse] = useState("");

  // Follow-up / giveaway
  const [followUpEmail, setFollowUpEmail] = useState("");
  const [followUpSubmitted, setFollowUpSubmitted] = useState(false);

  // Device type
  const [deviceType, setDeviceType] = useState<string | null>(null);

  // Learning survey
  const [perceivedLearning, setPerceivedLearning] = useState<(number | null)[]>([
    null, null, null,
  ]);
  const [mentalEffort, setMentalEffort] = useState<number | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // Randomisering
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

  // Detect device type on mount
  useEffect(() => {
    setDeviceType(window.innerWidth < 768 ? "mobile" : "desktop");
  }, []);

  // Restore state from localStorage on mount (client-side only)
  useEffect(() => {
    const saved = loadSavedState();
    if (!saved) return;
    if (saved.step) setStep(saved.step);
    if (saved.consented) setConsented(saved.consented);
    if (saved.consentedAge) setConsentedAge(saved.consentedAge);
    if (saved.age) setAge(saved.age);
    if (saved.gender) setGender(saved.gender);
    if (saved.education) setEducation(saved.education);
    if (saved.confidence != null) setConfidence(saved.confidence);
    if (saved.pretestAnswers) setPretestAnswers(saved.pretestAnswers);
    if (saved.messages) setMessages(saved.messages);
    if (saved.chatStartTime) {
      chatStartTimeRef.current = saved.chatStartTime;
      const elapsed = Math.floor((Date.now() - saved.chatStartTime) / 1000);
      setTimeLeft(Math.max(0, CHAT_DURATION - elapsed));
    }
    if (saved.trust) setTrust(saved.trust);
    if (saved.engagement) setEngagement(saved.engagement);
    if (saved.freeTextResponse) setFreeTextResponse(saved.freeTextResponse);
    if (saved.perceivedLearning) setPerceivedLearning(saved.perceivedLearning);
    if (saved.mentalEffort != null) setMentalEffort(saved.mentalEffort);
    if (saved.followUpEmail) setFollowUpEmail(saved.followUpEmail);
    if (saved.followUpSubmitted) setFollowUpSubmitted(saved.followUpSubmitted);
  }, []);

  // Persist state to localStorage on every relevant change
  useEffect(() => {
    try {
      localStorage.setItem("experimentState", JSON.stringify({
        step, consented, consentedAge, age, gender, education, confidence, pretestAnswers,
        messages, chatStartTime: chatStartTimeRef.current,
        trust, engagement, freeTextResponse, perceivedLearning, mentalEffort,
        followUpEmail, followUpSubmitted,
      }));
    } catch {}
  }, [step, consented, consentedAge, age, gender, education, confidence, pretestAnswers,
      messages, trust, engagement, freeTextResponse, perceivedLearning,
      mentalEffort, followUpEmail, followUpSubmitted]);

  // Chat timer
  useEffect(() => {
    if (step !== "chat") return;

    if (chatStartTimeRef.current === null) {
      chatStartTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - chatStartTimeRef.current!) / 1000);
      setTimeLeft(Math.max(0, CHAT_DURATION - elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  if (!group || !participantId) {
    return <div className="p-10">Loader...</div>;
  }

  // --- Computed ---
  const pretestScore = pretestAnswers.reduce<number>((score, answer, i) => {
    return score + (answer === PRETEST_QUESTIONS[i].correct ? 1 : 0);
  }, 0);

  const freeTextWordCount = freeTextResponse.trim()
    ? freeTextResponse.trim().split(/\s+/).length
    : 0;

  const chatTimerDone = timeLeft === 0;

  const ageValid = age.trim() !== "" && !isNaN(Number(age)) && Number(age) > 0;
  const demographicsValid = ageValid && gender !== "" && education !== "";
  const zpdValid = confidence !== null;

  // --- UI helper ---
  const likertBtn = (
    value: number,
    current: number | null,
    onClick: (n: number) => void
  ) => (
    <button
      key={value}
      type="button"
      onClick={() => onClick(value)}
      className={`px-3 py-2 rounded-lg border text-sm ${
        current === value
          ? "bg-zinc-700 text-white border-zinc-600"
          : "bg-zinc-950 text-zinc-200 border-zinc-700 hover:bg-zinc-800"
      }`}
    >
      {value}
    </button>
  );

  // --- Chat ---
  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const text = chatInput;
    const userMessage: Message = { role: "user", content: text };
    const nextMessages: Message[] = [...messages, userMessage];

    setMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, group, confidence }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat request failed");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: String(data.reply ?? "Unknown error") },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Fejl: ${String(e?.message ?? e)}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- Logging ---
  const logBaseline = async () => {
    const res = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        group,
        age: Number(age),
        gender,
        education,
        deviceType,
        pretestQ1: pretestAnswers[0],
        pretestQ2: pretestAnswers[1],
        pretestQ3: pretestAnswers[2],
        pretestQ4: pretestAnswers[3],
        pretestScore,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      console.error("logBaseline failed:", data.error);
    }
  };

  const logZPD = async () => {
    const res = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        group,
        confidence,
        readingTime: readingTimeRef.current,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      console.error("logZPD failed:", data.error);
    }
  };

  const logChat = async () => {
    const chatDuration = chatStartTimeRef.current ? Date.now() - chatStartTimeRef.current : null;
    const res = await fetch("/api/log-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, messages, chatDuration }),
    });
    if (!res.ok) {
      const data = await res.json();
      console.error("logChat failed:", data.error);
    }
  };

  const logChatSurvey = async () => {
    const res = await fetch("/api/log-chat-survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        trust1: trust[0],
        trust2: trust[1],
        trust3: trust[2],
        engagement1: engagement[0],
        engagement2: engagement[1],
        engagement3: engagement[2],
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      console.error("logChatSurvey failed:", data.error);
    }
  };

  const logLearningSurvey = async () => {
    const res = await fetch("/api/log-learning-survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        freeTextResponse,
        freeTextWordCount,
        perceivedLearning1: perceivedLearning[0],
        perceivedLearning2: perceivedLearning[1],
        perceivedLearning3: perceivedLearning[2],
        mentalEffort,
        completed: true,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      console.error("logLearningSurvey failed:", data.error);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Bachelor-eksperiment</h1>
        </header>

        {/* CONSENT */}
        {step === "consent" && (
          <section className="bg-zinc-900 rounded-xl border p-6 border-zinc-800 space-y-5">
            {/* Welcome header */}
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-zinc-50 leading-snug">
                Velkommen til Magnus og Oles bacheloreksperiment!
              </h2>
              <p className="text-base text-zinc-200 leading-relaxed">
              Mange tak fordi du har lyst til at bruge lidt tid på dette eksperiment om GenAI og læring:) Det
                betyder virkelig meget for os!
              </p>
              <div>
                <p className="text-sm font-semibold text-zinc-100 mb-1">Strukturen af eksperimentet</p>
                <p className="text-base text-zinc-200 leading-relaxed">
                  Eksperimentet undersøger, hvordan generativ AI påvirker læring. Du vil læse en
                  kort tekst, besvare et par spørgsmål, chatte med en AI-assistent i ca. 5
                  minutter og til sidst svare på et kort spørgeskema. Det hele tager typisk{" "}
                  <span className="font-medium text-zinc-100">10-15 minutter</span>.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100 mb-1">Frivillig follow-up med giveaway!</p>
                <p className="text-base text-zinc-200 leading-relaxed">
                  Til sidst får du desuden mulighed for at deltage i et kort follow-up-eksperiment
                  ca. en uge fra testen.{" "}
                  <span className="font-medium text-green-300">
                  10 deltagere trækkes til at vinde 100 kr.
                  </span>{" "}
                </p>
              </div>
              <p className="text-sm text-zinc-400">
                Herunder finder du samtykke-erklæringen. Læs den kort igennem, inden du går videre.
              </p>
            </div>

            {/* Nested GDPR box */}
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 leading-relaxed overflow-hidden">
            <div className="overflow-y-auto max-h-72 p-4 space-y-3">
              <p className="font-semibold text-zinc-100 text-sm">
                Samtykke til deltagelse i forskningsstudie
              </p>

              <p>
                Du inviteres til at deltage i et kort forskningsstudie om læring og brug af
                AI-baserede chatbots. Studiet udføres som en del af et bachelorprojekt ved
                Københavns Universitet.
              </p>

              <div>
                <p className="font-medium text-zinc-200">Formål</p>
                <p>
                  Formålet er at undersøge, hvordan mennesker lærer gennem interaktion med en
                  AI-baseret chatbot efter at have læst en kort tekst.
                </p>
              </div>

              <div>
                <p className="font-medium text-zinc-200">Hvad indebærer deltagelse</p>
                <ul className="list-disc list-inside space-y-0.5 mt-0.5">
                  <li>Besvare korte spørgsmål om din baggrund (alder, køn, uddannelse)</li>
                  <li>Besvare en kort pretest</li>
                  <li>Læse en kort informationstekst</li>
                  <li>Besvare et spørgsmål om din forståelsesniveau</li>
                  <li>Chatte med en AI-assistent i ca. 5 minutter</li>
                  <li>Besvare spørgsmål om din oplevelse</li>
                  <li>Skrive en kort forklaring med egne ord</li>
                  <li>Besvare spørgsmål om din læring</li>
                  <li>Mulighed for at deltage i follow-up testen!</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-zinc-200">Hvilke data indsamles</p>
                <ul className="list-disc list-inside space-y-0.5 mt-0.5">
                  <li>Alder, køn og uddannelsesbaggrund</li>
                  <li>Svar på quiz og spørgeskemaer</li>
                  <li>Chatbeskeder mellem dig og AI-assistenten</li>
                  <li>En kort fritekstbesvarelse</li>
                  <li>Tekniske interaktionsdata (fx antal beskeder og tidsstempler)</li>
                </ul>
                <p className="mt-1">
                Dine svar gemmes under et pseudonymiseret deltager-ID. 
                Hvis du angiver en e-mail til follow-up studiet, bruges den kun til at sende 
                et opfølgningslink og slettes efter follow-up studiet er afsluttet.
                </p>
              </div>

              <div>
                <p className="font-medium text-zinc-200">Teknisk behandling af data</p>
                <p>
                  Studiet gennemføres via en webapplikation hostet hos Vercel. Dine svar gemmes i
                  en database (PostgreSQL) hos en cloud-udbyder.
                </p>
                <p className="mt-1">
                  Under chatdelen behandles beskeder af en AI-model via OpenAI's API. Kun de
                  oplysninger, du selv skriver i chatten eller i spørgeskemaet, sendes til disse
                  tjenester. Oplysningerne anvendes udelukkende til at gennemføre studiet og
                  anvendes ikke til træning af AI-modellen.
                </p>
                <p className="mt-1">
                  Undlad venligst at skrive personlige eller følsomme oplysninger i chatten.
                </p>
              </div>

              <div>
                <p className="font-medium text-zinc-200">Retsgrundlag</p>
                <p>
                  Dine personoplysninger behandles på baggrund af dit samtykke i henhold til
                  GDPR artikel 6, stk. 1, litra a.
                </p>
              </div>

              <div>
                <p className="font-medium text-zinc-200">Frivillighed</p>
                <p>
                  Deltagelse er helt frivillig. Du kan til enhver tid stoppe ved at lukke siden
                  uden negative konsekvenser. Du kan også trække dit samtykke tilbage ved at
                  kontakte os og få indsigt i din data ved efterspørgelse.
                </p>
              </div>

              <div>
                <p className="font-medium text-zinc-200">Opbevaring af data</p>
                <p>
                  Data opbevares pseudonymiseret og bruges udelukkende til forskningsformål i
                  forbindelse med bachelorprojektet. Data slettes eller anonymiseres senest
                  6 måneder efter projektets afslutning.
                </p>
              </div>

              <div>
                <p className="font-medium text-zinc-200">Dine rettigheder</p>
                <p>
                  Du har ret til indsigt i, rettelse og sletning af dine oplysninger samt ret
                  til at begrænse behandlingen. Du har desuden ret til at klage til{" "}
                  <span className="text-zinc-200">Datatilsynet</span> (datatilsynet.dk).
                </p>
              </div>

              <div>
                <p className="font-medium text-zinc-200">Dataansvarlig</p>
                <p>Magnus Lyng og Ole Thomassen, bachelorstuderende ved Københavns Universitet.</p>
              </div>

              <div>
                <p className="font-medium text-zinc-200">Kontakt</p>
                <p>Magnus Lyng: lyngmagnus@gmail.com <br /> Ole Thomassen: ole-thomassen@hotmail.com</p>
              </div>
            </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consentedAge}
                  onChange={(e) => setConsentedAge(e.target.checked)}
                />
                <span>Jeg bekræfter, at jeg er mindst 18 år.</span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                />
                <span>
                  Jeg har læst informationen ovenfor og giver samtykke til at deltage i studiet
                  og til behandling af mine oplysninger som beskrevet.
                </span>
              </label>
            </div>
            <div className="flex justify-end">
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2 disabled:opacity-40"
                disabled={!consented || !consentedAge}
                onClick={() => setStep("demographics")}
              >
                Næste →
              </button>
            </div>
          </section>
        )}

        {/* DEMOGRAPHICS */}
        {step === "demographics" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">Baggrundsspørgsmål</h2>
            <p className="text-sm opacity-90">
              Besvar disse korte spørgsmål om dig selv.
            </p>

            {/* Alder */}
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-100">Alder</p>
              <input
                type="number"
                min={10}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="fx 23"
                className="w-24 rounded-lg bg-zinc-800 text-white px-3 py-2 outline-none placeholder:text-zinc-500 text-sm"
              />
            </div>

            {/* Køn */}
            <div className="space-y-2">
              <p className="text-sm font-bold text-zinc-100">Køn</p>
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setGender(opt)}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      gender === opt
                        ? "bg-zinc-700 text-white border-zinc-600"
                        : "bg-zinc-950 text-zinc-200 border-zinc-700 hover:bg-zinc-800"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Uddannelse */}
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-100">Højeste fuldførte uddannelse</p>
              <select
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full max-w-xs rounded-lg bg-zinc-800 text-white px-3 py-2 outline-none text-sm"
              >
                <option value="">Vælg...</option>
                {EDUCATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between pt-2">
              <button
                className="rounded-lg border px-4 py-2 border-zinc-800 text-zinc-100"
                onClick={() => setStep("consent")}
              >
                ← Tilbage
              </button>
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2 disabled:opacity-40"
                disabled={!demographicsValid}
                onClick={() => setStep("pretest")}
              >
                Videre →
              </button>
            </div>
          </section>
        )}

        {/* PRETEST */}
        {step === "pretest" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">Pretest</h2>
            <p className="text-sm opacity-90">
              Besvar disse 4 spørgsmål. Svar/gæt dit bedste :) der er ingen konsekvenser.
            </p>

            {PRETEST_QUESTIONS.map((q, qi) => (
              <div key={qi} className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-3">
                <p className="text-sm font-bold text-zinc-100">
                  {qi + 1}) {q.question}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                        pretestAnswers[qi] === oi
                          ? "bg-zinc-700 border-zinc-600 text-white"
                          : "bg-zinc-950 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q${qi}`}
                        className="sr-only"
                        checked={pretestAnswers[qi] === oi}
                        onChange={() => {
                          const next = [...pretestAnswers];
                          next[qi] = oi;
                          setPretestAnswers(next);
                        }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-2">
              <button
                className="rounded-lg border px-4 py-2 border-zinc-800 text-zinc-100"
                onClick={() => setStep("demographics")}
              >
                ← Tilbage
              </button>
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2 disabled:opacity-40"
                disabled={pretestAnswers.some((a) => a === null)}
                onClick={async () => {
                  await logBaseline();
                  readStartTimeRef.current = Date.now();
                  setStep("read");
                }}
              >
                Videre →
              </button>
            </div>
          </section>
        )}

        {/* READ */}
        {step === "read" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-4">
            <h2 className="text-lg font-semibold text-center">Hvordan bruger kroppen energi?</h2>
            <p className="text-sm opacity-90">
              Læs teksten nedenfor grundigt — du får brug for den i næste trin.
            </p>
            <div className="rounded-lg bg-zinc-700 p-4 text-sm leading-relaxed opacity-90 space-y-3">
              <p>
                Kroppens energibalance kan forstås gennem forholdet mellem energiindtag (Energy
                Intake, EI) og energiforbrug (Total Energy Expenditure, TEE). Energiindtag kommer
                fra den mad og de drikkevarer, vi indtager, mens energiforbrug er den samlede
                mængde energi kroppen bruger i løbet af dagen.
              </p>
              <p>
                Hvis en person indtager mere energi (EI), end kroppen bruger (TEE), lagres
                overskydende energi i kroppen som energidepoter, for eksempel fedt. Hvis kroppen
                derimod bruger mere energi, end man indtager, vil den trække på disse depoter,
                hvilket over tid kan føre til vægttab. Denne relation kan udtrykkes som: ændring
                i energidepoter = EI − TEE.
              </p>
              <p>
                En stor del af energiforbruget kommer fra basal metabolic rate (BMR), som er den
                energi kroppen bruger i hvile til grundlæggende funktioner som vejrtrækning,
                blodcirkulation og regulering af kropstemperatur. Derudover bruges energi på
                fysisk aktivitet, for eksempel når man går, træner eller udfører daglige opgaver.
              </p>
              <p>
                Man kunne derfor forvente, at mere fysisk aktivitet lineært øger det samlede
                energiforbrug. Forskning tyder dog på, at kroppen delvist kan tilpasse sit
                energiforbrug. Ifølge den såkaldte constrained energy model kan kroppen reducere
                energiforbruget i andre biologiske processer, når aktivitetsniveauet stiger.
              </p>
              <p>
                Det betyder, at det samlede energiforbrug ikke nødvendigvis stiger proportionalt
                med mængden af motion. Kroppen kan i stedet kompensere ved at bruge mindre energi
                på andre processer. Derfor kan effekten af øget fysisk aktivitet på energiforbrug
                og vægttab være mindre, end man umiddelbart skulle tro.
              </p>
            </div>
            <div className="flex justify-between">
              <button
                className="rounded-lg border px-4 py-2 border-zinc-800"
                onClick={() => setStep("pretest")}
              >
                ← Tilbage
              </button>
              <button
                className="rounded-lg bg-black text-white px-4 py-2"
                onClick={() => {
                  if (readStartTimeRef.current) {
                    readingTimeRef.current = Date.now() - readStartTimeRef.current;
                  }
                  setStep("zpd");
                }}
              >
                Videre →
              </button>
            </div>
          </section>
        )}

        {/* ZPD */}
        {step === "zpd" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">Selvsikkerhed</h2>
            <p className="text-sm opacity-90">
              Et kort spørgsmål om dit udgangspunkt efter teksten.
            </p>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-2">
              <p className="text-sm text-zinc-100">
                Hvor sikker føler du dig på at kunne forklare teksten lige nu?
              </p>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((n) => likertBtn(n, confidence, setConfidence))}
              </div>
              <p className="text-xs text-zinc-400">1 = slet ikke sikker · 5 = meget sikker</p>
            </div>

            <div className="flex justify-between pt-2">
              <button
                className="rounded-lg border px-4 py-2 border-zinc-800 text-zinc-100"
                onClick={() => setStep("read")}
              >
                ← Tilbage
              </button>
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2 disabled:opacity-40"
                disabled={!zpdValid}
                onClick={async () => {
                  await logZPD();
                  setMessages([{
                    role: "assistant",
                    content: "Du har nu læst teksten. Hvad vil du gerne have hjælp til at forstå bedre?",
                  }]);
                  setStep("chat");
                }}
              >
                Start chat →
              </button>
            </div>
          </section>
        )}

        {/* CHAT */}
        {step === "chat" && (
          <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Chat</h2>
              <div
                className={`text-sm font-mono px-3 py-1 rounded-lg border ${
                  chatTimerDone
                    ? "border-green-700 bg-green-950 text-green-400"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300"
                }`}
              >
                {chatTimerDone ? "Klar til at gå videre" : formatTime(timeLeft)}
              </div>
            </div>
            <p className="text-sm text-zinc-400">
              Stil spørgsmål til teksten du netop har læst. AI'en kan hjælpe dig med at forstå den bedre. Du kan gå videre efter 5 minutter.
            </p>
            <p className="text-xs text-zinc-500">
              Undlad venligst at skrive personlige eller følsomme oplysninger i chatten.
            </p>

            <div className="flex flex-col h-[55vh] rounded-xl border border-zinc-800 overflow-hidden">
              <div className="flex-1 overflow-y-auto bg-zinc-900 p-4 space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[78%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto bg-zinc-700 text-white"
                        : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {chatLoading && (
                  <div className="bg-zinc-800 text-zinc-400 px-4 py-2 rounded-2xl w-fit text-sm">
                    Skriver...
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-zinc-800 bg-zinc-950 p-3 flex gap-2">
                <input
                  className="flex-1 min-w-0 rounded-lg bg-zinc-800 text-white px-3 py-2 outline-none placeholder:text-zinc-500"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Skriv en besked..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button
                  className="rounded-lg bg-zinc-700 text-white px-4 py-2 disabled:opacity-40"
                  disabled={!chatInput.trim() || chatLoading}
                  onClick={sendMessage}
                >
                  Send
                </button>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-100"
                onClick={() => setStep("zpd")}
              >
                ← Tilbage
              </button>
              <div className="flex items-center gap-3">
                {/* DEV ONLY — fjern inden produktion */}
                {process.env.NODE_ENV === "development" && (
                  <button
                    className="text-xs text-zinc-500 underline"
                    onClick={() => setTimeLeft(0)}
                  >
                    skip timer (dev)
                  </button>
                )}
                <button
                  className="rounded-lg bg-zinc-700 text-white px-4 py-2 disabled:opacity-40"
                  disabled={!chatTimerDone}
                  onClick={async () => {
                    await logChat();
                    setStep("chatSurvey");
                  }}
                >
                  Færdig med chat →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* CHAT SURVEY */}
        {step === "chatSurvey" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">Oplevelse af chatten</h2>
            <p className="text-sm opacity-90">
              Besvar disse spørgsmål om din oplevelse af chatten.
            </p>

            <div className="space-y-3">
              <p className="text-base font-bold text-zinc-100">Tillid</p>
              {[
                "Jeg kunne stole på chatbotens forklaringer.",
                "Chatbotten virkede fagligt kompetent.",
                "Jeg følte mig tryg ved at bruge chatbotten som hjælp i denne opgave.",
              ].map((q, qi) => (
                <div key={qi} className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-2">
                  <p className="text-sm text-zinc-100">{q}</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) =>
                      likertBtn(n, trust[qi], (val) => {
                        const next = [...trust];
                        next[qi] = val;
                        setTrust(next);
                      })
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">1 = helt uenig · 5 = helt enig</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-base font-bold text-zinc-100">Engagement</p>
              {[
                "Jeg var engageret i samtalen med chatbotten.",
                "Chatten fik mig til at tænke aktivt over emnet.",
                "Jeg havde lyst til at fortsætte arbejdet med emnet under chatten.",
              ].map((q, qi) => (
                <div key={qi} className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-2">
                  <p className="text-sm text-zinc-100">{q}</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) =>
                      likertBtn(n, engagement[qi], (val) => {
                        const next = [...engagement];
                        next[qi] = val;
                        setEngagement(next);
                      })
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">1 = helt uenig · 5 = helt enig</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <button
                className="rounded-lg border px-4 py-2 border-zinc-800 text-zinc-100"
                onClick={() => setStep("chat")}
              >
                ← Tilbage
              </button>
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2 disabled:opacity-40"
                disabled={
                  trust.some((v) => v === null) || engagement.some((v) => v === null)
                }
                onClick={async () => {
                  await logChatSurvey();
                  setStep("freeText");
                }}
              >
                Videre →
              </button>
            </div>
          </section>
        )}

        {/* FREE TEXT */}
        {step === "freeText" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-4">
            <h2 className="text-lg font-semibold text-center">Anvend teksten i et scenarie</h2>
            <p className="text-sm opacity-90">
              En person begynder at motionere meget mere end før, men oplever, at vægttabet er
              mindre end forventet.
            </p>
            <p className="text-sm opacity-90">
              Forklar med egne ord, hvorfor dette kan ske ud fra modellen i teksten.
            </p>
            <textarea
              className="w-full rounded-lg bg-zinc-800 text-white px-3 py-2 outline-none placeholder:text-zinc-500 resize-none h-40"
              value={freeTextResponse}
              onChange={(e) => setFreeTextResponse(e.target.value)}
              placeholder="Skriv her..."
            />
            <p className="text-xs text-zinc-400">
              Ord: {freeTextWordCount} (skriv minimum 50 ord)
            </p>
            <div className="flex justify-between">
              <button
                className="rounded-lg border px-4 py-2 border-zinc-800 text-zinc-100"
                onClick={() => setStep("chatSurvey")}
              >
                ← Tilbage
              </button>
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2 disabled:opacity-40"
                disabled={freeTextWordCount < 50}
                onClick={() => setStep("learningSurvey")}
              >
                Videre →
              </button>
            </div>
          </section>
        )}

        {/* LEARNING SURVEY */}
        {step === "learningSurvey" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">Afsluttende spørgsmål</h2>
            <p className="text-sm opacity-90">
              Besvar disse spørgsmål om din oplevelse og indsats.
            </p>

            <div className="space-y-3">
              <p className="text-base font-bold text-zinc-100">Oplevet læring</p>
              {[
                "Jeg føler, at jeg forstår emnet bedre nu.",
                "Chatten hjalp mig med at lære noget vigtigt om emnet.",
                "Jeg føler mig bedre i stand til at forklare emnet med mine egne ord.",
              ].map((q, qi) => (
                <div key={qi} className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-2">
                  <p className="text-sm text-zinc-100">{q}</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) =>
                      likertBtn(n, perceivedLearning[qi], (val) => {
                        const next = [...perceivedLearning];
                        next[qi] = val;
                        setPerceivedLearning(next);
                      })
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">1 = helt uenig · 5 = helt enig</p>
                </div>
              ))}
            </div>

            {/* Mental effort (Paas) */}
            <div className="space-y-3 pt-2">
              <p className="text-base font-bold text-zinc-100">Mental indsats</p>
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-2">
                <p className="text-sm text-zinc-100">
                  Hvor stor mental indsats brugte du på opgaven?
                </p>
                <div className="flex gap-1 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) =>
                    likertBtn(n, mentalEffort, setMentalEffort)
                  )}
                </div>
                <p className="text-xs text-zinc-400">1 = Meget lav · 9 = Meget høj</p>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                className="rounded-lg border px-4 py-2 border-zinc-800 text-zinc-100"
                onClick={() => setStep("freeText")}
              >
                ← Tilbage
              </button>
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2 disabled:opacity-40"
                disabled={
                  perceivedLearning.some((v) => v === null) || mentalEffort === null
                }
                onClick={async () => {
                  await logLearningSurvey();
                  setStep("done");
                }}
              >
                Afslut →
              </button>
            </div>
          </section>
        )}

        {/* DONE */}
        {step === "done" && (
          <section className="space-y-6 rounded-xl border p-6 border-zinc-800 bg-zinc-900">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-center">Tak fordi du ville være med!</h2>
              <p className="text-sm opacity-90 leading-relaxed">
                Det betyder så meget for os, at DU ville være med! Dine svar vil bidrage til vores
                bachelorprojekt i psykologi.
              </p>
              <p className="text-sm opacity-70">— Ole og Magnus</p>
              <p className="text-sm text-zinc-500 italic">
                Hvis i har nogle spørgsmål kan i evt. kontakte os på:<br/>
                lyngmagnus@gmail.com<br/>
                ole-thomassen@hotmail.com
              </p>
            </div>

            {/* Giveaway */}
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-green-300">
                  Vind 100 kr., hvis du tilmelder dig en kort follow-up test om en uge
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Vi trækker lod blandt de deltagere, der gennemfører follow-up testen. Skriv din
                  email nedenfor — du modtager en mail om ca. en uge med et link til en kort
                  follow-up test (5 min). Du er først med i lodtrækningen, når du har gennemført
                  den. Din email bruges kun til dette og knyttes ikke til dine øvrige svar.
                </p>
              </div>

              {followUpSubmitted ? (
                <p className="text-sm text-green-400">
                  Du er tilmeldt! Vi sender dig et link til follow-up studiet om cirka en uge, og kontakter dig selvfølgelig hvis du vinder :)
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={followUpEmail}
                    onChange={(e) => setFollowUpEmail(e.target.value)}
                    placeholder="din@email.dk"
                    className="flex-1 min-w-0 rounded-lg bg-zinc-950 text-white px-3 py-2 outline-none placeholder:text-zinc-500 text-sm border border-zinc-700"
                  />
                  <button
                    className="rounded-lg bg-zinc-700 text-white px-4 py-2 text-sm disabled:opacity-40 shrink-0"
                    disabled={!followUpEmail.includes("@")}
                    onClick={async () => {
                      const token = generateUUID();
                      const res = await fetch("/api/log-followup", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          participantId,
                          group,
                          email: followUpEmail,
                          followUpToken: token,
                        }),
                      });
                      if (res.ok) {
                        setFollowUpSubmitted(true);
                      } else {
                        const data = await res.json();
                        console.error("log-followup failed:", data.error);
                      }
                    }}
                  >
                    Tilmeld
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
