import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      participantId,
      trust1,
      trust2,
      trust3,
    } = body as {
      participantId?: string;
      trust1?: number | null;
      trust2?: number | null;
      trust3?: number | null;
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
        trust1: trust1 ?? null,
        trust2: trust2 ?? null,
        trust3: trust3 ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("API /api/log-chat-survey error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
