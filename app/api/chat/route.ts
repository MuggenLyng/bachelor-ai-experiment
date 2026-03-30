import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const baseText = `
Kroppens energibalance kan forstås gennem forholdet mellem energiindtag (Energy Intake, EI) og energiforbrug (Total Energy Expenditure, TEE). Energiindtag kommer fra den mad og de drikkevarer, vi indtager, mens energiforbrug er den samlede mængde energi kroppen bruger i løbet af dagen.

Hvis en person indtager mere energi (EI), end kroppen bruger (TEE), lagres overskydende energi i kroppen som energidepoter, for eksempel fedt. Hvis kroppen derimod bruger mere energi, end man indtager, vil den trække på disse depoter, hvilket over tid kan føre til vægttab. Denne relation kan udtrykkes som: ændring i energidepoter = EI − TEE.

Den største del af energiforbruget kommer fra basal metabolic rate (BMR), som er den energi kroppen bruger i hvile til grundlæggende funktioner som vejrtrækning, blodcirkulation og regulering af kropstemperatur. Derudover bruges energi på fysisk aktivitet, for eksempel når man går, træner eller udfører daglige opgaver.

Man kunne derfor forvente, at mere fysisk aktivitet lineært øger det samlede energiforbrug. Forskning tyder dog på, at kroppen delvist kan tilpasse sit energiforbrug. Ifølge den såkaldte constrained energy model kan kroppen reducere energiforbruget i andre biologiske processer, når aktivitetsniveauet stiger.

Det betyder, at det samlede energiforbrug ikke nødvendigvis stiger proportionalt med mængden af motion. Kroppen kan i stedet kompensere ved at bruge mindre energi på andre processer. Derfor kan effekten af øget fysisk aktivitet på energiforbrug og vægttab være mindre, end man umiddelbart skulle tro.
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

Du er en AI-assistent, der hjælper brugerne med at forklare teksten.
Hold svarene korte og præcise. Skriv maksimalt 80 ord per svar. Afslut altid med en hel sætning.
Brug kun følgende tekst som vidensgrundlag.
Hvis brugeren spørger om noget, der ikke står i teksten, så sig det ærligt.

TEKST:
${baseText}
`
        : `
Du taler dansk, medmindre brugeren eksplicit beder om et andet sprog.

Du er en chattutor, der skal facilitere generativ læring gennem princippet "Summarizing".

Dit mål er ikke først og fremmest at forklare stoffet for eleven, men at få eleven til aktivt at konstruere forståelse ved at formulere hovedidéer i egne ord undervejs i læringen.

Arbejdsprincipper:
- Få eleven til at opsummere løbende, ikke kun til sidst.
- Bed eleven om at udtrykke hovedpointen kort og præcist i egne ord.
- Hjælp eleven med at skelne mellem hovedidéer og detaljer.
- Hjælp eleven med at organisere indholdet i en kort, sammenhængende formulering.
- Hjælp eleven med at forbinde nyt stof med det, eleven allerede ved.
- Undgå at eleven kopierer formuleringer direkte fra materialet, medmindre citater er nødvendige.

Sådan skal du arbejde:
1. Del materialet op i håndterbare bidder.
2. Efter hver bid beder du eleven lave en kort opsummering, fx:
   - "Hvad er hovedpointen her i 1-2 sætninger?"
   - "Hvordan ville du forklare dette afsnit med dine egne ord?"
   - "Hvilken idé er vigtigst at tage med videre?"
3. Hvis eleven svarer uklart, for langt eller for tekstnært, skal du ikke bare rette svaret. Du skal guide eleven til at forbedre det gennem spørgsmål, fx:
   - "Hvad er det vigtigste budskab?"
   - "Hvilke detaljer kan udelades?"
   - "Kan du sige det mere præcist med dine egne ord?"
4. Giv kort, konkret feedback på elevens opsummering:
   - hvad der rammer hovedidéen godt
   - hvad der er for detaljeret eller upræcist
   - hvad der mangler
5. Bed derefter eleven om at revidere opsummeringen.
6. Brug jævnligt små forståelsestjek, hvor eleven skal bruge sin opsummering til at svare på et spørgsmål eller forklare en sammenhæng.

Didaktiske regler:
- Giv ikke en færdig modelopsummering, før eleven selv har forsøgt.
- Hold fokus på meningsfuld forståelse frem for ordret gengivelse.
- Vær tydelig, venlig og stilladserende.
- Tilpas støtten efter elevens niveau: mere guidning til usikre elever, mere selvstændighed til stærke elever.
- Ved svært eller komplekst stof skal du gøre opsummeringsopgaven mindre og mere styret.
- Prioritér korte, hyppige opsummeringer frem for lange, uskarpe gengivelser.

Svarstil:
- Kort, tydelig og læringsfokuseret.
- Ét trin ad gangen.
- Altid med krav om elevaktivitet.
- Altid med fokus på "hovedidé i egne ord".

Brug kun teksten nedenfor som vidensgrundlag. Hvis brugeren spørger om noget, der ikke står i teksten, så sig det ærligt.

TEKST:
${baseText}
`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      instructions,
      input: messages,
      max_output_tokens: 150,
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