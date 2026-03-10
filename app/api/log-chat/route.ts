import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { participantId, messages, dropoutStep, chatDuration } = body as {
      participantId?: string;
      messages?: ChatMessage[];
      dropoutStep?: string | null;
      chatDuration?: number | null;
    };

    if (!participantId) {
      return NextResponse.json(
        { error: "Missing participantId" },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Missing or invalid messages" },
        { status: 400 }
      );
    }

    const userMessageCount = messages.filter((m) => m.role === "user").length;
    const assistantMessageCount = messages.filter(
      (m) => m.role === "assistant"
    ).length;
    const chatMessageCount = messages.length;
    const chatTranscript = JSON.stringify(messages);

    await prisma.participantLog.update({
      where: { participantId },
      data: {
        chatTranscript,
        chatMessageCount,
        userMessageCount,
        assistantMessageCount,
        chatDuration: chatDuration ?? null,
        dropoutStep: dropoutStep ?? null,
      } as any,
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("API /api/log-chat error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
