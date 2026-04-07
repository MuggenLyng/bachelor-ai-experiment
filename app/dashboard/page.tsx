"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ErrorBar, ReferenceLine,
  PieChart, Pie, Cell,
  ComposedChart, Area, Line,
  LineChart,
} from "recharts";

const COLORS = { control: "#6B7280", intervention: "#3B82F6" };
const PIE_COLORS = ["#3B82F6", "#EC4899", "#A78BFA", "#6B7280"];

function fmt(n: number | null, dec = 2) {
  return n === null ? "—" : n.toFixed(dec);
}

function tooltipFmt(value: any) {
  return typeof value === "number" ? value.toFixed(2) : value;
}

type CmpStat = { t: number; p: number; d: number } | null;

function StatRow({ cmp }: { cmp: CmpStat }) {
  if (!cmp) return null;
  const sig = cmp.p < 0.05;
  const pStr = cmp.p < 0.001 ? "< .001" : cmp.p.toFixed(3).replace("0.", ".");
  const dAbs = Math.abs(cmp.d);
  const mag = dAbs >= 0.8 ? "stor" : dAbs >= 0.5 ? "middel" : dAbs >= 0.2 ? "lille" : "triviel";
  return (
    <div className="flex gap-3 text-xs mt-1 flex-wrap">
      <span className={sig ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
        p = {pStr}{sig ? " *" : ""}
      </span>
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

  if (loading) return <div className="p-10 text-zinc-400">Henter data...</div>;
  if (!data) return <div className="p-10 text-red-400">Fejl ved hentning af data.</div>;

  const { nTotal, nCompleted, nDropouts, nFollowUp, groupStats, comparisons: cmp, demographics, lastUpdated } = data;
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
    { name: "Subj.",     Control: ctrl.perceivedLearning1Mean,  Intervention: intr.perceivedLearning1Mean },
    { name: "Samtale",   Control: ctrl.easeOfConversating1Mean, Intervention: intr.easeOfConversating1Mean },
    { name: "Tilpasn.",  Control: ctrl.adaptingToNeeds1Mean,    Intervention: intr.adaptingToNeeds1Mean },
    { name: "Mental",    Control: ctrl.mentalEffortMean,         Intervention: intr.mentalEffortMean },
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
          <h1 className="text-2xl font-bold">Eksperiment Dashboard</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Opdateres hvert 30 sek · Sidst hentet: {new Date(lastUpdated).toLocaleTimeString("da-DK")}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Opdater nu
        </button>
      </div>

      {/* Deltagere — altid synlig */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Deltagere</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Stat label="Total besøg" value={nTotal} />
          <Stat label="Fuldførte" value={nCompleted} />
          <Stat label="Control" value={ctrl.n} sub="standard AI" />
          <Stat label="Intervention" value={intr.n} sub="pæd.-psyk. AI" />
          <Stat label="Follow-up fuldført" value={nFollowUp ?? "—"} sub={nCompleted ? `${Math.round(((nFollowUp ?? 0) / nCompleted) * 100)}%` : undefined} />
        </div>
        <p className="text-xs text-zinc-500">Dropouts: {nDropouts}</p>
      </section>

      {/* Primær effekt */}
      <Section title="Primær effekt">
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
            <StatRow cmp={cmp?.posttest} />
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
                  {gainData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
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

        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 space-y-2">
          <p className="text-sm font-semibold text-zinc-300">Fritekst (transfer/recall)</p>
          <p className="text-xs text-zinc-400">Mangler manuel kodning — kommer snart.</p>
          <div className="flex gap-2 mt-2">
            <div className="flex-1 bg-zinc-900 rounded-lg border border-zinc-700 p-3 text-center">
              <p className="text-xs text-zinc-500">Control</p>
              <p className="text-2xl font-bold text-zinc-600 mt-1">—</p>
            </div>
            <div className="flex-1 bg-zinc-900 rounded-lg border border-zinc-700 p-3 text-center">
              <p className="text-xs text-zinc-500">Intervention</p>
              <p className="text-2xl font-bold text-zinc-600 mt-1">—</p>
            </div>
            <div className="flex-1 bg-zinc-900 rounded-lg border border-zinc-700 p-3 text-center">
              <p className="text-xs text-zinc-500">p / d</p>
              <p className="text-2xl font-bold text-zinc-600 mt-1">—</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Sekundære effekter */}
      <Section title="Sekundære effekter" defaultOpen={false}>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <p className="text-xs text-zinc-400 mb-3">Skala 1–6</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={secondaryData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis domain={[0, 6]} tick={{ fill: "#a1a1aa", fontSize: 12 }} />
              <Tooltip formatter={tooltipFmt} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} />
              <Bar dataKey="Control" fill={COLORS.control} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Intervention" fill={COLORS.intervention} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3">
            <div><p className="text-xs text-zinc-500 mb-0.5">Subj. læring</p><StatRow cmp={cmp?.perceivedLearning} /></div>
            <div><p className="text-xs text-zinc-500 mb-0.5">Nem samtale</p><StatRow cmp={cmp?.easeOfConversating} /></div>
            <div><p className="text-xs text-zinc-500 mb-0.5">Tilpasning</p><StatRow cmp={cmp?.adaptingToNeeds} /></div>
            <div><p className="text-xs text-zinc-500 mb-0.5">Mental indsats</p><StatRow cmp={cmp?.mentalEffort} /></div>
          </div>
        </div>
      </Section>

      {/* Adfærd & Tid */}
      <Section title="Adfærd & Tid" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DistChart ctrl={ctrl.readingTimeSec} intr={intr.readingTimeSec} label="Læsetid (sekunder)" refLine={60} refLabel="Min. 60s" combined xLabel="Sekunder" />
          <DistChart ctrl={ctrl.chatDurationMin} intr={intr.chatDurationMin} label="Chat varighed (minutter)" refLine={3.5} refLabel="Min. 3.5 min" xLabel="Minutter" stats={cmp?.chatDuration} />
          <DistChart ctrl={ctrl.freeTextChars} intr={intr.freeTextChars} label="Tegn skrevet (fritekst)" refLine={250} refLabel="Min. 250" xLabel="Tegn" stats={cmp?.freeText} />
          <DistChart ctrl={ctrl.chatMessages} intr={intr.chatMessages} label="Antal chat-beskeder per deltager" xLabel="Beskeder" stats={cmp?.chatMessages} />
        </div>
      </Section>

      {/* Demografi */}
      <Section title="Demografi" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DistChart
            ctrl={ctrl.ageValues} intr={intr.ageValues}
            label="Aldersfordeling per gruppe (balancetjek)"
            xLabel="Alder"
            stats={cmp?.age}
          />
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
            <p className="text-xs text-zinc-400">Køn</p>
            {genderData.length ? (
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={55}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={11}
                    isAnimationActive={false}>
                    {genderData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
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
