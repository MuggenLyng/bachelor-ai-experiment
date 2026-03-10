import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { participantId, email, followUpToken } = body as {
      participantId?: string;
      email?: string;
      followUpToken?: string;
    };

    if (!participantId || !email || !followUpToken) {
      return NextResponse.json(
        { error: "Missing participantId, email or followUpToken" },
        { status: 400 }
      );
    }

    await prisma.participantLog.upsert({
      where: { participantId },
      update: { email, followUpToken },
      create: { participantId, email, followUpToken },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("API /api/log-followup error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
