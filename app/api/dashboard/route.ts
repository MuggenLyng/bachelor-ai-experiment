import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const all = await prisma.participantLog.findMany({
      select: {
        group: true,
        completed: true,
        dropoutStep: true,
        pretestScore: true,
        posttestScore: true,
        perceivedLearning1: true,
        easeOfConversating1: true,
        adaptingToNeeds1: true,
        mentalEffort: true,
        evt1: true, evt2: true, evt3: true,
        readingTime: true,
        chatDuration: true,
        freeTextWordCount: true,
        chatMessageCount: true,
        userMessageCount: true,
        assistantMessageCount: true,
        deviceType: true,
        age: true,
        gender: true,
        education: true,
        createdAt: true,
      },
    });

    const completed = all.filter((r) => r.completed);
    const dropouts  = all.filter((r) => !r.completed);

    const groups = ["control", "intervention"] as const;

    function mean(vals: (number | null)[]) {
      const v = vals.filter((x): x is number => x !== null);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    }
    function sem(vals: (number | null)[]) {
      const v = vals.filter((x): x is number => x !== null);
      if (v.length < 2) return null;
      const m = v.reduce((a, b) => a + b, 0) / v.length;
      const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
      return sd / Math.sqrt(v.length);
    }

    const byGroup = Object.fromEntries(groups.map((g) => [g, completed.filter((r) => r.group === g)]));

    const groupStats = Object.fromEntries(groups.map((g) => {
      const rows = byGroup[g];
      const pre  = rows.map((r) => r.pretestScore);
      const post = rows.map((r) => r.posttestScore);
      const gain = rows.map((r) =>
        r.pretestScore !== null && r.posttestScore !== null
          ? r.posttestScore - r.pretestScore : null
      );
      const evtMean = rows.map((r) =>
        r.evt1 !== null && r.evt2 !== null && r.evt3 !== null
          ? (r.evt1 + r.evt2 + r.evt3) / 3 : null
      );
      return [g, {
        n: rows.length,
        pretestMean:  mean(pre),  pretestSem:  sem(pre),
        posttestMean: mean(post), posttestSem: sem(post),
        gainMean:     mean(gain), gainSem:     sem(gain),
        perceivedLearning1Mean: mean(rows.map((r) => r.perceivedLearning1)),
        easeOfConversating1Mean: mean(rows.map((r) => r.easeOfConversating1)),
        adaptingToNeeds1Mean: mean(rows.map((r) => r.adaptingToNeeds1)),
        mentalEffortMean: mean(rows.map((r) => r.mentalEffort)),
        evtMean: mean(evtMean),
        readingTimeSec: rows.map((r) => r.readingTime !== null ? r.readingTime / 1000 : null),
        chatDurationMin: rows.map((r) => r.chatDuration !== null ? r.chatDuration / 1000 / 60 : null),
        freeTextChars: rows.map((r) => r.freeTextWordCount),
        chatMessages: rows.map((r) => r.chatMessageCount),
        ageValues: rows.map((r) => r.age),
      }];
    }));

    const dropoutByStep = dropouts.reduce<Record<string, number>>((acc, r) => {
      const step = r.dropoutStep ?? "unknown";
      acc[step] = (acc[step] ?? 0) + 1;
      return acc;
    }, {});

    // Demographics (completed only)
    const ageMean = mean(completed.map((r) => r.age));
    const genderCounts = completed.reduce<Record<string, number>>((acc, r) => {
      const g = r.gender ?? "Ukendt";
      acc[g] = (acc[g] ?? 0) + 1;
      return acc;
    }, {});
    const eduCounts = completed.reduce<Record<string, number>>((acc, r) => {
      const e = r.education ?? "Ukendt";
      acc[e] = (acc[e] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      nTotal: all.length,
      nCompleted: completed.length,
      nDropouts: dropouts.length,
      dropoutByStep,
      groupStats,
      demographics: { ageMean, genderCounts, eduCounts },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
