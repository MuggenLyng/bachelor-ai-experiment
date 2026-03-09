import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { token, followUpFreeText, followUpFreeTextWordCount } = body as {
      token?: string;
      followUpFreeText?: string;
      followUpFreeTextWordCount?: number;
    };

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // Check if already completed
    const existing = await prisma.participantLog.findUnique({
      where: { followUpToken: token },
      select: { id: true, followUpToken: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if ((existing as any).followUpCompleted) {
      return NextResponse.json({ error: "Already completed" }, { status: 400 });
    }

    await prisma.participantLog.update({
      where: { followUpToken: token },
      data: {
        followUpFreeText: followUpFreeText ?? null,
        followUpFreeTextWordCount: followUpFreeTextWordCount ?? null,
        followUpCompleted: true,
        followUpCompletedAt: new Date(),
      } as any,
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("API /api/log-followup-study error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
