import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// ── Statistical helpers ────────────────────────────────────────────────────────

function lnGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const ci of c) ser += ci / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betaInc(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log1p(-x) - lbeta) / a;
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 100; m++) {
    let aa = m * (b - m) * x / ((a + 2*m - 1) * (a + 2*m));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1/d; h *= d*c;
    aa = -(a+m)*(a+b+m)*x / ((a+2*m)*(a+2*m+1));
    d = 1 + aa*d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa/c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1/d; const delta = d*c; h *= delta;
    if (Math.abs(delta - 1) < 1e-10) break;
  }
  return Math.min(1, front * h);
}

function twoTailP(t: number, df: number): number {
  return betaInc(df / (df + t * t), df / 2, 0.5);
}

function welchTest(a: number[], b: number[]) {
  if (a.length < 2 || b.length < 2) return null;
  const mA = a.reduce((s, x) => s + x, 0) / a.length;
  const mB = b.reduce((s, x) => s + x, 0) / b.length;
  const vA = a.reduce((s, x) => s + (x - mA) ** 2, 0) / (a.length - 1);
  const vB = b.reduce((s, x) => s + (x - mB) ** 2, 0) / (b.length - 1);
  const seA = vA / a.length, seB = vB / b.length;
  const se = Math.sqrt(seA + seB);
  if (se === 0) return { t: 0, p: 1, d: 0 };
  const t = (mB - mA) / se;
  const df = (seA + seB) ** 2 / (seA ** 2 / (a.length - 1) + seB ** 2 / (b.length - 1));
  const p = twoTailP(Math.abs(t), df);
  const pooledSD = Math.sqrt((vA + vB) / 2);
  const d = pooledSD > 0 ? (mB - mA) / pooledSD : 0;
  return { t: +t.toFixed(3), p: +p.toFixed(3), d: +d.toFixed(2) };
}

function nn(vals: (number | null)[]) {
  return vals.filter((x): x is number => x !== null);
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const all = await prisma.participantLog.findMany({
      select: {
        group: true, completed: true, dropoutStep: true,
        pretestScore: true, posttestScore: true,
        perceivedLearning1: true, easeOfConversating1: true,
        adaptingToNeeds1: true, mentalEffort: true,
        evt1: true, evt2: true, evt3: true,
        readingTime: true, chatDuration: true,
        freeTextWordCount: true, chatMessageCount: true,
        userMessageCount: true, assistantMessageCount: true,
        deviceType: true, age: true, gender: true, education: true,
        createdAt: true, followUpCompleted: true,
      },
    });

    const completed = all.filter((r) => r.completed);
    const dropouts  = all.filter((r) => !r.completed);
    const groups = ["control", "intervention"] as const;

    function mean(vals: (number | null)[]) {
      const v = nn(vals);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    }
    function sem(vals: (number | null)[]) {
      const v = nn(vals);
      if (v.length < 2) return null;
      const m = v.reduce((a, b) => a + b, 0) / v.length;
      const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
      return sd / Math.sqrt(v.length);
    }

    const byGroup = Object.fromEntries(
      groups.map((g) => [g, completed.filter((r) => r.group === g)])
    );

    const groupStats = Object.fromEntries(groups.map((g) => {
      const rows = byGroup[g];
      const pre  = rows.map((r) => r.pretestScore);
      const post = rows.map((r) => r.posttestScore);
      const gain = rows.map((r) =>
        r.pretestScore !== null && r.posttestScore !== null
          ? r.posttestScore - r.pretestScore : null
      );
      return [g, {
        n: rows.length,
        pretestMean: mean(pre),   pretestSem: sem(pre),
        posttestMean: mean(post), posttestSem: sem(post),
        gainMean: mean(gain),     gainSem: sem(gain),
        perceivedLearning1Mean: mean(rows.map((r) => r.perceivedLearning1)),
        easeOfConversating1Mean: mean(rows.map((r) => r.easeOfConversating1)),
        adaptingToNeeds1Mean: mean(rows.map((r) => r.adaptingToNeeds1)),
        mentalEffortMean: mean(rows.map((r) => r.mentalEffort)),
        evtMean: mean(rows.map((r) =>
          r.evt1 !== null && r.evt2 !== null && r.evt3 !== null
            ? (r.evt1 + r.evt2 + r.evt3) / 3 : null
        )),
        readingTimeSec:  rows.map((r) => r.readingTime  !== null ? r.readingTime  / 1000      : null),
        chatDurationMin: rows.map((r) => r.chatDuration !== null ? r.chatDuration / 1000 / 60 : null),
        freeTextChars:   rows.map((r) => r.freeTextWordCount),
        chatMessages:    rows.map((r) => r.chatMessageCount),
        ageValues:       rows.map((r) => r.age),
      }];
    }));

    // ── Comparisons (Welch t-test: intervention vs control) ───────────────────
    const c = byGroup.control, iv = byGroup.intervention;

    const gainC  = nn(c.map(r  => r.pretestScore !== null && r.posttestScore !== null ? r.posttestScore - r.pretestScore : null));
    const gainIV = nn(iv.map(r => r.pretestScore !== null && r.posttestScore !== null ? r.posttestScore - r.pretestScore : null));

    const comparisons = {
      pretest:            welchTest(nn(c.map(r => r.pretestScore)),           nn(iv.map(r => r.pretestScore))),
      posttest:           welchTest(nn(c.map(r => r.posttestScore)),          nn(iv.map(r => r.posttestScore))),
      learningGain:       welchTest(gainC, gainIV),
      perceivedLearning:  welchTest(nn(c.map(r => r.perceivedLearning1)),     nn(iv.map(r => r.perceivedLearning1))),
      easeOfConversating: welchTest(nn(c.map(r => r.easeOfConversating1)),    nn(iv.map(r => r.easeOfConversating1))),
      adaptingToNeeds:    welchTest(nn(c.map(r => r.adaptingToNeeds1)),       nn(iv.map(r => r.adaptingToNeeds1))),
      mentalEffort:       welchTest(nn(c.map(r => r.mentalEffort)),            nn(iv.map(r => r.mentalEffort))),
      chatDuration:       welchTest(nn(c.map(r => r.chatDuration !== null ? r.chatDuration / 60000 : null)), nn(iv.map(r => r.chatDuration !== null ? r.chatDuration / 60000 : null))),
      freeText:           welchTest(nn(c.map(r => r.freeTextWordCount)),      nn(iv.map(r => r.freeTextWordCount))),
      chatMessages:       welchTest(nn(c.map(r => r.chatMessageCount)),       nn(iv.map(r => r.chatMessageCount))),
      age:                welchTest(nn(c.map(r => r.age)),                    nn(iv.map(r => r.age))),
    };

    const dropoutByStep = dropouts.reduce<Record<string, number>>((acc, r) => {
      const step = r.dropoutStep ?? "unknown";
      acc[step] = (acc[step] ?? 0) + 1;
      return acc;
    }, {});

    const ageMean = mean(completed.map((r) => r.age));
    const genderCounts = completed.reduce<Record<string, number>>((acc, r) => {
      acc[r.gender ?? "Ukendt"] = (acc[r.gender ?? "Ukendt"] ?? 0) + 1;
      return acc;
    }, {});
    const eduCounts = completed.reduce<Record<string, number>>((acc, r) => {
      acc[r.education ?? "Ukendt"] = (acc[r.education ?? "Ukendt"] ?? 0) + 1;
      return acc;
    }, {});

    const nFollowUp = completed.filter((r) => r.followUpCompleted).length;

    return NextResponse.json({
      nTotal: all.length, nCompleted: completed.length, nDropouts: dropouts.length,
      nFollowUp,
      dropoutByStep, groupStats, comparisons,
      demographics: { ageMean, genderCounts, eduCounts },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
