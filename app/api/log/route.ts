import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Normalize English UI values to canonical Danish so both languages
// land in the same database groups.
const GENDER_MAP: Record<string, string> = {
  male: "Mand",
  female: "Kvinde",
  other: "Andet",
};

const EDUCATION_MAP: Record<string, string> = {
  "primary school": "Grundskole",
  "upper secondary (a-levels / equivalent)": "Gymnasial uddannelse (STX, HF, HTX, HHX)",
  "vocational education": "Erhvervsuddannelse",
  "professional bachelor": "Professionsbachelor",
  "bachelor's degree": "Bachelor",
  "master's degree": "Kandidat",
  "phd or higher": "PhD eller højere",
  "other": "Andet",
};

function normalizeGender(v: string | null | undefined): string | null {
  if (v == null) return null;
  return GENDER_MAP[v.toLowerCase()] ?? v;
}

function normalizeEducation(v: string | null | undefined): string | null {
  if (v == null) return null;
  return EDUCATION_MAP[v.toLowerCase()] ?? v;
}

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
      confidence,
      readingTime,
      pretestQ1,
      pretestQ2,
      pretestQ3,
      pretestQ4,
      pretestScore,
      posttestQ1,
      posttestQ2,
      posttestQ3,
      posttestQ4,
      posttestScore,
      evt1,
      evt2,
      evt3,
      dropoutStep,
    } = body as {
      participantId?: string;
      group?: "control" | "intervention";
      age?: number | null;
      gender?: string | null;
      education?: string | null;
      deviceType?: string | null;
      confidence?: number | null;
      readingTime?: number | null;
      pretestQ1?: number | null;
      pretestQ2?: number | null;
      pretestQ3?: number | null;
      pretestQ4?: number | null;
      pretestScore?: number | null;
      posttestQ1?: number | null;
      posttestQ2?: number | null;
      posttestQ3?: number | null;
      posttestQ4?: number | null;
      posttestScore?: number | null;
      evt1?: number | null;
      evt2?: number | null;
      evt3?: number | null;
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
    if (gender !== undefined)        data.gender = normalizeGender(gender);
    if (education !== undefined)     data.education = normalizeEducation(education);
    if (deviceType !== undefined)    data.deviceType = deviceType ?? null;
    if (confidence !== undefined)    data.confidence = confidence ?? null;
    if (readingTime !== undefined)   data.readingTime = readingTime ?? null;
    if (pretestQ1 !== undefined)     data.pretestQ1 = pretestQ1 ?? null;
    if (pretestQ2 !== undefined)     data.pretestQ2 = pretestQ2 ?? null;
    if (pretestQ3 !== undefined)     data.pretestQ3 = pretestQ3 ?? null;
    if (pretestQ4 !== undefined)     data.pretestQ4 = pretestQ4 ?? null;
    if (pretestScore !== undefined)   data.pretestScore = pretestScore ?? null;
    if (posttestQ1 !== undefined)     data.posttestQ1 = posttestQ1 ?? null;
    if (posttestQ2 !== undefined)     data.posttestQ2 = posttestQ2 ?? null;
    if (posttestQ3 !== undefined)     data.posttestQ3 = posttestQ3 ?? null;
    if (posttestQ4 !== undefined)     data.posttestQ4 = posttestQ4 ?? null;
    if (posttestScore !== undefined)  data.posttestScore = posttestScore ?? null;
    if (evt1 !== undefined)           data.evt1 = evt1 ?? null;
    if (evt2 !== undefined)           data.evt2 = evt2 ?? null;
    if (evt3 !== undefined)           data.evt3 = evt3 ?? null;
    if (dropoutStep !== undefined)    data.dropoutStep = dropoutStep ?? null;

    await prisma.participantLog.upsert({
      where: { participantId },
      update: data as any,
      create: { participantId, ...data } as any,
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("API /api/log error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
