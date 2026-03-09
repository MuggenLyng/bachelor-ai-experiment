import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      participantId,
      freeTextResponse,
      freeTextWordCount,
      perceivedLearning1,
      perceivedLearning2,
      perceivedLearning3,
      mentalEffort,
      completed,
    } = body as {
      participantId?: string;
      freeTextResponse?: string;
      freeTextWordCount?: number;
      perceivedLearning1?: number | null;
      perceivedLearning2?: number | null;
      perceivedLearning3?: number | null;
      mentalEffort?: number | null;
      completed?: boolean;
    };

    if (!participantId) {
      return NextResponse.json(
        { error: "Missing participantId" },
        { status: 400 }
      );
    }

    const log = await prisma.participantLog.update({
      where: { participantId },
      data: {
        freeTextResponse: freeTextResponse ?? null,
        freeTextWordCount: freeTextWordCount ?? null,
        perceivedLearning1: perceivedLearning1 ?? null,
        perceivedLearning2: perceivedLearning2 ?? null,
        perceivedLearning3: perceivedLearning3 ?? null,
        mentalEffort: mentalEffort ?? null,
        completed: completed ?? false,
      },
    });

    return NextResponse.json({ ok: true, log });
  } catch (err: any) {
    console.error("API /api/log-learning-survey error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
