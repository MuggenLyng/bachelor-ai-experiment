"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { T, type Lang } from "@/lib/translations";

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

const CHAT_DURATION = 3.5 * 60; // 210 seconds
const READ_DURATION = 1 * 60; // 60 seconds

function generateShuffledQuestions(lang: Lang) {
  return T[lang].questions.map((q) => {
    const indices = q.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return {
      question: q.question,
      options: indices.map((i) => (q.options as readonly string[])[i]),
      correct: indices.indexOf(q.correct),
    };
  });
}

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
  const [lang, setLang] = useState<Lang>("da");
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
  const [consentOpen, setConsentOpen] = useState(false);
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
  const [shuffledQuestions, setShuffledQuestions] = useState<ReturnType<typeof generateShuffledQuestions>>([]);

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // Randomisation
  useEffect(() => {
    const storedGroup = localStorage.getItem("group") as Group | null;
    const storedId = localStorage.getItem("participantId");

    if (storedGroup && storedId) {
      setGroup(storedGroup);
      setParticipantId(storedId);
      return;
    }

    const newGroup: Group = Math.random() < 0.7 ? "control" : "intervention"; // Adaptive: temporarily increased to 70% control (was 50%) to correct imbalance (n_ctrl=23, n_intr=33 observed 2026-04-11)
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

    // Restore language first
    const storedLang = localStorage.getItem("lang") as Lang | null;
    if (storedLang === "da" || storedLang === "en") {
      setLang(storedLang);
      const effectiveLang = storedLang;
      if (!saved) {
        setShuffledQuestions(generateShuffledQuestions(effectiveLang));
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
      if (saved.shuffledQuestions?.length === T[effectiveLang].questions.length) {
        setShuffledQuestions(saved.shuffledQuestions);
      } else {
        setShuffledQuestions(generateShuffledQuestions(effectiveLang));
      }
      return;
    }

    // No stored lang — use default da
    if (!saved) {
      setShuffledQuestions(generateShuffledQuestions("da"));
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
    if (saved.shuffledQuestions?.length === T["da"].questions.length) {
      setShuffledQuestions(saved.shuffledQuestions);
    } else {
      setShuffledQuestions(generateShuffledQuestions("da"));
    }
  }, []);

  // Persist lang to localStorage on change
  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

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

  // Read timer
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

  // Track dropout: send current step when user leaves the page
  useEffect(() => {
    if (!participantId || !group || step === "done" || step === "consent" || step === "demographics") return;
    const handleHide = () => {
      navigator.sendBeacon(
        "/api/log",
        new Blob([JSON.stringify({ participantId, group, dropoutStep: step, language: lang })], { type: "application/json" })
      );
    };
    document.addEventListener("visibilitychange", handleHide);
    return () => document.removeEventListener("visibilitychange", handleHide);
  }, [step, participantId, group, lang]);

  useEffect(() => {
    if (step !== "chat") return;

    if (chatStartTimeRef.current === null) {
      chatStartTimeRef.current = Date.now();
      try {
        const s = localStorage.getItem("experimentState");
        const state = s ? JSON.parse(s) : {};
        localStorage.setItem("experimentState", JSON.stringify({ ...state, chatStartTime: chatStartTimeRef.current }));
      } catch {}
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - chatStartTimeRef.current!) / 1000);
      setTimeLeft(Math.max(0, CHAT_DURATION - elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  if (!group || !participantId) {
    return <div className="p-10">{T[lang].loading}</div>;
  }

  // --- Computed ---
  const activeQuestions = shuffledQuestions.length > 0 ? shuffledQuestions : (generateShuffledQuestions(lang));

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

  // Shorthand
  const tr = T[lang];

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
        body: JSON.stringify({ messages: nextMessages, group, confidence: confidenceScore, language: lang }),
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
        { role: "assistant", content: `${tr.chat.errorPrefix}${String(e?.message ?? e)}` },
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
        language: lang,
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
      throw new Error(data.error ?? tr.posttest.saveError("unknown"));
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
          <h1 className="text-2xl font-semibold">{tr.appTitle}</h1>
        </header>

        {/* CONSENT */}
        {step === "consent" && (
          <section className="bg-zinc-900 rounded-xl border p-6 border-zinc-800 space-y-5">

            {/* Language toggle */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setLang("da");
                  setShuffledQuestions(generateShuffledQuestions("da"));
                }}
                className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  lang === "da"
                    ? "bg-zinc-700 text-white border-zinc-600"
                    : "bg-zinc-950 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                }`}
              >
                Dansk
              </button>
              <button
                type="button"
                onClick={() => {
                  setLang("en");
                  setShuffledQuestions(generateShuffledQuestions("en"));
                }}
                className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  lang === "en"
                    ? "bg-zinc-700 text-white border-zinc-600"
                    : "bg-zinc-950 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                }`}
              >
                English
              </button>
            </div>

            {/* Welcome header */}
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-zinc-50 leading-snug">
                {tr.consent.title}
              </h2>

              <p className="text-base text-zinc-200 leading-relaxed">
                {tr.consent.intro}
              </p>
              <div>
                <p className="text-base font-semibold text-zinc-100 mb-1">{tr.consent.structureLabel}</p>
                <p className="text-base text-zinc-200 leading-relaxed">
                  {tr.consent.structureText.split(tr.consent.structureHighlight)[0]}
                  <span className="font-medium text-zinc-100">{tr.consent.structureHighlight}</span>
                  {tr.consent.structureText.split(tr.consent.structureHighlight)[1]}
                </p>
              </div>
              <p className="text-base font-bold text-green-300 text-center">
                {tr.consent.giveawayTeaser}
              </p>
            </div>

            {/* Nested GDPR box */}
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 leading-relaxed overflow-hidden">
              <button
                className="w-full flex justify-between items-center px-4 py-3 text-zinc-200 hover:bg-zinc-700 transition-colors"
                onClick={() => setConsentOpen(v => !v)}
              >
                <span className="font-semibold text-sm">{tr.consent.gdprToggle}</span>
                <span>{consentOpen ? "▲" : "▼"}</span>
              </button>
              {consentOpen && (
                <div className="overflow-y-auto max-h-72 p-4 pt-0 space-y-3">
                  <p>{tr.consent.gdpr.intro}</p>

                  <div>
                    <p className="font-medium text-zinc-200">{tr.consent.gdpr.purposeLabel}</p>
                    <p>{tr.consent.gdpr.purposeText}</p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-200">{tr.consent.gdpr.participationLabel}</p>
                    <ul className="list-disc list-inside space-y-0.5 mt-0.5">
                      {tr.consent.gdpr.participationItems.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-200">{tr.consent.gdpr.dataLabel}</p>
                    <ul className="list-disc list-inside space-y-0.5 mt-0.5">
                      {tr.consent.gdpr.dataItems.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                    <p className="mt-1">{tr.consent.gdpr.dataNote}</p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-200">{tr.consent.gdpr.technicalLabel}</p>
                    <p>{tr.consent.gdpr.technicalText1}</p>
                    <p className="mt-1">{tr.consent.gdpr.technicalText2}</p>
                    <p className="mt-1">{tr.consent.gdpr.technicalText3}</p>
                    <p className="mt-1">{tr.consent.gdpr.technicalText4}</p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-200">{tr.consent.gdpr.legalBasisLabel}</p>
                    <p>{tr.consent.gdpr.legalBasisText}</p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-200">{tr.consent.gdpr.voluntaryLabel}</p>
                    <p>{tr.consent.gdpr.voluntaryText}</p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-200">{tr.consent.gdpr.storageLabel}</p>
                    <p>{tr.consent.gdpr.storageText}</p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-200">{tr.consent.gdpr.rightsLabel}</p>
                    <p>{tr.consent.gdpr.rightsText}</p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-200">{tr.consent.gdpr.controllerLabel}</p>
                    <p>{tr.consent.gdpr.controllerText}</p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-200">{tr.consent.gdpr.contactLabel}</p>
                    <p>{tr.consent.gdpr.contactText.split("\n").map((line, i) => (
                      <span key={i}>{line}{i < tr.consent.gdpr.contactText.split("\n").length - 1 && <br />}</span>
                    ))}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-3 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consentedAge}
                  onChange={(e) => setConsentedAge(e.target.checked)}
                />
                <span>{tr.consent.checkAge}</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                />
                <span>{tr.consent.checkConsent}</span>
              </label>
            </div>
            <div className="flex flex-col items-end gap-2">
              {showConsentWarning && (
                <p className="text-sm text-amber-400">{tr.consent.warningConsent}</p>
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
                {tr.consent.nextBtn}
              </button>
            </div>
          </section>
        )}

        {/* DEMOGRAPHICS */}
        {step === "demographics" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">{tr.demographics.title}</h2>
            <p className="text-sm text-zinc-300">
              {tr.demographics.intro}
            </p>

            {/* Age */}
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-100">{tr.demographics.ageLabel}</p>
              <input
                type="number"
                min={18}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={tr.demographics.agePlaceholder}
                className="w-24 rounded-lg bg-zinc-800 text-white px-3 py-2 outline-none placeholder:text-zinc-500 text-sm"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <p className="text-sm font-bold text-zinc-100">{tr.demographics.genderLabel}</p>
              <div className="flex flex-wrap gap-2">
                {(tr.demographics.genderOptions as readonly string[]).map((opt) => (
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

            {/* Education */}
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-100">{tr.demographics.educationLabel}</p>
              <select
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full max-w-xs rounded-lg bg-zinc-800 text-white px-3 py-2 outline-none text-sm"
              >
                <option value="">{tr.demographics.educationPlaceholder}</option>
                {(tr.demographics.educationOptions as readonly string[]).map((opt) => (
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
                {tr.demographics.backBtn}
              </button>
              <div className="flex flex-col items-end gap-2">
                {showDemographicsWarning && (
                  <p className="text-sm text-amber-400">{tr.demographics.warning}</p>
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
                  {tr.demographics.nextBtn}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* PRETEST */}
        {step === "pretest" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">{tr.pretest.title}</h2>
            <p className="text-sm text-zinc-300">
              {tr.pretest.intro}
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
                    {tr.pretest.dontKnow}
                  </label>
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-2">
              <button
                className="rounded-lg border px-4 py-2 border-zinc-800 text-zinc-100"
                onClick={() => setStep("demographics")}
              >
                {tr.pretest.backBtn}
              </button>
              <div className="flex flex-col items-end gap-2">
                {showPretestWarning && (
                  <p className="text-sm text-amber-400">{tr.pretest.warning}</p>
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
                  {tr.pretest.nextBtn}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* READ */}
        {step === "read" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">{tr.read.title}</h2>
            <p className="text-sm text-zinc-300">
              {tr.read.instruction}
            </p>
            <div className="rounded-lg bg-zinc-700 p-4 text-sm leading-relaxed text-zinc-200 space-y-3">
              {(tr.read.text as readonly string[]).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            <div className="flex flex-col items-end gap-2">
              {showReadWarning && (
                <p className="text-sm text-amber-400">{tr.read.warning}</p>
              )}
              <div className="flex items-center gap-3">
                {process.env.NODE_ENV === "development" && (
                  <button
                    className="text-xs text-zinc-500 underline"
                    onClick={() => setReadTimeLeft(0)}
                  >
                    {tr.read.skipDev}
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
                  {tr.read.nextBtn}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ZPD */}
        {step === "zpd" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">{tr.zpd.title}</h2>
            <p className="text-sm font-semibold text-zinc-100">{tr.zpd.selfEfficacyLabel}</p>
            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-2">
                <p className="text-sm text-zinc-100">{tr.zpd.selfEfficacyQ}</p>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((n) =>
                    likertBtn(n, selfEfficacy[0], (val) => setSelfEfficacy([val]))
                  )}
                </div>
                <p className="text-xs text-zinc-400">{tr.zpd.selfEfficacyScale}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-sm font-semibold text-zinc-100">{tr.zpd.evtLabel}</p>
              {(tr.zpd.evtQuestions as readonly string[]).map((q, qi) => (
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
                  <p className="text-xs text-zinc-400">{tr.zpd.evtScale}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-end gap-2 pt-2">
              {showZpdWarning && (
                <p className="text-sm text-amber-400">{tr.zpd.warning}</p>
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
                    content: tr.chat.initialMessage,
                  }]);
                  setStep("chat");
                }}
              >
                {tr.zpd.startChatBtn}
              </button>
            </div>
          </section>
        )}

        {/* CHAT */}
        {step === "chat" && (
          <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold text-zinc-100">{tr.chat.title}</h2>
            <p className="text-sm text-zinc-400">
              {tr.chat.instruction}
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
                    {tr.chat.typingIndicator}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-zinc-800 bg-zinc-950 p-3 flex gap-2">
                <input
                  className="flex-1 min-w-0 rounded-lg bg-zinc-800 text-white px-3 py-2 outline-none placeholder:text-zinc-500"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={tr.chat.inputPlaceholder}
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
                  {tr.chat.sendBtn}
                </button>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {showChatWarning && (
                <p className="text-sm text-amber-400">{tr.chat.warning}</p>
              )}
              <div className="flex items-center gap-3">
                {process.env.NODE_ENV === "development" && (
                  <button
                    className="text-xs text-zinc-500 underline"
                    onClick={() => setTimeLeft(0)}
                  >
                    {tr.chat.skipDev}
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
                  {tr.chat.doneBtn}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* FREE TEXT */}
        {step === "freeText" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-4">
            <h2 className="text-lg font-semibold text-center">{tr.freeText.title}</h2>
            <p className="text-sm text-zinc-300">
              {tr.freeText.scenario}
            </p>
            <p className="text-sm text-zinc-300">
              {tr.freeText.question}
            </p>
            <textarea
              className="w-full rounded-lg bg-zinc-800 text-white px-3 py-2 outline-none placeholder:text-zinc-500 resize-none h-40"
              value={freeTextResponse}
              onChange={(e) => setFreeTextResponse(e.target.value)}
              placeholder={tr.freeText.placeholder}
            />
            <p className={`text-xs ${freeTextCharCount >= 250 ? "text-green-400" : "text-zinc-400"}`}>
              {tr.freeText.charCount(freeTextCharCount)}
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
                {tr.freeText.nextBtn}
              </button>
            </div>
          </section>
        )}

        {/* POSTTEST */}
        {step === "posttest" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">{tr.posttest.title}</h2>
            <p className="text-sm text-zinc-300">
              {tr.posttest.intro}
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
                    {tr.posttest.dontKnow}
                  </label>
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-2">
              <button
                className="rounded-lg border px-4 py-2 border-zinc-800 text-zinc-100"
                onClick={() => setStep("freeText")}
              >
                {tr.posttest.backBtn}
              </button>
              <div className="flex flex-col items-end gap-2">
                {showPosttestWarning && (
                  <p className="text-sm text-amber-400">{tr.posttest.warning}</p>
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
                      alert(tr.posttest.saveError(e?.message ?? "unknown"));
                      return;
                    }
                    setStep("done");
                  }}
                >
                  {tr.posttest.nextBtn}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SURVEY */}
        {step === "survey" && (
          <section className="bg-zinc-900 rounded-xl border p-5 border-zinc-800 space-y-5">
            <h2 className="text-lg font-semibold text-center">{tr.survey.title}</h2>

            <div className="space-y-3 pt-2">
              <p className="text-base font-bold text-zinc-100">{tr.survey.experienceLabel}</p>
              {(tr.survey.experienceQuestions as readonly string[]).map((q, qi) => (
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
                  <p className="text-xs text-zinc-400">{tr.survey.experienceScale}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-base font-bold text-zinc-100">{tr.survey.mentalEffortLabel}</p>
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-2">
                <p className="text-sm text-zinc-100">
                  {tr.survey.mentalEffortQ}
                </p>
                <div className="flex flex-col gap-1">
                  {(tr.survey.mentalEffortOptions as readonly [number, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMentalEffort(val)}
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
                <p className="text-sm text-amber-400">{tr.survey.warning}</p>
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
                {tr.survey.nextBtn}
              </button>
            </div>
          </section>
        )}

        {/* DONE */}
        {step === "done" && (
          <section className="space-y-6 rounded-xl border p-6 border-zinc-800 bg-zinc-900">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-center">{tr.done.title}</h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {tr.done.thanks}
              </p>
              <p className="text-sm text-zinc-400">{tr.done.signoff}</p>
              <p className="text-sm text-zinc-500 italic">
                {tr.done.contact.split("\n").map((line, i) => (
                  <span key={i}>{line}{i < tr.done.contact.split("\n").length - 1 && <br />}</span>
                ))}
              </p>
            </div>

            {/* Giveaway */}
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-green-300 text-center">
                  {tr.done.giveawayTitle}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {tr.done.giveawayText}
                </p>
              </div>

              {followUpSubmitted ? (
                <p className="text-sm text-green-400">
                  {tr.done.signupConfirm}
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={followUpEmail}
                    onChange={(e) => setFollowUpEmail(e.target.value)}
                    placeholder={tr.done.emailPlaceholder}
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
                    {tr.done.signupBtn}
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
