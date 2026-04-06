"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

const COLORS = { control: "#6B7280", intervention: "#3B82F6" };

function histBins(vals: number[], bins: number, min?: number, max?: number) {
  if (!vals.length) return [];
  const lo = min ?? Math.min(...vals);
  const hi = max ?? Math.max(...vals);
  const width = (hi - lo) / bins;
  return Array.from({ length: bins }, (_, i) => {
    const from = lo + i * width;
    const to = from + width;
    return { name: from.toFixed(1), from, to };
  }).map(({ name, from, to }) => ({
    name,
    Control: 0,
    Intervention: 0,
    _from: from,
    _to: to,
  }));
}

function toBins(vals: (number | null)[], bins: { _from: number; _to: number }[], key: "Control" | "Intervention") {
  const result = bins.map((b) => ({ ...b }));
  vals.forEach((v) => {
    if (v === null) return;
    const i = result.findIndex((b, j) =>
      v >= b._from && (v < b._to || j === result.length - 1)
    );
    if (i >= 0) (result[i] as any)[key]++;
  });
  return result;
}

function median(vals: number[]) {
  if (!vals.length) return null;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function DistChart({ ctrl, intr, label, refLine, refLabel, showMedian }: {
  ctrl: (number | null)[];
  intr: (number | null)[];
  label: string;
  refLine?: number;
  refLabel?: string;
  showMedian?: boolean;
}) {
  const allVals = [...ctrl, ...intr].filter((v): v is number => v !== null);
  if (!allVals.length) return <p className="text-xs text-zinc-500">Ingen data endnu.</p>;

  const bins = histBins(allVals, 8);
  const ctrlBins = toBins(ctrl, bins, "Control");
  const merged = toBins(intr, ctrlBins, "Intervention");

  const ctrlVals = ctrl.filter((v): v is number => v !== null);
  const intrVals = intr.filter((v): v is number => v !== null);
  const mCtrl = ctrlVals.reduce((a, b) => a + b, 0) / (ctrlVals.length || 1);
  const mIntr = intrVals.reduce((a, b) => a + b, 0) / (intrVals.length || 1);
  const medCtrl = median(ctrlVals);
  const medIntr = median(intrVals);

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
      <p className="text-xs text-zinc-400">{label}</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={merged} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} />
          {refLine !== undefined && (
            <ReferenceLine x={bins.find(b => refLine >= b._from && refLine < b._to)?.name}
              stroke="#ef4444" strokeDasharray="4 2"
              label={{ value: refLabel, fill: "#ef4444", fontSize: 10 }} />
          )}
          <Bar dataKey="Control" fill={COLORS.control} radius={[3, 3, 0, 0]} />
          <Bar dataKey="Intervention" fill={COLORS.intervention} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 text-xs text-zinc-400">
        <span>
          <span className="inline-block w-2 h-2 rounded-sm bg-zinc-500 mr-1" />
          Control M={mCtrl.toFixed(1)}{showMedian && medCtrl !== null ? ` Md=${medCtrl.toFixed(1)}` : ""} (N={ctrlVals.length})
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-sm bg-blue-500 mr-1" />
          Intervention M={mIntr.toFixed(1)}{showMedian && medIntr !== null ? ` Md=${medIntr.toFixed(1)}` : ""} (N={intrVals.length})
        </span>
      </div>
    </div>
  );
}

export default function AdfærdPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetch_ = async () => {
      const res = await fetch("/api/dashboard");
      if (res.ok) setData(await res.json());
    };
    fetch_();
    const i = setInterval(fetch_, 30000);
    return () => clearInterval(i);
  }, []);

  if (!data) return <div className="p-10 text-zinc-400">Henter data...</div>;

  const ctrl = data.groupStats.control;
  const intr = data.groupStats.intervention;

  return (
    <main className="min-h-screen p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Adfærd & Tid</h1>
          <p className="text-xs text-zinc-500 mt-1">Opdateres hvert 30 sek</p>
        </div>
        <Link href="/dashboard" className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          ← Oversigt
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Læsetid</h2>
        <DistChart
          ctrl={ctrl.readingTimeSec}
          intr={intr.readingTimeSec}
          label="Læsetid (sekunder)"
          refLine={60}
          refLabel="Min. 60s"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Chat varighed</h2>
        <DistChart
          ctrl={ctrl.chatDurationMin}
          intr={intr.chatDurationMin}
          label="Chat varighed (minutter)"
          refLine={3.5}
          refLabel="Min. 3.5 min"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Fritekst</h2>
        <DistChart
          ctrl={ctrl.freeTextChars}
          intr={intr.freeTextChars}
          label="Tegn skrevet (fritekst)"
          refLine={250}
          refLabel="Min. 250"
          showMedian
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Chat beskeder</h2>
        <DistChart
          ctrl={ctrl.chatMessages}
          intr={intr.chatMessages}
          label="Antal chat-beskeder per deltager"
        />
      </section>
    </main>
  );
}
