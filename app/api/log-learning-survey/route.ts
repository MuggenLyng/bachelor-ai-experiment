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
      easeOfConversating1,
      adaptingToNeeds1,
      mentalEffort,
      completed,
    } = body as {
      participantId?: string;
      freeTextResponse?: string;
      freeTextWordCount?: number;
      perceivedLearning1?: number | null;
      easeOfConversating1?: number | null;
      adaptingToNeeds1?: number | null;
      mentalEffort?: number | null;
      completed?: boolean;
    };

    if (!participantId) {
      return NextResponse.json(
        { error: "Missing participantId" },
        { status: 400 }
      );
    }

    await prisma.participantLog.update({
      where: { participantId },
      data: {
        ...(freeTextResponse !== undefined && { freeTextResponse }),
        ...(freeTextWordCount !== undefined && { freeTextWordCount }),
        ...(perceivedLearning1 !== undefined && { perceivedLearning1: perceivedLearning1 ?? null }),
        ...(easeOfConversating1 !== undefined && { easeOfConversating1: easeOfConversating1 ?? null }),
        ...(adaptingToNeeds1 !== undefined && { adaptingToNeeds1: adaptingToNeeds1 ?? null }),
        ...(mentalEffort !== undefined && { mentalEffort: mentalEffort ?? null }),
        ...(completed !== undefined && { completed }),
      } as any,
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("API /api/log-learning-survey error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
