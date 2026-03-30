"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type Step =
  | "consent"
  | "demographics"
  | "read"
  | "pretest"
  | "zpd"
  | "chat"
  | "freeText"
  | "posttest"
  | "survey"
  | "done";

type Group = "control" | "intervention";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_DURATION = 3.5 * 60; // 210 sekunder
const READ_DURATION = 1 * 60; // 60 sekunder

const PRETEST_QUESTIONS = [
  {
    question:
      "En person træner meget, men taber sig kun lidt. Hvad er den bedste forklaring?",
    options: [
      "Kroppen kompenserer ved at spare energi andre steder",
      "Kroppen tilpasser sig, så den bruger mindre energi til de samme aktiviteter",
      "Personen har mistet muskelmasse",
      "Kroppen stopper med at bruge energi",
    ],
    correct: 0,
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
      "Hvad er betingelsen for, at kroppen begynder at trække på sine energidepoter?",
    options: [
      "At energiindtaget er lig med energiforbruget",
      "At energiforbruget overstiger energiindtaget",
      "At man øger sin fysiske aktivitet",
      "At BMR falder under et bestemt niveau",
    ],
    correct: 1,
  },
  {
    question:
      "Hvad afgør i sidste ende, om en person taber sig, når personen begynder at være mere fysisk aktiv?",
    options: [
      "Om mere motion altid betyder, at kroppen bruger tilsvarende mere energi",
      "Om energiindtaget over tid er lavere end det samlede energiforbrug",
      "Om kroppen stopper med at lagre energi",
      "Om BMR stiger mere end aktivitetsniveauet",
    ],
    correct: 1,
  },
];

function generateShuffledQuestions() {
  return PRETEST_QUESTIONS.map((q) => {
    const indices = q.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return {
      question: q.question,
      options: indices.map((i) => q.options[i]),
      correct: indices.indexOf(q.correct),
    };
  });
}

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

  // ZPD / baseline — GSE-3 (3 items, 1–5)
  const [selfEfficacy, setSelfEfficacy] = useState<(number | null)[]>([null]);

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
  const [readTimeLeft, setReadTimeLeft] = useState(READ_DURATION);
  const [showReadWarning, setShowReadWarning] = useState(false);
  const [showChatWarning, setShowChatWarning] = useState(false);
  const [showConsentWarning, setShowConsentWarning] = useState(false);
  const [showDemographicsWarning, setShowDemographicsWarning] = useState(false);
  const [showPretestWarning, setShowPretestWarning] = useState(false);
  const [showZpdWarning, setShowZpdWarning] = useState(false);
  const [showPosttestWarning, setShowPosttestWarning] = useState(false);
  const [showSurveyWarning, setShowSurveyWarning] = useState(false);

  // Timing refs
  const readStartTimeRef = useRef<number | null>(null);
  const readingTimeRef = useRef<number | null>(null);

  // EVT (Expectancy-Value Theory, logged with ZPD)
  const [evt, setEvt] = useState<(number | null)[]>([null, null, null]);

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

  // Posttest
  const [posttestAnswers, setPosttestAnswers] = useState<(number | null)[]>([null, null, null, null]);

  // Shuffled questions (randomized once per participant)
  const [shuffledQuestions, setShuffledQuestions] = useState<typeof PRETEST_QUESTIONS>([]);

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
    const ua = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    setDeviceType(isMobile ? "mobile" : "desktop");
  }, []);

  // Restore state from localStorage on mount (client-side only)
  useEffect(() => {
    const saved = loadSavedState();
    if (!saved) {
      setShuffledQuestions(generateShuffledQuestions());
      return;
    }
    if (saved.step) setStep(saved.step);
    if (saved.consented) setConsented(saved.consented);
    if (saved.consentedAge) setConsentedAge(saved.consentedAge);
    if (saved.age) setAge(saved.age);
    if (saved.gender) setGender(saved.gender);
    if (saved.education) setEducation(saved.education);
    if (saved.selfEfficacy) setSelfEfficacy(saved.selfEfficacy);
    if (saved.pretestAnswers) setPretestAnswers(saved.pretestAnswers);
    if (saved.posttestAnswers) setPosttestAnswers(saved.posttestAnswers);
    if (saved.messages) setMessages(saved.messages);
    if (saved.chatStartTime) {
      chatStartTimeRef.current = saved.chatStartTime;
      const elapsed = Math.floor((Date.now() - saved.chatStartTime) / 1000);
      setTimeLeft(Math.max(0, CHAT_DURATION - elapsed));
    }
    if (saved.evt) setEvt(saved.evt);
    if (saved.freeTextResponse) setFreeTextResponse(saved.freeTextResponse);
    if (saved.perceivedLearning) setPerceivedLearning(saved.perceivedLearning);
    if (saved.mentalEffort != null) setMentalEffort(saved.mentalEffort);
    if (saved.followUpEmail) setFollowUpEmail(saved.followUpEmail);
    if (saved.followUpSubmitted) setFollowUpSubmitted(saved.followUpSubmitted);
    if (saved.shuffledQuestions?.length === PRETEST_QUESTIONS.length) {
      setShuffledQuestions(saved.shuffledQuestions);
    } else {
      setShuffledQuestions(generateShuffledQuestions());
    }
  }, []);

  // Persist state to localStorage on every relevant change
  useEffect(() => {
    try {
      localStorage.setItem("experimentState", JSON.stringify({
        step, consented, consentedAge, age, gender, education, selfEfficacy, evt, pretestAnswers,
        posttestAnswers, messages, chatStartTime: chatStartTimeRef.current,
        freeTextResponse, perceivedLearning, mentalEffort,
        followUpEmail, followUpSubmitted, shuffledQuestions,
      }));
    } catch {}
  }, [step, consented, consentedAge, age, gender, education, selfEfficacy, evt, pretestAnswers,
      posttestAnswers, messages, freeTextResponse, perceivedLearning,
      mentalEffort, followUpEmail, followUpSubmitted, shuffledQuestions]);

  // Chat timer
  useEffect(() => {
    if (step !== "read") return;

    if (readStartTimeRef.current === null) {
      readStartTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - readStartTimeRef.current!) / 1000);
      setReadTimeLeft(Math.max(0, READ_DURATION - elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

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
  const activeQuestions = shuffledQuestions.length > 0 ? shuffledQuestions : PRETEST_QUESTIONS;

  const pretestScore = pretestAnswers.reduce<number>((score, answer, i) => {
    return score + (answer === activeQuestions[i].correct ? 1 : 0);
  }, 0);

  const posttestScore = posttestAnswers.reduce<number>((score, answer, i) => {
    return score + (answer === activeQuestions[i].correct ? 1 : 0);
  }, 0);
  const posttestValid = posttestAnswers.every((a) => a !== null);

  const freeTextCharCount = freeTextResponse.length;

  const readTimerDone = readTimeLeft === 0;
  const chatTimerDone = timeLeft === 0;

  const ageValid = age.trim() !== "" && !isNaN(Number(age)) && Number(age) > 0;
  const demographicsValid = ageValid && gender !== "" && education !== "";
  const confidenceScore = selfEfficacy[0] ?? null;
  const zpdValid = selfEfficacy.every((v) => v !== null) && evt.every((v) => v !== null);

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
        body: JSON.stringify({ messages: nextMessages, group, confidence: confidenceScore }),
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
  const logDemographics = async () => {
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
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      console.error("logDemographics failed:", data.error);
    }
  };

  const logPretest = async () => {
    const res = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        group,
        pretestQ1: pretestAnswers[0] === activeQuestions[0].correct ? 1 : 0,
        pretestQ2: pretestAnswers[1] === activeQuestions[1].correct ? 1 : 0,
        pretestQ3: pretestAnswers[2] === activeQuestions[2].correct ? 1 : 0,
        pretestQ4: pretestAnswers[3] === activeQuestions[3].correct ? 1 : 0,
        pretestScore,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      console.error("logPretest failed:", data.error);
    }
  };

  const logPosttest = async () => {
    const payload = {
      participantId,
      group,
      posttestQ1: posttestAnswers[0] === activeQuestions[0].correct ? 1 : 0,
      posttestQ2: posttestAnswers[1] === activeQuestions[1].correct ? 1 : 0,
      posttestQ3: posttestAnswers[2] === activeQuestions[2].correct ? 1 : 0,
      posttestQ4: posttestAnswers[3] === activeQuestions[3].correct ? 1 : 0,
      posttestScore,
    };
    console.log("logPosttest sending:", payload);
    const res = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      console.error("logPosttest failed:", data.error);
      throw new Error(data.error ?? "Fejl ved gemning af posttest");
    }
  };

  const logZPD = async () => {
    const res = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        group,
        confidence: confidenceScore,
        readingTime: readingTimeRef.current,
        evt1: evt[0],
        evt2: evt[1],
        evt3: evt[2],
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
    // no-op: trust removed, kept for call-site compatibility
  };

  const logLearningSurvey = async () => {
    const res = await fetch("/api/log-learning-survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        freeTextResponse,
        perceivedLearning1: perceivedLearning[0],
        easeOfConversating1: perceivedLearning[1],
        adaptingToNeeds1: perceivedLearning[2],
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
                Mange tak fordi du har lyst til at bruge tid på vores eksperiment:) Det betyder virkelig meget for os!
              </p>
              <div>
                <p className="text-base font-semibold text-zinc-100 mb-1">Strukturen af eksperimentet</p>
                <p className="text-base text-zinc-200 leading-relaxed">
                  Vores eksperiment handler om, hvordan man lærer bedst.{" "}
                  Eksperimentet tager <span className="font-medium text-zinc-100">ca. 15 minutter</span> og kræver koncentration.
                </p>
              </div>
              <p className="text-base font-bold text-green-300 text-center">
                Alle, der deltager i follow-up-studiet, er med i lodtrækningen om 2 x 500 kr.
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
                  <li>Besvare en kort pre-test (nogle korte spørgsmål om din forhåndsviden)</li>
                  <li>Læse en kort informationstekst (mindst 1 minut)</li>
                  <li>Vurdere din selvtillid og tekstens værdi for dig</li>
                  <li>Chatte med en AI-assistent i mindst 3,5 minutter</li>
                  <li>Besvare spørgsmål om din oplevede læring og mentale indsats</li>
                  <li>Skrive en kort forklaring med egne ord</li>
                  <li>Besvare en post-test</li>
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
                  AI-assistenten kan give upræcise eller forenklede forklaringer. Den bør ikke
                  betragtes som en autoritativ kilde til rådgivning. Interaktionen bruges
                  udelukkende som en del af dette forskningsstudie.
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
              <label className="flex items-start gap-3 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consentedAge}
                  onChange={(e) => setConsentedAge(e.target.checked)}
                />
                <span>Jeg bekræfter, at jeg er mindst 18 år.</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-zinc-200">
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
            <div className="flex flex-col items-end gap-2">
              {showConsentWarning && (
                <p className="text-sm text-amber-400">Du skal acceptere begge punkter for at gå videre.</p>
              )}
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2"
                onClick={() => {
                  if (!consented || !consentedAge) {
                    setShowConsentWarning(true);
                    setTimeout(() => setShowConsentWarning(false), 3000);
                    return;
                  }
                  setStep("demographics");
                }}
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
            <p className="text-sm text-zinc-300">
              Besvar disse korte spørgsmål om dig selv.
            </p>

            {/* Alder */}
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-100">Alder</p>
              <input
                type="number"
                min={18}
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
              <div className="flex flex-col items-end gap-2">
                {showDemographicsWarning && (
                  <p className="text-sm text-amber-400">Du skal udfylde alle felter for at gå videre.</p>
                )}
                <button
                  className="rounded-lg bg-zinc-700 text-white px-4 py-2"
                  onClick={async () => {
                    if (!demographicsValid) {
                      setShowDemographicsWarning(true);
                      setTimeout(() => setShowDemographicsWarning(false), 3000);
                      return;
                    }
                    await logDemographics();
                    setStep("pretest");
                  }}
                >
                  Videre →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* PRETEST */}
        {step === "pretest" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">Test om forhåndsviden</h2>
            <p className="text-sm text-zinc-300">
              Besvar disse 4 spørgsmål. Svar/gæt dit bedste :) der er ingen konsekvenser.
            </p>

            {activeQuestions.map((q, qi) => (
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
                  <label
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                      pretestAnswers[qi] === q.options.length
                        ? "bg-zinc-700 border-zinc-600 text-white"
                        : "bg-zinc-950 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q${qi}`}
                      className="sr-only"
                      checked={pretestAnswers[qi] === q.options.length}
                      onChange={() => {
                        const next = [...pretestAnswers];
                        next[qi] = q.options.length;
                        setPretestAnswers(next);
                      }}
                    />
                    Ved ikke
                  </label>
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
              <div className="flex flex-col items-end gap-2">
                {showPretestWarning && (
                  <p className="text-sm text-amber-400">Du skal besvare alle spørgsmål for at gå videre.</p>
                )}
                <button
                  className="rounded-lg bg-zinc-700 text-white px-4 py-2"
                  onClick={async () => {
                    if (pretestAnswers.some((a) => a === null)) {
                      setShowPretestWarning(true);
                      setTimeout(() => setShowPretestWarning(false), 3000);
                      return;
                    }
                    await logPretest();
                    readStartTimeRef.current = Date.now();
                    setStep("read");
                  }}
                >
                  Videre →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* READ */}
        {step === "read" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Hvordan bruger kroppen energi?</h2>
            <p className="text-sm text-zinc-300">
              Læs teksten grundigt. Du skal bruge mindst 1 minut på denne side.
            </p>
            <div className="rounded-lg bg-zinc-700 p-4 text-sm leading-relaxed text-zinc-200 space-y-3">
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
            <div className="flex flex-col items-end gap-2">
              {showReadWarning && (
                <p className="text-sm text-amber-400">Du skal læse teksten i mindst 1 minut.</p>
              )}
              <div className="flex items-center gap-3">
                {process.env.NODE_ENV === "development" && (
                  <button
                    className="text-xs text-zinc-500 underline"
                    onClick={() => setReadTimeLeft(0)}
                  >
                    skip timer (dev)
                  </button>
                )}
                <button
                  className={`rounded-lg px-4 py-2 bg-zinc-700 transition-colors ${
                    readTimerDone ? "text-green-400" : "text-white"
                  }`}
                  onClick={() => {
                    if (!readTimerDone) {
                      setShowReadWarning(true);
                      setTimeout(() => setShowReadWarning(false), 3000);
                      return;
                    }
                    if (readStartTimeRef.current) {
                      readingTimeRef.current = Date.now() - readStartTimeRef.current;
                    }
                    setStep("zpd");
                  }}
                >
                  Videre →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ZPD */}
        {step === "zpd" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">Selvvurdering</h2>
            <p className="text-sm font-semibold text-zinc-100">Tro på egne evner</p>
            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-2">
                <p className="text-sm text-zinc-100">Jeg føler, at jeg kan forstå selv de svære dele af materialet.</p>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((n) =>
                    likertBtn(n, selfEfficacy[0], (val) => setSelfEfficacy([val]))
                  )}
                </div>
                <p className="text-xs text-zinc-400">1 = Passer slet ikke · 5 = Passer fuldstændigt</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-sm font-semibold text-zinc-100">Vurdering af teksten</p>
              {[
                "Teksten vil være nyttigt for mig i fremtiden.",
                "Det er vigtigt for mig at forstå teksten godt.",
                "Jeg kan godt lide teksten.",
              ].map((q, qi) => (
                <div key={qi} className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-2">
                  <p className="text-sm text-zinc-100">{q}</p>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4].map((n) =>
                      likertBtn(n, evt[qi], (val) => {
                        const next = [...evt];
                        next[qi] = val;
                        setEvt(next);
                      })
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">1 = Passer ikke · 2 = Passer næsten ikke · 3 = Passer næsten · 4 = Passer fuldt</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-end gap-2 pt-2">
              {showZpdWarning && (
                <p className="text-sm text-amber-400">Du skal besvare alle spørgsmål for at gå videre.</p>
              )}
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2"
                onClick={async () => {
                  if (!zpdValid) {
                    setShowZpdWarning(true);
                    setTimeout(() => setShowZpdWarning(false), 3000);
                    return;
                  }
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
            <h2 className="text-lg font-semibold text-zinc-100">Chat</h2>
            <p className="text-sm text-zinc-400">
              Chat med AI-assistenten i mindst 3,5 minutter.
            </p>

            <div className="flex flex-col h-[55vh] rounded-xl border border-zinc-800 overflow-hidden">
              <div className="flex-1 overflow-y-auto bg-zinc-900 p-4 space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`w-fit max-w-[78%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto bg-zinc-700 text-white"
                        : "bg-zinc-800 text-zinc-100 prose prose-invert prose-sm max-w-none"
                    }`}
                  >
                    {m.role === "user" ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
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

            <div className="flex flex-col items-end gap-2">
              {showChatWarning && (
                <p className="text-sm text-amber-400">Du skal have chattet i mindst 3,5 minutter.</p>
              )}
              <div className="flex items-center gap-3">
                {process.env.NODE_ENV === "development" && (
                  <button
                    className="text-xs text-zinc-500 underline"
                    onClick={() => setTimeLeft(0)}
                  >
                    skip timer (dev)
                  </button>
                )}
                <button
                  className={`rounded-lg px-4 py-2 bg-zinc-700 transition-colors ${
                    chatTimerDone ? "text-green-400" : "text-white"
                  }`}
                  onClick={async () => {
                    if (!chatTimerDone) {
                      setShowChatWarning(true);
                      setTimeout(() => setShowChatWarning(false), 3000);
                      return;
                    }
                    await logChat();
                    setStep("survey");
                  }}
                >
                  Færdig med chat →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* FREE TEXT */}
        {step === "freeText" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-4">
            <h2 className="text-lg font-semibold text-center">Anvend teksten i et scenarie</h2>
            <p className="text-sm text-zinc-300">
              Kim begynder at motionere meget mere end før, men oplever, at vægttabet er
              mindre end forventet.
            </p>
            <p className="text-sm text-zinc-300">
              Forklar med egne ord, hvorfor dette kan ske ud fra modellen i teksten, og hvad Kim kunne gøre for at tabe sig yderligere.
            </p>
            <textarea
              className="w-full rounded-lg bg-zinc-800 text-white px-3 py-2 outline-none placeholder:text-zinc-500 resize-none h-40"
              value={freeTextResponse}
              onChange={(e) => setFreeTextResponse(e.target.value)}
              placeholder="Skriv her..."
            />
            <p className={`text-xs ${freeTextCharCount >= 250 ? "text-green-400" : "text-zinc-400"}`}>
              Tegn: {freeTextCharCount} / 250
            </p>
            <div className="flex justify-end">
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2 disabled:opacity-40"
                disabled={freeTextCharCount < 250}
                onClick={async () => {
                  await fetch("/api/log-learning-survey", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ participantId, freeTextResponse, freeTextWordCount: freeTextCharCount }),
                  });
                  setStep("posttest");
                }}
              >
                Videre →
              </button>
            </div>
          </section>
        )}

        {/* POSTTEST */}
        {step === "posttest" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">Post-test</h2>
            <p className="text-sm text-zinc-300">
              Besvar de samme 4 spørgsmål som i starten.
            </p>

            {activeQuestions.map((q, qi) => (
              <div key={qi} className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-3">
                <p className="text-sm font-bold text-zinc-100">
                  {qi + 1}) {q.question}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                        posttestAnswers[qi] === oi
                          ? "bg-zinc-700 border-zinc-600 text-white"
                          : "bg-zinc-950 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`postq${qi}`}
                        className="sr-only"
                        checked={posttestAnswers[qi] === oi}
                        onChange={() => {
                          const next = [...posttestAnswers];
                          next[qi] = oi;
                          setPosttestAnswers(next);
                        }}
                      />
                      {opt}
                    </label>
                  ))}
                  <label
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                      posttestAnswers[qi] === q.options.length
                        ? "bg-zinc-700 border-zinc-600 text-white"
                        : "bg-zinc-950 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`postq${qi}`}
                      className="sr-only"
                      checked={posttestAnswers[qi] === q.options.length}
                      onChange={() => {
                        const next = [...posttestAnswers];
                        next[qi] = q.options.length;
                        setPosttestAnswers(next);
                      }}
                    />
                    Ved ikke
                  </label>
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-2">
              <button
                className="rounded-lg border px-4 py-2 border-zinc-800 text-zinc-100"
                onClick={() => setStep("freeText")}
              >
                ← Tilbage
              </button>
              <div className="flex flex-col items-end gap-2">
                {showPosttestWarning && (
                  <p className="text-sm text-amber-400">Du skal besvare alle spørgsmål for at gå videre.</p>
                )}
                <button
                  className="rounded-lg bg-zinc-700 text-white px-4 py-2"
                  onClick={async () => {
                    if (!posttestValid) {
                      setShowPosttestWarning(true);
                      setTimeout(() => setShowPosttestWarning(false), 3000);
                      return;
                    }
                    try {
                      await logPosttest();
                    await logChatSurvey();
                    await logLearningSurvey();
                  } catch (e: any) {
                    alert("Fejl ved gemning af svar: " + (e?.message ?? "ukendt fejl") + "\n\nTjek konsollen for detaljer.");
                    return;
                  }
                    setStep("done");
                  }}
                >
                  Videre →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SURVEY */}
        {step === "survey" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">Afsluttende spørgsmål</h2>


            <div className="space-y-3 pt-2">
              <p className="text-base font-bold text-zinc-100">Oplevelse</p>
              {[
                "Jeg lærte meget af opgaven.",
                "Det var en nem samtale med chatbotten.",
                "Chatbotten tilpassede sig mine læringsbehov.",
              ].map((q, qi) => (
                <div key={qi} className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-2">
                  <p className="text-sm text-zinc-100">{q}</p>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 6].map((n) =>
                      likertBtn(n, perceivedLearning[qi], (val) => {
                        const next = [...perceivedLearning];
                        next[qi] = val;
                        setPerceivedLearning(next);
                      })
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">1 = Meget uenig · 6 = Meget enig</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-base font-bold text-zinc-100">Mental indsats</p>
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-2">
                <p className="text-sm text-zinc-100">
                  I den foregående samtale med chatbotten investerede jeg:
                </p>
                <div className="flex flex-col gap-1">
                  {[
                    [1, "Meget, meget lav mental indsats"],
                    [2, "Meget lav mental indsats"],
                    [3, "Lav mental indsats"],
                    [4, "Ret lav mental indsats"],
                    [5, "Hverken lav eller høj mental indsats"],
                    [6, "Ret høj mental indsats"],
                    [7, "Høj mental indsats"],
                    [8, "Meget høj mental indsats"],
                    [9, "Meget, meget høj mental indsats"],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMentalEffort(val as number)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm text-left ${
                        mentalEffort === val
                          ? "bg-zinc-700 text-white border-zinc-600"
                          : "bg-zinc-950 text-zinc-200 border-zinc-700 hover:bg-zinc-800"
                      }`}
                    >
                      <span className="w-4 text-center text-xs text-zinc-400">{val}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 pt-2">
              {showSurveyWarning && (
                <p className="text-sm text-amber-400">Du skal besvare alle spørgsmål for at gå videre.</p>
              )}
              <button
                className="rounded-lg bg-zinc-700 text-white px-4 py-2"
                onClick={async () => {
                  if (perceivedLearning.some((v) => v === null) || mentalEffort === null) {
                    setShowSurveyWarning(true);
                    setTimeout(() => setShowSurveyWarning(false), 3000);
                    return;
                  }
                  await fetch("/api/log-learning-survey", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      participantId,
                      perceivedLearning1: perceivedLearning[0],
                      easeOfConversating1: perceivedLearning[1],
                      adaptingToNeeds1: perceivedLearning[2],
                      mentalEffort,
                    }),
                  });
                  setStep("freeText");
                }}
              >
                Videre →
              </button>
            </div>
          </section>
        )}

        {/* DONE */}
        {step === "done" && (
          <section className="space-y-6 rounded-xl border p-6 border-zinc-800 bg-zinc-900">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-center">Tak fordi du ville være med!</h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Det betyder så meget for os, at DU ville være med! Dine svar vil bidrage til vores
                bachelorprojekt i psykologi.
              </p>
              <p className="text-sm text-zinc-400">— Ole og Magnus</p>
              <p className="text-sm text-zinc-500 italic">
                Hvis i har nogle spørgsmål kan i evt. kontakte os på:<br/>
                lyngmagnus@gmail.com<br/>
                ole-thomassen@hotmail.com
              </p>
            </div>

            {/* Giveaway */}
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-green-300 text-center">
                  Tag follow-up testen om en uge og vind 500 kr.
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Vi trækker lod blandt de deltagere, der gennemfører follow-up testen. Skriv din
                  email nedenfor. Du modtager en mail om ca. en uge med et link til en kort
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
