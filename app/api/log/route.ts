import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      participantId,
      group,
      age,
      gender,
      education,
      deviceType,
      priorKnowledge,
      confidence,
      pretestQ1,
      pretestQ2,
      pretestQ3,
      pretestQ4,
      pretestScore,
      dropoutStep,
    } = body as {
      participantId?: string;
      group?: "control" | "intervention";
      age?: number | null;
      gender?: string | null;
      education?: string | null;
      deviceType?: string | null;
      priorKnowledge?: number | null;
      confidence?: number | null;
      pretestQ1?: number | null;
      pretestQ2?: number | null;
      pretestQ3?: number | null;
      pretestQ4?: number | null;
      pretestScore?: number | null;
      dropoutStep?: string | null;
    };

    if (!participantId || !group) {
      return NextResponse.json(
        { error: "Missing participantId or group" },
        { status: 400 }
      );
    }

    // Only include fields that were actually sent — undefined fields would
    // overwrite previously saved values with null on subsequent upserts.
    const data: Record<string, unknown> = { group };
    if (age !== undefined)           data.age = age ?? null;
    if (gender !== undefined)        data.gender = gender ?? null;
    if (education !== undefined)     data.education = education ?? null;
    if (deviceType !== undefined)    data.deviceType = deviceType ?? null;
    if (priorKnowledge !== undefined) data.priorKnowledge = priorKnowledge ?? null;
    if (confidence !== undefined)    data.confidence = confidence ?? null;
    if (pretestQ1 !== undefined)     data.pretestQ1 = pretestQ1 ?? null;
    if (pretestQ2 !== undefined)     data.pretestQ2 = pretestQ2 ?? null;
    if (pretestQ3 !== undefined)     data.pretestQ3 = pretestQ3 ?? null;
    if (pretestQ4 !== undefined)     data.pretestQ4 = pretestQ4 ?? null;
    if (pretestScore !== undefined)  data.pretestScore = pretestScore ?? null;
    if (dropoutStep !== undefined)   data.dropoutStep = dropoutStep ?? null;

    const log = await prisma.participantLog.upsert({
      where: { participantId },
      update: data as any,
      create: { participantId, ...data } as any,
    });

    return NextResponse.json({ ok: true, log });
  } catch (err: any) {
    console.error("API /api/log error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
