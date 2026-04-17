"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ErrorBar, ReferenceLine,
  PieChart, Pie, Cell,
  ComposedChart, Area, Line,
  LineChart,
  ScatterChart, Scatter,
} from "recharts";

const COLORS = { control: "#6B7280", intervention: "#3B82F6" };
const PIE_COLORS = ["#3B82F6", "#EC4899", "#A78BFA", "#6B7280"];

const TR = {
  da: {
    title: "Eksperiment Dashboard",
    updatesEvery: "Opdateres hvert 30 sek · Sidst hentet:",
    participants: "Deltagere",
    totalVisits: "Total besøg",
    completed: "Fuldførte",
    followupDone: "Follow-up fuldført",
    dropouts: "Dropouts",
    primaryGoals: "Primære mål",
    secondaryGoals: "Sekundære mål",
    fritekstScores: "Fritekst scorene",
    fritekstFollowup: "Fritekst follow-up scorene",
    mcq: "MCQ",
    chatbotExp: "Oplevelse af chatbot",
    behavTime: "Adfærd & Tid",
    demography: "Demografi",
    loading: "Henter data...",
    error: "Fejl ved hentning af data.",
    scale: "Skala",
    readingTime: "Læsetid (sekunder)",
    chatDuration: "Chat varighed (minutter)",
    charsWritten: "Tegn skrevet (fritekst)",
    chatMessages: "Antal chat-beskeder per deltager",
    charsFollowup: "Tegn skrevet (followup)",
    deviceGain: "Enhedstype × learning gain",
    mobileDesktop: "Mobile vs. desktop (Welch t-test)",
    ageDist: "Aldersfordeling per gruppe (balancetjek)",
    gender: "Køn",
    education: "Uddannelse",
    pretest: "Pretest",
    posttest: "Posttest",
    learningGain: "Learning gain",
    subjLearning: "Subj. læring",
    easeConv: "Nem samtale",
    adapt: "Tilpasning",
    mentalEffort: "Mental indsats",
    effSmall: "lille", effSmallMod: "lille-moderat", effMod: "moderat", effLarge: "stor", effTriv: "triviel",
    minRead: "Min. 60s", minChat: "Min. 3.5 min", minChars: "Min. 250",
    seconds: "Sekunder", minutes: "Minutter", chars: "Tegn", messages: "Beskeder", age: "Alder",
  },
  en: {
    title: "Experiment Dashboard",
    updatesEvery: "Updates every 30 sec · Last fetched:",
    participants: "Participants",
    totalVisits: "Total visits",
    completed: "Completed",
    followupDone: "Follow-up completed",
    dropouts: "Dropouts",
    primaryGoals: "Primary outcomes",
    secondaryGoals: "Secondary outcomes",
    fritekstScores: "Free-text scores",
    fritekstFollowup: "Free-text follow-up scores",
    mcq: "MCQ",
    chatbotExp: "Chatbot experience",
    behavTime: "Behaviour & Time",
    demography: "Demographics",
    loading: "Loading data...",
    error: "Error fetching data.",
    scale: "Scale",
    readingTime: "Reading time (seconds)",
    chatDuration: "Chat duration (minutes)",
    charsWritten: "Characters written (free-text)",
    chatMessages: "Chat messages per participant",
    charsFollowup: "Characters written (follow-up)",
    deviceGain: "Device type × learning gain",
    mobileDesktop: "Mobile vs. desktop (Welch t-test)",
    ageDist: "Age distribution per group (balance check)",
    gender: "Gender",
    education: "Education",
    pretest: "Pretest",
    posttest: "Posttest",
    learningGain: "Learning gain",
    subjLearning: "Subj. learning",
    easeConv: "Ease of conv.",
    adapt: "Adaptation",
    mentalEffort: "Mental effort",
    effSmall: "small", effSmallMod: "small-mod.", effMod: "moderate", effLarge: "large", effTriv: "trivial",
    minRead: "Min. 60s", minChat: "Min. 3.5 min", minChars: "Min. 250",
    seconds: "Seconds", minutes: "Minutes", chars: "Chars", messages: "Messages", age: "Age",
  },
} as const;
type DashLang = keyof typeof TR;

function fmt(n: number | null, dec = 2) {
  return n === null ? "—" : n.toFixed(dec);
}

function tooltipFmt(value: any) {
  return typeof value === "number" ? value.toFixed(2) : value;
}

type CmpStat = { t: number; p: number; d: number } | null;

function StatRow({ cmp, lang = "da" }: { cmp: CmpStat; lang?: DashLang }) {
  if (!cmp) return null;
  const t = TR[lang];
  const sig = cmp.p < 0.05;
  const pStr = cmp.p < 0.001 ? "< .001" : cmp.p.toFixed(3).replace("0.", ".");
  const dAbs = Math.abs(cmp.d);
  const mag = dAbs >= 0.8 ? t.effLarge : dAbs >= 0.4 ? t.effMod : dAbs >= 0.35 ? t.effSmallMod : dAbs >= 0.2 ? t.effSmall : t.effTriv;
  return (
    <div className="flex gap-3 text-xs mt-1 flex-wrap">
      <span className="text-zinc-400">p = {pStr}{sig ? " *" : ""}</span>
      <span className="text-zinc-500">t = {cmp.t.toFixed(2)}</span>
      <span className="text-zinc-500">d = {cmp.d.toFixed(2)} <span className="text-zinc-600">({mag})</span></span>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-1">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="space-y-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">{title}</span>
        <span className="text-zinc-600 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && children}
    </section>
  );
}

// ── KDE helpers ────────────────────────────────────────────────────────────────

function stdDev(vals: number[]) {
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length);
}

function gaussianKDE(vals: number[]) {
  if (vals.length < 2) return (_x: number) => 0;
  const bw = 1.06 * stdDev(vals) * Math.pow(vals.length, -0.2);
  return (x: number) =>
    vals.reduce((sum, xi) => {
      const u = (x - xi) / bw;
      return sum + Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
    }, 0) / (vals.length * bw);
}

function DistChart({ ctrl, intr, label, refLine, refLabel, meanLine, combined = false, xLabel = "x", stats }: {
  ctrl: (number | null)[];
  intr: (number | null)[];
  label: string;
  refLine?: number;
  refLabel?: string;
  meanLine?: number;
  combined?: boolean;
  xLabel?: string;
  stats?: CmpStat;
}) {
  const [pinnedDot, setPinnedDot] = useState<{ disp: string; groups: { label: string; color: string }[] } | null>(null);

  const ctrlV = ctrl.filter((v): v is number => v !== null);
  const intrV = intr.filter((v): v is number => v !== null);
  const allV = [...ctrlV, ...intrV];
  if (!allV.length) return <p className="text-xs text-zinc-500">Ingen data endnu.</p>;

  const lo = Math.min(...allV);
  const hi = Math.max(...allV);
  const pad = (hi - lo) * 0.12 || 1;
  const xMin = lo - pad, xMax = hi + pad;

  const kdeCtrl = !combined && ctrlV.length >= 2 ? gaussianKDE(ctrlV) : null;
  const kdeIntr = !combined && intrV.length >= 2 ? gaussianKDE(intrV) : null;
  const kdeComb = combined && allV.length >= 2 ? gaussianKDE(allV) : null;

  // Merge KDE grid (100 pts) with exact participant x values so dots sit exactly on the curve
  const kdeGrid = Array.from({ length: 100 }, (_, i) => xMin + (xMax - xMin) * i / 99);
  const uniqueParticipantX = [...new Set(allV)];
  const merged = [...kdeGrid, ...uniqueParticipantX].sort((a, b) => a - b)
    .filter((v, i, arr) => i === 0 || v - arr[i - 1] > 0.0001);

  const ctrlSet = new Set(ctrlV);
  const intrSet = new Set(intrV);
  const allSet = new Set(allV);

  const chartData = merged.map(x => ({
    x: +x.toFixed(3),
    rawX: x,
    Control:  kdeCtrl ? kdeCtrl(x)  : undefined,
    Intervention: kdeIntr ? kdeIntr(x) : undefined,
    Alle:     kdeComb ? kdeComb(x)  : undefined,
    ctrlDot:  (!combined && ctrlSet.has(x) && kdeCtrl) ? kdeCtrl(x)  : null,
    intrDot:  (!combined && intrSet.has(x) && kdeIntr) ? kdeIntr(x)  : null,
    allDot:   (combined  && allSet.has(x)  && kdeComb) ? kdeComb(x)  : null,
  }));

  const domain: [number, number] = [+xMin.toFixed(3), +xMax.toFixed(3)];
  const mCtrl = ctrlV.reduce((a, b) => a + b, 0) / (ctrlV.length || 1);
  const mIntr = intrV.reduce((a, b) => a + b, 0) / (intrV.length || 1);
  const mAll  = allV.reduce((a, b) => a + b, 0) / (allV.length || 1);

  const makeDot = (dotKey: string, color: string) => (props: any) => {
    if (props.payload?.[dotKey] == null || props.cy == null || isNaN(props.cy)) return null;
    return <circle key={props.key} cx={props.cx} cy={props.cy} r={5}
      fill={color} opacity={0.9} stroke="#18181b" strokeWidth={0.8} />;
  };

  const makeActiveDot = (dotKey: string, color: string) => (props: any) => {
    if (props.payload?.[dotKey] == null || props.cy == null || isNaN(props.cy)) return null;
    return <circle key={props.key} cx={props.cx} cy={props.cy} r={7}
      fill={color} opacity={1} stroke="white" strokeWidth={1.5} />;
  };

  const handleDivMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const svg = (e.currentTarget as HTMLDivElement).querySelector("svg");
    if (!svg || uniqueParticipantX.length === 0) return;
    // recharts puts a <clipPath><rect .../></clipPath> that defines the exact plot area
    const cpRect = svg.querySelector("defs clipPath rect");
    if (!cpRect) return;
    const svgRect = svg.getBoundingClientRect();
    const cpX = parseFloat(cpRect.getAttribute("x") || "0");
    const cpW = parseFloat(cpRect.getAttribute("width") || "0");
    if (cpW <= 0) return;

    const plotX = e.clientX - svgRect.left - cpX;
    const relX = plotX / cpW;
    if (relX < 0 || relX > 1) return;

    const dataX = domain[0] + relX * (domain[1] - domain[0]);
    const nearest = uniqueParticipantX.reduce((best, x) =>
      Math.abs(x - dataX) < Math.abs(best - dataX) ? x : best
    );
    if (Math.abs(nearest - dataX) > (domain[1] - domain[0]) * 0.08) return;

    const groups: { label: string; color: string }[] = [];
    if (combined) {
      if (allSet.has(nearest)) groups.push({ label: "Alle", color: "#a78bfa" });
    } else {
      if (ctrlSet.has(nearest)) groups.push({ label: "Control",      color: COLORS.control });
      if (intrSet.has(nearest)) groups.push({ label: "Intervention", color: COLORS.intervention });
    }
    if (!groups.length) return;
    const disp = Math.abs(nearest - Math.round(nearest)) < 0.01
      ? String(Math.round(nearest)) : nearest.toFixed(1);
    setPinnedDot({ disp, groups });
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
      <p className="text-xs text-zinc-400">{label}</p>
      <div className="relative" onMouseMove={handleDivMouseMove}>
        {pinnedDot && (
          <div style={{
            position: "absolute", top: 6, right: 10, zIndex: 10,
            background: "#18181b", border: "1px solid #52525b",
            padding: "8px 12px", borderRadius: 8, fontSize: 13, color: "#f4f4f5",
            pointerEvents: "none", minWidth: 140, lineHeight: 1.7,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "#e4e4e7" }}>{xLabel}: {pinnedDot.disp}</div>
            {pinnedDot.groups.map((g) => (
              <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: g.color, flexShrink: 0 }} />
                <span style={{ color: "#a1a1aa" }}>{g.label}</span>
              </div>
            ))}
          </div>
        )}
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gCtrl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.control} stopOpacity={0.35} />
                <stop offset="95%" stopColor={COLORS.control} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gIntr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.intervention} stopOpacity={0.35} />
                <stop offset="95%" stopColor={COLORS.intervention} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gComb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="x" type="number" scale="linear" domain={domain}
              tick={{ fill: "#a1a1aa", fontSize: 10 }} tickCount={6} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} tickCount={4} />
            <Tooltip content={() => null} cursor={{ stroke: "#52525b", strokeWidth: 1, strokeDasharray: "4 2" }} />
            {refLine !== undefined && (
              <ReferenceLine x={refLine} stroke="#ef4444" strokeDasharray="4 2"
                label={{ value: refLabel, fill: "#ef4444", fontSize: 10, position: "insideTopLeft" }} />
            )}
            {meanLine !== undefined && (
              <ReferenceLine x={meanLine} stroke="#fbbf24" strokeDasharray="5 3"
                label={{ value: `M=${meanLine.toFixed(1)}`, fill: "#fbbf24", fontSize: 10, position: "insideTopRight" }} />
            )}
            {combined ? (
              <>
                <Area type="monotone" dataKey="Alle" stroke="#a78bfa" strokeWidth={2}
                  fill="url(#gComb)" dot={false} activeDot={false} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="allDot" strokeWidth={0}
                  dot={makeDot("allDot", "#a78bfa")} activeDot={makeActiveDot("allDot", "#a78bfa")} isAnimationActive={false} />
              </>
            ) : (
              <>
                <Area type="monotone" dataKey="Control" stroke={COLORS.control} strokeWidth={2}
                  fill="url(#gCtrl)" dot={false} activeDot={false} connectNulls isAnimationActive={false} />
                <Area type="monotone" dataKey="Intervention" stroke={COLORS.intervention} strokeWidth={2}
                  fill="url(#gIntr)" dot={false} activeDot={false} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="ctrlDot" strokeWidth={0}
                  dot={makeDot("ctrlDot", COLORS.control)} activeDot={makeActiveDot("ctrlDot", COLORS.control)} isAnimationActive={false} />
                <Line type="monotone" dataKey="intrDot" strokeWidth={0}
                  dot={makeDot("intrDot", COLORS.intervention)} activeDot={makeActiveDot("intrDot", COLORS.intervention)} isAnimationActive={false} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 text-xs text-zinc-400">
        {combined ? (
          <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: "#a78bfa" }} />Alle M={mAll.toFixed(1)} (N={allV.length})</span>
        ) : (
          <>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-zinc-500 mr-1" />Control M={mCtrl.toFixed(1)} (N={ctrlV.length})</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-blue-500 mr-1" />Intervention M={mIntr.toFixed(1)} (N={intrV.length})</span>
          </>
        )}
      </div>
      {stats !== undefined && <StatRow cmp={stats} />}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<DashLang>("da");
  const t = TR[lang];

  const fetchData = async () => {
    const res = await fetch("/api/dashboard");
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-10 text-zinc-400">{t.loading}</div>;
  if (!data) return <div className="p-10 text-red-400">{t.error}</div>;

  const { nTotal, nCompleted, nDropouts, nFollowUp, groupStats, comparisons: cmp, demographics, deviceGain, deviceComparison, codingPoints, codingStats, followUpCodingPoints, followUpCodingStats, lastUpdated } = data;
  const ctrl = groupStats.control;
  const intr = groupStats.intervention;

  const prePostData = [
    { name: "Pretest",  Control: ctrl.pretestMean,  Intervention: intr.pretestMean },
    { name: "Posttest", Control: ctrl.posttestMean, Intervention: intr.posttestMean },
  ];

  const gainData = [
    { name: "Control",      gain: ctrl.gainMean, err: ctrl.gainSem, fill: COLORS.control },
    { name: "Intervention", gain: intr.gainMean, err: intr.gainSem, fill: COLORS.intervention },
  ];

  const secondaryData = [
    { name: lang === "da" ? "Subjektiv læring"     : "Subj. learning",   Control: ctrl.perceivedLearning1Mean,  errCtrl: ctrl.perceivedLearning1Sem,  Intervention: intr.perceivedLearning1Mean,  errIntr: intr.perceivedLearning1Sem },
    { name: lang === "da" ? "Nem at samtale"       : "Ease of conv.",    Control: ctrl.easeOfConversating1Mean, errCtrl: ctrl.easeOfConversating1Sem, Intervention: intr.easeOfConversating1Mean, errIntr: intr.easeOfConversating1Sem },
    { name: lang === "da" ? "Tilpasning til behov" : "Adaptation",       Control: ctrl.adaptingToNeeds1Mean,    errCtrl: ctrl.adaptingToNeeds1Sem,    Intervention: intr.adaptingToNeeds1Mean,    errIntr: intr.adaptingToNeeds1Sem },
    { name: lang === "da" ? "Mental indsats"       : "Mental effort",    Control: ctrl.mentalEffortMean,        errCtrl: ctrl.mentalEffortSem,        Intervention: intr.mentalEffortMean,        errIntr: intr.mentalEffortSem },
  ];

  const genderData = Object.entries(demographics.genderCounts as Record<string, number>).map(
    ([name, value]) => ({ name, value })
  );
  const eduData = Object.entries(demographics.eduCounts as Record<string, number>)
    .map(([name, value]) => ({ name: name.replace(/\s*\(.*?\)\s*/g, "").trim(), value }))
    .sort((a, b) => b.value - a.value);

  return (
    <main className="min-h-screen p-8 space-y-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {t.updatesEvery} {new Date(lastUpdated).toLocaleTimeString(lang === "da" ? "da-DK" : "en-GB")}
          </p>
        </div>
        <button
          onClick={() => setLang(l => l === "da" ? "en" : "da")}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          {lang === "da" ? "EN" : "DA"}
        </button>
      </div>

      {/* Deltagere — altid synlig */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">{t.participants}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Stat label={t.totalVisits} value={nTotal} />
          <Stat label={t.completed} value={nCompleted} />
          <Stat label="Control" value={ctrl.n} sub="standard AI" />
          <Stat label="Intervention" value={intr.n} sub="ped. AI" />
          <Stat label={t.followupDone} value={nFollowUp ?? "—"} sub={nCompleted ? `${Math.round(((nFollowUp ?? 0) / nCompleted) * 100)}%` : undefined} />
        </div>
        <p className="text-xs text-zinc-500">{t.dropouts}: {nDropouts}</p>
      </section>

      {/* ── PRIMÆRE MÅL ─────────────────────────────────────────── */}
      <h2 className="text-xl font-bold text-zinc-100 text-center">{t.primaryGoals}</h2>

      <Section title={t.fritekstScores}>
        {/* Top row: dotplot + total barplot side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Dotplot */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <p className="text-xs text-zinc-400 mb-1">Fritekst total score (0–8)</p>
            {codingStats && <StatRow cmp={codingStats.totalCmp} />}
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 16, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="x" type="number" domain={[-0.5, 1.5]}
                  ticks={[0, 1]}
                  tickFormatter={(v: number) => v === 0 ? "Control" : "Interv."}
                  tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis dataKey="y" domain={[0, 8]} ticks={[0,2,4,6,8]}
                  tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip cursor={false} content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  if (d.isMean) return null;
                  return <div className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200">{d.group}: {d.y}</div>;
                }} />
                {(() => {
                  const groups = (["control","intervention"] as const).map((grp, gi) => {
                    const pts = (codingPoints ?? []).filter((p: any) => p.group === grp);
                    const vals = pts.map((p: any) => p.total as number).filter((v: number) => v !== null);
                    const mn = vals.length ? vals.reduce((a: number,b: number)=>a+b,0)/vals.length : null;
                    const semV = vals.length > 1
                      ? Math.sqrt(vals.reduce((a:number,b:number)=>a+(b-mn!)*(b-mn!),0)/(vals.length-1)) / Math.sqrt(vals.length)
                      : 0;
                    const color = COLORS[grp];
                    const dots = pts.map((p: any, i: number) => ({
                      x: gi + (((i * 7919) % 100) / 100 - 0.5) * 0.18,
                      y: p.total, group: grp, isMean: false,
                    }));
                    const meanPt = mn !== null ? [{ x: gi, y: mn, err: semV, isMean: true }] : [];
                    return { grp, gi, color, dots, meanPt };
                  });
                  // Render all dots first, then all means+SE on top
                  return [
                    ...groups.map(({ grp, color, dots }) => (
                      <Scatter key={`${grp}-dots`} data={dots} fill={color} opacity={0.75} />
                    )),
                    ...groups.map(({ grp, color, meanPt }) => (
                      <Scatter key={`${grp}-mean`} data={meanPt} fill={color} legendType="none"
                        shape={(props: any) => {
                          const { cx, cy, yAxis, payload } = props;
                          const scale = yAxis?.scale;
                          const err = payload?.err ?? 0;
                          const y1 = scale ? scale(payload.y + err) : cy - 12;
                          const y2 = scale ? scale(payload.y - err) : cy + 12;
                          return (
                            <g>
                              <line x1={cx} y1={y1} x2={cx} y2={y2} stroke="#a1a1aa" strokeWidth={2} />
                              <line x1={cx-8} y1={y1} x2={cx+8} y2={y1} stroke="#a1a1aa" strokeWidth={2} />
                              <line x1={cx-8} y1={y2} x2={cx+8} y2={y2} stroke="#a1a1aa" strokeWidth={2} />
                              <line x1={cx-22} y1={cy} x2={cx+22} y2={cy} stroke={color} strokeWidth={3} strokeLinecap="round" />
                            </g>
                          );
                        }} />
                    )),
                  ];
                })()}
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-2 text-xs text-zinc-400">
              {(["control","intervention"] as const).map(grp => {
                const p = codingStats?.params?.find((p: any) => p.param === "total");
                const m = grp === "control" ? p?.controlMean : p?.interventionMean;
                const se = grp === "control" ? p?.controlSem : p?.interventionSem;
                return <span key={grp}><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{background: COLORS[grp]}} />{grp === "control" ? "Ctrl" : "Intr"} M={fmt(m??null)} ±{fmt(se??null)}</span>;
              })}
            </div>
          </div>

          {/* Total barplot */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <p className="text-xs text-zinc-400 mb-1">Total score (M ± SE)</p>
            {codingStats && <StatRow cmp={codingStats.totalCmp} />}
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={(() => {
                  const t = codingStats?.params?.find((x:any)=>x.param==="total");
                  return [
                    { name: "Control",      value: t?.controlMean??0,      err: t?.controlSem??0,      fill: COLORS.control },
                    { name: "Intervention", value: t?.interventionMean??0,  err: t?.interventionSem??0,  fill: COLORS.intervention },
                  ];
                })()}
                barGap={8} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis domain={[0, 8]} ticks={[0,2,4,6,8]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                        <span style={{ color: d.fill, fontWeight: 600 }}>{d.name}</span>
                        <span style={{ color: "#e4e4e7" }}>{": "}{typeof d.value === "number" ? d.value.toFixed(2) : d.value}</span>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {[COLORS.control, COLORS.intervention].map((fill, i) => (
                    <Cell key={i} fill={fill} />
                  ))}
                  <ErrorBar dataKey="err" width={6} strokeWidth={2} stroke="#a1a1aa" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom row: params barplot full width */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <p className="text-xs text-zinc-400 mb-1">Parametre (M ± SE, skala 0–2)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={[
                ["A1","Energibalance"],["A2","Kompensation"],["A3","Konsekvens"],["B1","Løsning"],
              ].map(([p, label]) => {
                const s = codingStats?.params?.find((x:any) => x.param === p);
                return { name: label, Control: s?.controlMean??0, Intervention: s?.interventionMean??0, errCtrl: s?.controlSem??0, errIntr: s?.interventionSem??0 };
              })}
              barGap={4} margin={{ top: 8, right: 16, bottom: 36, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
              <YAxis domain={[0, 2]} ticks={[0,1,2]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip formatter={tooltipFmt} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} />
              <Bar dataKey="Control" fill={COLORS.control} radius={[4,4,0,0]}>
                <ErrorBar dataKey="errCtrl" width={6} strokeWidth={2} stroke="#a1a1aa" />
              </Bar>
              <Bar dataKey="Intervention" fill={COLORS.intervention} radius={[4,4,0,0]}>
                <ErrorBar dataKey="errIntr" width={6} strokeWidth={2} stroke="#a1a1aa" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-zinc-500">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-zinc-500 mr-1" />Control</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-blue-500 mr-1" />Intervention</span>
          </div>
        </div>

      </Section>

      {/* Follow-up fritekst */}
      <Section title={t.fritekstFollowup}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Follow-up dotplot */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <p className="text-xs text-zinc-400 mb-1">Follow-up total score (0–8)</p>
            {followUpCodingStats && <StatRow cmp={followUpCodingStats.totalCmp} />}
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 16, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="x" type="number" domain={[-0.5, 1.5]}
                  ticks={[0, 1]} tickFormatter={(v: number) => v === 0 ? "Control" : "Interv."}
                  tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis dataKey="y" domain={[0, 8]} ticks={[0,2,4,6,8]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip cursor={false} content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  if (d.isMean) return null;
                  return <div className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200">{d.group}: {d.y}</div>;
                }} />
                {(() => {
                  const groups = (["control","intervention"] as const).map((grp, gi) => {
                    const pts = (followUpCodingPoints ?? []).filter((p: any) => p.group === grp);
                    const vals = pts.map((p: any) => p.total as number).filter((v: number) => v !== null);
                    const mn = vals.length ? vals.reduce((a: number,b: number)=>a+b,0)/vals.length : null;
                    const semV = vals.length > 1
                      ? Math.sqrt(vals.reduce((a:number,b:number)=>a+(b-mn!)*(b-mn!),0)/(vals.length-1)) / Math.sqrt(vals.length)
                      : 0;
                    const color = COLORS[grp];
                    const dots = pts.map((p: any, i: number) => ({
                      x: gi + (((i * 7919) % 100) / 100 - 0.5) * 0.18,
                      y: p.total, group: grp, isMean: false,
                    }));
                    const meanPt = mn !== null ? [{ x: gi, y: mn, err: semV, isMean: true }] : [];
                    return { grp, color, dots, meanPt };
                  });
                  return [
                    ...groups.map(({ grp, color, dots }) => (
                      <Scatter key={`fu-${grp}-dots`} data={dots} fill={color} opacity={0.75} />
                    )),
                    ...groups.map(({ grp, color, meanPt }) => (
                      <Scatter key={`fu-${grp}-mean`} data={meanPt} fill={color} legendType="none"
                        shape={(props: any) => {
                          const { cx, cy, yAxis, payload } = props;
                          const scale = yAxis?.scale;
                          const err = payload?.err ?? 0;
                          const y1 = scale ? scale(payload.y + err) : cy - 12;
                          const y2 = scale ? scale(payload.y - err) : cy + 12;
                          return (
                            <g>
                              <line x1={cx} y1={y1} x2={cx} y2={y2} stroke="#a1a1aa" strokeWidth={2} />
                              <line x1={cx-8} y1={y1} x2={cx+8} y2={y1} stroke="#a1a1aa" strokeWidth={2} />
                              <line x1={cx-8} y1={y2} x2={cx+8} y2={y2} stroke="#a1a1aa" strokeWidth={2} />
                              <line x1={cx-22} y1={cy} x2={cx+22} y2={cy} stroke={color} strokeWidth={3} strokeLinecap="round" />
                            </g>
                          );
                        }} />
                    )),
                  ];
                })()}
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-2 text-xs text-zinc-400">
              {(["control","intervention"] as const).map(grp => {
                const p = followUpCodingStats?.params?.find((p: any) => p.param === "total");
                const m = grp === "control" ? p?.controlMean : p?.interventionMean;
                const se = grp === "control" ? p?.controlSem : p?.interventionSem;
                return <span key={grp}><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{background: COLORS[grp]}} />{grp === "control" ? "Ctrl" : "Intr"} M={fmt(m??null)} ±{fmt(se??null)}</span>;
              })}
            </div>
          </div>

          {/* Follow-up total barplot */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <p className="text-xs text-zinc-400 mb-1">Total score (M ± SE)</p>
            {followUpCodingStats && <StatRow cmp={followUpCodingStats.totalCmp} />}
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={(() => {
                  const t = followUpCodingStats?.params?.find((x:any)=>x.param==="total");
                  return [
                    { name: "Control",      value: t?.controlMean??0,     err: t?.controlSem??0,     fill: COLORS.control },
                    { name: "Intervention", value: t?.interventionMean??0, err: t?.interventionSem??0, fill: COLORS.intervention },
                  ];
                })()}
                barGap={8} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis domain={[0, 8]} ticks={[0,2,4,6,8]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                        <span style={{ color: d.fill, fontWeight: 600 }}>{d.name}</span>
                        <span style={{ color: "#e4e4e7" }}>{": "}{typeof d.value === "number" ? d.value.toFixed(2) : d.value}</span>
                      </div>
                    );
                  }} />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {[COLORS.control, COLORS.intervention].map((fill, i) => <Cell key={i} fill={fill} />)}
                  <ErrorBar dataKey="err" width={6} strokeWidth={2} stroke="#a1a1aa" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Follow-up parametre */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <p className="text-xs text-zinc-400 mb-1">Parametre (M ± SE, skala 0–2)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={[
                ["A1","Energibalance"],["A2","Kompensation"],["A3","Konsekvens"],["B1","Løsning"],
              ].map(([p, label]) => {
                const s = followUpCodingStats?.params?.find((x:any) => x.param === p);
                return { name: label, Control: s?.controlMean??0, Intervention: s?.interventionMean??0, errCtrl: s?.controlSem??0, errIntr: s?.interventionSem??0 };
              })}
              barGap={4} margin={{ top: 8, right: 16, bottom: 36, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
              <YAxis domain={[0, 2]} ticks={[0,1,2]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip formatter={tooltipFmt} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} />
              <Bar dataKey="Control" fill={COLORS.control} radius={[4,4,0,0]}>
                <ErrorBar dataKey="errCtrl" width={6} strokeWidth={2} stroke="#a1a1aa" />
              </Bar>
              <Bar dataKey="Intervention" fill={COLORS.intervention} radius={[4,4,0,0]}>
                <ErrorBar dataKey="errIntr" width={6} strokeWidth={2} stroke="#a1a1aa" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-zinc-500">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-zinc-500 mr-1" />Control</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-blue-500 mr-1" />Intervention</span>
          </div>
        </div>
      </Section>

      {/* MCQ */}
      <Section title={t.mcq} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <p className="text-xs text-zinc-400 mb-3">Gennemsnitlig score: pre vs. post MCQ</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={prePostData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                <YAxis domain={[0, 4]} tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                <Tooltip formatter={tooltipFmt} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} />
                <Line dataKey="Control" stroke={COLORS.control} strokeWidth={2} dot={{ r: 5, fill: COLORS.control }} activeDot={{ r: 7 }} />
                <Line dataKey="Intervention" stroke={COLORS.intervention} strokeWidth={2} dot={{ r: 5, fill: COLORS.intervention }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs text-zinc-400">
              <span><span className="inline-block w-2 h-2 rounded-sm bg-zinc-500 mr-1" />Control: pre {fmt(ctrl.pretestMean)} → post {fmt(ctrl.posttestMean)}</span>
              <span><span className="inline-block w-2 h-2 rounded-sm bg-blue-500 mr-1" />Intervention: pre {fmt(intr.pretestMean)} → post {fmt(intr.posttestMean)}</span>
            </div>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <p className="text-xs text-zinc-400 mb-3">Learning gain (posttest − pretest)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gainData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                <Tooltip formatter={tooltipFmt} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", color: "#f4f4f5" }} itemStyle={{ color: "#f4f4f5" }} />
                <ReferenceLine y={0} stroke="#52525b" />
                <Bar dataKey="gain" radius={[4, 4, 0, 0]}>
                  {gainData.map((entry, i) => (<rect key={i} fill={entry.fill} />))}
                  <ErrorBar dataKey="err" width={4} strokeWidth={2} stroke="#a1a1aa" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs text-zinc-400">
              <span>Control: {fmt(ctrl.gainMean)}</span>
              <span>Intervention: {fmt(intr.gainMean)}</span>
              <span>Δ = {fmt(intr.gainMean !== null && ctrl.gainMean !== null ? intr.gainMean - ctrl.gainMean : null)}</span>
            </div>
            <StatRow cmp={cmp?.learningGain} />
          </div>
        </div>
      </Section>

      {/* ── SEKUNDÆRE MÅL ───────────────────────────────────────── */}
      <h2 className="text-xl font-bold text-zinc-100 text-center">{t.secondaryGoals}</h2>

      {/* Oplevelse af chatbot */}
      <Section title={t.chatbotExp} defaultOpen={false}>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <p className="text-xs text-zinc-400 mb-3">{t.scale} 1–6</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={secondaryData} barGap={4} margin={{ top: 8, right: 16, bottom: 36, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
              <YAxis domain={[0, 6]} tick={{ fill: "#a1a1aa", fontSize: 12 }} />
              <Tooltip formatter={tooltipFmt} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} />
              <Bar dataKey="Control" fill={COLORS.control} radius={[4, 4, 0, 0]}>
                <ErrorBar dataKey="errCtrl" width={4} strokeWidth={2} stroke="#a1a1aa" />
              </Bar>
              <Bar dataKey="Intervention" fill={COLORS.intervention} radius={[4, 4, 0, 0]}>
                <ErrorBar dataKey="errIntr" width={4} strokeWidth={2} stroke="#a1a1aa" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3">
            <div><p className="text-xs text-zinc-500 mb-0.5">{t.subjLearning}</p><StatRow cmp={cmp?.perceivedLearning} lang={lang} /></div>
            <div><p className="text-xs text-zinc-500 mb-0.5">{t.easeConv}</p><StatRow cmp={cmp?.easeOfConversating} lang={lang} /></div>
            <div><p className="text-xs text-zinc-500 mb-0.5">{t.adapt}</p><StatRow cmp={cmp?.adaptingToNeeds} lang={lang} /></div>
            <div><p className="text-xs text-zinc-500 mb-0.5">{t.mentalEffort}</p><StatRow cmp={cmp?.mentalEffort} lang={lang} /></div>
          </div>
        </div>
      </Section>

      {/* Adfærd & Tid */}
      <Section title={t.behavTime} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DistChart ctrl={ctrl.readingTimeSec} intr={intr.readingTimeSec} label={t.readingTime} refLine={60} refLabel={t.minRead} combined xLabel={t.seconds} />
          <DistChart ctrl={ctrl.chatDurationMin} intr={intr.chatDurationMin} label={t.chatDuration} refLine={3.5} refLabel={t.minChat} xLabel={t.minutes} stats={cmp?.chatDuration} />
          <DistChart ctrl={ctrl.freeTextChars} intr={intr.freeTextChars} label={t.charsWritten} refLine={250} refLabel={t.minChars} xLabel={t.chars} stats={cmp?.freeText} />
          <DistChart ctrl={ctrl.chatMessages} intr={intr.chatMessages} label={t.chatMessages} xLabel={t.messages} stats={cmp?.chatMessages} />
        </div>

        {/* Tegn skrevet followup + Enhedstype × learning gain — side by side on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DistChart ctrl={ctrl.followUpFreeTextChars} intr={intr.followUpFreeTextChars} label={t.charsFollowup} refLine={250} refLabel={t.minChars} xLabel={t.chars} />

          {/* Device type × learning gain */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
            <p className="text-xs text-zinc-400">{t.deviceGain}</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(deviceGain ?? {}).sort((a: any, b: any) => b[1].n - a[1].n).map(([dt, s]: [string, any]) => (
                <div key={dt} className="bg-zinc-800 rounded-lg px-3 py-2 min-w-[100px]">
                  <p className="text-xs text-zinc-500 capitalize">{dt}</p>
                  <p className="text-lg font-bold text-zinc-100">{s.mean !== null ? s.mean.toFixed(2) : "—"}</p>
                  <p className="text-xs text-zinc-500">N={s.n}</p>
                </div>
              ))}
            </div>
            {deviceComparison && (
              <div className="pt-1">
                <p className="text-xs text-zinc-500 mb-0.5">{t.mobileDesktop}</p>
                <StatRow cmp={deviceComparison} />
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Demografi */}
      <Section title={t.demography} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DistChart
            ctrl={ctrl.ageValues} intr={intr.ageValues}
            label={t.ageDist}
            xLabel={t.age}
            stats={cmp?.age}
          />
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
            <p className="text-xs text-zinc-400">{t.gender}</p>
            {genderData.length ? (
              <>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {genderData.map((d, i) => {
                    const total = genderData.reduce((s, x) => s + x.value, 0);
                    return (
                      <span key={d.name} className="flex items-center gap-1 text-xs text-zinc-400">
                        <span className="inline-block w-2 h-2 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {d.name} {total ? Math.round(d.value / total * 100) : 0}%
                      </span>
                    );
                  })}
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      outerRadius={55} label={false} labelLine={false}
                      isAnimationActive={false}>
                      {genderData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : <p className="text-xs text-zinc-500">Ingen data endnu.</p>}
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
          <p className="text-xs text-zinc-400">Uddannelsesniveau</p>
          {eduData.length ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={eduData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any, _name: any, props: any) => [`${Math.round(value)} har ${props.payload?.name}`, ""]}
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", color: "#f4f4f5" }}
                  itemStyle={{ color: "#f4f4f5" }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-zinc-500">Ingen data endnu.</p>}
        </div>
      </Section>

    </main>
  );
}
