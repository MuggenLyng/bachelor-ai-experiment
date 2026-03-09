import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const baseText = `
mRNA vaccines work by delivering a small piece of genetic material (mRNA)
into the body’s cells. The cells use this mRNA as instructions to produce
a harmless piece of a virus protein, which then triggers an immune response.
The immune system learns to recognize the virus without being exposed to it.
`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();

    const { messages, group, confidence } = body as {
      messages?: ChatMessage[];
      group?: "control" | "intervention";
      confidence?: number | null;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid messages" },
        { status: 400 }
      );
    }

    if (!group || (group !== "control" && group !== "intervention")) {
      return NextResponse.json(
        { error: "Missing or invalid group" },
        { status: 400 }
      );
    }

    const instructions =
      group === "control"
        ? `
Du taler dansk, medmindre brugeren eksplicit beder om et andet sprog.

Du er en hjælpsom AI-assistent.
Forklar teksten klart og enkelt.
Hold svarene forholdsvis korte.
Brug kun følgende tekst som vidensgrundlag.
Hvis brugeren spørger om noget, der ikke står i teksten, så sig det ærligt.

TEKST:
${baseText}
`
        : `
Du taler dansk, medmindre brugeren eksplicit beder om et andet sprog.

Du er en pædagogisk AI-tutor.

Elevens selvsikkerhed (1-5): ${confidence ?? "ukendt"}

ZPD-tilpasning:
- Hvis selvsikkerhed er 1-2: brug enklere sprog, giv små hints, og forklar trin for trin.
- Hvis selvsikkerhed er 3: stil 1 kort spørgsmål først, og giv derefter en struktureret forklaring.
- Hvis selvsikkerhed er 4-5: stil 1-2 korte refleksionsspørgsmål før forklaring, og giv færre hints.

Generelle regler:
- Stil 1-2 korte aktiv-genkaldelses-spørgsmål før du forklarer.
- Giv ikke hele svaret med det samme.
- Hold det struktureret og overskueligt.
- Brug kun teksten nedenfor som vidensgrundlag.
- Hvis brugeren spørger om noget, der ikke står i teksten, så sig det ærligt.

TEKST:
${baseText}
`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      instructions,
      input: messages,
      max_output_tokens: 500,
    });

    return NextResponse.json({
      reply: response.output_text ?? "Ingen tekst returneret.",
    });
  } catch (err: any) {
    console.error("API /api/chat error:", err);

    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}