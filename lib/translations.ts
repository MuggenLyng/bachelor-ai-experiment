export type Lang = "da" | "en";

export const T = {
  da: {
    appTitle: "Bachelor-eksperiment",
    loading: "Loader...",

    langToggle: {
      da: "Dansk",
      en: "English",
    },

    consent: {
      title: "Velkommen til Magnus' og Oles psykologi-bacheloreksperiment!",
      intro:
        "Mange tak fordi du har lyst til at bruge tid på vores Psykologi eksperiment:) Det betyder virkelig meget for os!",
      structureLabel: "Strukturen af eksperimentet",
      structureText:
        "Vores eksperiment handler om, hvordan man lærer bedst. Eksperimentet tager ca. 15 minutter og kræver koncentration.",
      structureHighlight: "ca. 15 minutter",
      giveawayTeaser:
        "Alle, der deltager i follow-up-studiet, er med i lodtrækningen om 2 x 500 kr.",

      gdprToggle: "Samtykke til deltagelse i forskningsstudie",

      gdpr: {
        intro:
          "Du inviteres til at deltage i et kort forskningsstudie om læring og brug af AI-baserede chatbots. Studiet udføres som en del af et bachelorprojekt ved Københavns Universitet.",
        purposeLabel: "Formål",
        purposeText:
          "Formålet er at undersøge, hvordan mennesker lærer gennem interaktion med en AI-baseret chatbot efter at have læst en kort tekst.",
        participationLabel: "Hvad indebærer deltagelse",
        participationItems: [
          "Besvare korte spørgsmål om din baggrund (alder, køn, uddannelse)",
          "Besvare en kort pre-test (nogle korte spørgsmål om din forhåndsviden)",
          "Læse en kort informationstekst (mindst 1 minut)",
          "Vurdere din selvtillid og tekstens værdi for dig",
          "Chatte med en AI-assistent i mindst 3,5 minutter",
          "Besvare spørgsmål om din oplevede læring og mentale indsats",
          "Skrive en kort forklaring med egne ord",
          "Besvare en post-test",
          "Mulighed for at deltage i follow-up testen!",
        ],
        dataLabel: "Hvilke data indsamles",
        dataItems: [
          "Alder, køn og uddannelsesbaggrund",
          "Svar på quiz og spørgeskemaer",
          "Chatbeskeder mellem dig og AI-assistenten",
          "En kort fritekstbesvarelse",
          "Tekniske interaktionsdata (fx antal beskeder og tidsstempler)",
        ],
        dataNote:
          "Dine svar gemmes under et pseudonymiseret deltager-ID. Hvis du angiver en e-mail til follow-up studiet, bruges den kun til at sende et opfølgningslink og slettes efter follow-up studiet er afsluttet.",
        technicalLabel: "Teknisk behandling af data",
        technicalText1:
          "Studiet gennemføres via en webapplikation hostet hos Vercel. Dine svar gemmes i en database (PostgreSQL) hos en cloud-udbyder.",
        technicalText2:
          "Under chatdelen behandles beskeder af en AI-model via OpenAI's API. Kun de oplysninger, du selv skriver i chatten eller i spørgeskemaet, sendes til disse tjenester. Oplysningerne anvendes udelukkende til at gennemføre studiet og anvendes ikke til træning af AI-modellen.",
        technicalText3:
          "AI-assistenten kan give upræcise eller forenklede forklaringer. Den bør ikke betragtes som en autoritativ kilde til rådgivning. Interaktionen bruges udelukkende som en del af dette forskningsstudie.",
        technicalText4:
          "Undlad venligst at skrive personlige eller følsomme oplysninger i chatten.",
        legalBasisLabel: "Retsgrundlag",
        legalBasisText:
          "Dine personoplysninger behandles på baggrund af dit samtykke i henhold til GDPR artikel 6, stk. 1, litra a.",
        voluntaryLabel: "Frivillighed",
        voluntaryText:
          "Deltagelse er helt frivillig. Du kan til enhver tid stoppe ved at lukke siden uden negative konsekvenser. Du kan også trække dit samtykke tilbage ved at kontakte os og få indsigt i din data ved efterspørgelse.",
        storageLabel: "Opbevaring af data",
        storageText:
          "Data opbevares pseudonymiseret og bruges udelukkende til forskningsformål i forbindelse med bachelorprojektet. Data slettes eller anonymiseres senest 6 måneder efter projektets afslutning.",
        rightsLabel: "Dine rettigheder",
        rightsText:
          "Du har ret til indsigt i, rettelse og sletning af dine oplysninger samt ret til at begrænse behandlingen. Du har desuden ret til at klage til Datatilsynet (datatilsynet.dk).",
        controllerLabel: "Dataansvarlig",
        controllerText:
          "Magnus Lyng og Ole Thomassen, bachelorstuderende ved Københavns Universitet.",
        contactLabel: "Kontakt",
        contactText: "Magnus Lyng: lyngmagnus@gmail.com\nOle Thomassen: ole-thomassen@hotmail.com",
      },

      checkAge: "Jeg bekræfter, at jeg er mindst 18 år.",
      checkConsent:
        "Jeg har læst informationen ovenfor og giver samtykke til at deltage i studiet og til behandling af mine oplysninger som beskrevet.",
      warningConsent: "Du skal acceptere begge punkter for at gå videre.",
      nextBtn: "Næste →",
    },

    demographics: {
      title: "Baggrundsspørgsmål",
      intro: "Besvar disse korte spørgsmål om dig selv.",
      ageLabel: "Alder",
      agePlaceholder: "fx 23",
      genderLabel: "Køn",
      genderOptions: ["Mand", "Kvinde", "Andet"],
      educationLabel: "Højeste fuldførte uddannelse",
      educationPlaceholder: "Vælg...",
      educationOptions: [
        "Grundskole",
        "Gymnasial uddannelse (STX, HF, HTX, HHX)",
        "Erhvervsuddannelse",
        "Professionsbachelor",
        "Bachelor",
        "Kandidat",
        "PhD eller højere",
        "Andet",
      ],
      warning: "Du skal udfylde alle felter for at gå videre.",
      backBtn: "← Tilbage",
      nextBtn: "Videre →",
    },

    pretest: {
      title: "Test om forhåndsviden",
      intro: "Besvar disse 4 spørgsmål. Svar/gæt dit bedste :) der er ingen konsekvenser.",
      dontKnow: "Ved ikke",
      warning: "Du skal besvare alle spørgsmål for at gå videre.",
      backBtn: "← Tilbage",
      nextBtn: "Videre →",
    },

    questions: [
      {
        question:
          "En person træner meget, men taber sig kun lidt. Hvad er den bedste forklaring?",
        options: [
          "Kroppen kompenserer ved at spare energi andre steder",
          "Kroppen tilpasser sig, så den bruger mindre energi til de samme aktiviteter",
          "Personen har mistet muskelmasse",
          "Kroppen stopper med at bruge energi",
        ],
        correct: 0,
      },
      {
        question:
          "Hvad udgør typisk den største del af en persons daglige energiforbrug?",
        options: [
          "Fysisk aktivitet",
          "Fordøjelse af mad",
          "Basal metabolic rate (BMR)",
          "Hjernens aktivitet",
        ],
        correct: 2,
      },
      {
        question:
          "Hvad er betingelsen for, at kroppen begynder at trække på sine energidepoter?",
        options: [
          "At energiindtaget er lig med energiforbruget",
          "At energiforbruget overstiger energiindtaget",
          "At man øger sin fysiske aktivitet",
          "At BMR falder under et bestemt niveau",
        ],
        correct: 1,
      },
      {
        question:
          "Hvad afgør i sidste ende, om en person taber sig, når personen begynder at være mere fysisk aktiv?",
        options: [
          "Om mere motion altid betyder, at kroppen bruger tilsvarende mere energi",
          "Om energiindtaget over tid er lavere end det samlede energiforbrug",
          "Om kroppen stopper med at lagre energi",
          "Om BMR stiger mere end aktivitetsniveauet",
        ],
        correct: 1,
      },
    ],

    read: {
      title: "Hvordan bruger kroppen energi?",
      instruction: "Læs teksten grundigt. Du skal bruge mindst 1 minut på denne side.",
      text: [
        "Kroppens energibalance kan forstås gennem forholdet mellem energiindtag (Energy Intake, EI) og energiforbrug (Total Energy Expenditure, TEE). Energiindtag kommer fra den mad og de drikkevarer, vi indtager, mens energiforbrug er den samlede mængde energi kroppen bruger i løbet af dagen.",
        "Hvis en person indtager mere energi (EI), end kroppen bruger (TEE), lagres overskydende energi i kroppen som energidepoter, for eksempel fedt. Hvis kroppen derimod bruger mere energi, end man indtager, vil den trække på disse depoter, hvilket over tid kan føre til vægttab. Denne relation kan udtrykkes som: ændring i energidepoter = EI − TEE.",
        "En stor del af energiforbruget kommer fra basal metabolic rate (BMR), som er den energi kroppen bruger i hvile til grundlæggende funktioner som vejrtrækning, blodcirkulation og regulering af kropstemperatur. Derudover bruges energi på fysisk aktivitet, for eksempel når man går, træner eller udfører daglige opgaver.",
        "Man kunne derfor forvente, at mere fysisk aktivitet lineært øger det samlede energiforbrug. Forskning tyder dog på, at kroppen delvist kan tilpasse sit energiforbrug. Ifølge den såkaldte constrained energy model kan kroppen reducere energiforbruget i andre biologiske processer, når aktivitetsniveauet stiger.",
        "Det betyder, at det samlede energiforbrug ikke nødvendigvis stiger proportionalt med mængden af motion. Kroppen kan i stedet kompensere ved at bruge mindre energi på andre processer. Derfor kan effekten af øget fysisk aktivitet på energiforbrug og vægttab være mindre, end man umiddelbart skulle tro.",
      ],
      warning: "Du skal læse teksten i mindst 1 minut.",
      skipDev: "skip timer (dev)",
      nextBtn: "Videre →",
    },

    zpd: {
      title: "Selvvurdering",
      selfEfficacyLabel: "Tro på egne evner",
      selfEfficacyQ: "Jeg føler, at jeg kan forstå selv de svære dele af materialet.",
      selfEfficacyScale: "1 = Passer slet ikke · 5 = Passer fuldstændigt",
      evtLabel: "Vurdering af teksten",
      evtQuestions: [
        "Teksten vil være nyttigt for mig i fremtiden.",
        "Det er vigtigt for mig at forstå teksten godt.",
        "Jeg kan godt lide teksten.",
      ],
      evtScale: "1 = Passer ikke · 2 = Passer næsten ikke · 3 = Passer næsten · 4 = Passer fuldt",
      warning: "Du skal besvare alle spørgsmål for at gå videre.",
      startChatBtn: "Start chat →",
    },

    chat: {
      title: "Chat",
      instruction: "Chat med AI-assistenten i mindst 3,5 minutter.",
      initialMessage: "Du har nu læst teksten. Hvad vil du gerne have hjælp til at forstå bedre?",
      inputPlaceholder: "Skriv en besked...",
      sendBtn: "Send",
      typingIndicator: "Skriver...",
      warning: "Du skal have chattet i mindst 3,5 minutter.",
      skipDev: "skip timer (dev)",
      doneBtn: "Færdig med chat →",
      errorPrefix: "Fejl: ",
    },

    freeText: {
      title: "Anvend teksten i et scenarie",
      scenario:
        "Kim begynder at motionere meget mere end før, men oplever, at vægttabet er mindre end forventet.",
      question:
        "Forklar med egne ord, hvorfor dette kan ske ud fra modellen i teksten, og hvad Kim kunne gøre for at tabe sig yderligere.",
      placeholder: "Skriv her...",
      charCount: (n: number) => `Tegn: ${n} / 250`,
      nextBtn: "Videre →",
    },

    posttest: {
      title: "Post-test",
      intro: "Besvar de samme 4 spørgsmål som i starten.",
      dontKnow: "Ved ikke",
      warning: "Du skal besvare alle spørgsmål for at gå videre.",
      backBtn: "← Tilbage",
      nextBtn: "Videre →",
      saveError: (msg: string) =>
        `Fejl ved gemning af svar: ${msg}\n\nTjek konsollen for detaljer.`,
    },

    survey: {
      title: "Afsluttende spørgsmål",
      experienceLabel: "Oplevelse",
      experienceQuestions: [
        "Jeg lærte meget af at chatte med chatbotten.",
        "Det var en nem samtale med chatbotten.",
        "Chatbotten tilpassede sig mine læringsbehov.",
      ],
      experienceScale: "1 = Meget uenig · 6 = Meget enig",
      mentalEffortLabel: "Mental indsats",
      mentalEffortQ: "I den foregående samtale med chatbotten investerede jeg:",
      mentalEffortOptions: [
        [1, "Meget, meget lav mental indsats"],
        [2, "Meget lav mental indsats"],
        [3, "Lav mental indsats"],
        [4, "Ret lav mental indsats"],
        [5, "Hverken lav eller høj mental indsats"],
        [6, "Ret høj mental indsats"],
        [7, "Høj mental indsats"],
        [8, "Meget høj mental indsats"],
        [9, "Meget, meget høj mental indsats"],
      ] as [number, string][],
      warning: "Du skal besvare alle spørgsmål for at gå videre.",
      nextBtn: "Videre →",
    },

    done: {
      title: "Tak fordi du ville være med!",
      thanks:
        "Det betyder så meget for os, at DU ville være med! Dine svar vil bidrage til vores bachelorprojekt i psykologi.",
      signoff: "— Ole og Magnus",
      contact:
        "Hvis i har nogle spørgsmål kan i evt. kontakte os på:\nlyngmagnus@gmail.com\nole-thomassen@hotmail.com",
      giveawayTitle: "Tag follow-up testen om en uge og vind 500 kr.",
      giveawayText:
        "Vi trækker lod blandt de deltagere, der gennemfører follow-up testen. Skriv din email nedenfor. Du modtager en mail om ca. en uge med et link til en kort follow-up test (5 min). Du er først med i lodtrækningen, når du har gennemført den. Din email bruges kun til dette og knyttes ikke til dine øvrige svar.",
      emailPlaceholder: "din@email.dk",
      signupBtn: "Tilmeld",
      signupConfirm:
        "Du er tilmeldt! Vi sender dig et link til follow-up studiet om cirka en uge, og kontakter dig selvfølgelig hvis du vinder :)",
    },

    followup: {
      appTitle: "Bachelor-eksperiment: Follow-up",
      invalidTitle: "Ugyldigt link",
      invalidText:
        "Dette link er ugyldigt eller udløbet. Tjek at du har brugt det korrekte link fra vores e-mail.",
      invalidContact: "Spørgsmål? Kontakt lyngmagnus@gmail.com",
      introTitle: "Tak fordi du er tilbage! :)",
      introText:
        "Dette er follow-up delen af Magnus og Oles bacheloreksperiment. Det tager kun ca. 5 minutter.",
      introHighlight: "ca. 5 minutter",
      introInstruction:
        "Du vil blive bedt om at forklare emnet fra det første eksperiment med egne ord uden hjælpemidler.",
      introTeaser: "Er du klar til at vinde 500 kr... måske?",
      startBtn: "Start →",
      freeTextTitle: "Anvend teksten i et scenarie",
      freeTextScenario:
        "Kim begynder at motionere meget mere end før, men oplever, at vægttabet er mindre end forventet.",
      freeTextQuestion:
        "Forklar med egne ord, hvorfor dette kan ske ud fra modellen i teksten, og hvad Kim kunne gøre for at tabe sig yderligere.",
      placeholder: "Skriv her...",
      charCount: (n: number) => `Tegn: ${n} / 250`,
      submitBtn: "Afslut →",
      savingBtn: "Gemmer...",
      doneTitle: "Tusind tak!",
      doneText:
        "Du har nu gennemført follow-up studiet. Dine svar er gemt og bidrager enormt til vores bachelorprojekt og dermed til viden om, hvordan man lærer bedst med AI!",
      doneDrawText:
        "Vi trækker lod, og 2 vindere får 500 kr. hver. Vi kontakter vinderne (måske dig?!) på e-mail i slutningen af maj måned 2026.",
      doneHighlight: "500 kr.",
      doneSignoff: "— Ole og Magnus",
      doneContact:
        "PS.!\nHvis i har nogle spørgsmål kan i evt. kontakte os på:\nlyngmagnus@gmail.com\nole-thomassen@hotmail.com",
    },
  },

  en: {
    appTitle: "Bachelor Experiment",
    loading: "Loading...",

    langToggle: {
      da: "Dansk",
      en: "English",
    },

    consent: {
      title: "Welcome to Magnus' and Ole's Psychology Bachelor Experiment!",
      intro:
        "Thank you so much for taking the time to participate in our Psychology experiment :) It really means a lot to us!",
      structureLabel: "Structure of the experiment",
      structureText:
        "Our experiment is about how people learn best. The experiment takes about 15 minutes and requires concentration.",
      structureHighlight: "about 15 minutes",
      giveawayTeaser:
        "All participants who complete the follow-up study will be entered into a draw for 2 × 500 DKK.",

      gdprToggle: "Consent to participate in the research study",

      gdpr: {
        intro:
          "You are invited to participate in a short research study about learning and the use of AI-based chatbots. The study is conducted as part of a bachelor's project at the University of Copenhagen.",
        purposeLabel: "Purpose",
        purposeText:
          "The purpose is to investigate how people learn through interaction with an AI-based chatbot after reading a short text.",
        participationLabel: "What participation involves",
        participationItems: [
          "Answering brief questions about your background (age, gender, education)",
          "Completing a short pre-test (a few questions about your prior knowledge)",
          "Reading a short informational text (at least 1 minute)",
          "Rating your self-confidence and the value of the text for you",
          "Chatting with an AI assistant for at least 3.5 minutes",
          "Answering questions about your perceived learning and mental effort",
          "Writing a brief explanation in your own words",
          "Completing a post-test",
          "Option to participate in the follow-up test!",
        ],
        dataLabel: "What data is collected",
        dataItems: [
          "Age, gender, and educational background",
          "Answers to quizzes and questionnaires",
          "Chat messages between you and the AI assistant",
          "A short free-text response",
          "Technical interaction data (e.g. number of messages and timestamps)",
        ],
        dataNote:
          "Your answers are stored under a pseudonymised participant ID. If you provide an email for the follow-up study, it will only be used to send a follow-up link and will be deleted after the follow-up study is complete.",
        technicalLabel: "Technical data processing",
        technicalText1:
          "The study is conducted via a web application hosted on Vercel. Your answers are stored in a database (PostgreSQL) with a cloud provider.",
        technicalText2:
          "During the chat section, messages are processed by an AI model via OpenAI's API. Only the information you write in the chat or questionnaire is sent to these services. The information is used solely to conduct the study and is not used to train the AI model.",
        technicalText3:
          "The AI assistant may provide imprecise or simplified explanations. It should not be regarded as an authoritative source of advice. The interaction is used solely as part of this research study.",
        technicalText4:
          "Please refrain from writing personal or sensitive information in the chat.",
        legalBasisLabel: "Legal basis",
        legalBasisText:
          "Your personal data is processed based on your consent in accordance with GDPR Article 6(1)(a).",
        voluntaryLabel: "Voluntary participation",
        voluntaryText:
          "Participation is entirely voluntary. You may stop at any time by closing the page without any negative consequences. You may also withdraw your consent by contacting us and request access to your data upon request.",
        storageLabel: "Data storage",
        storageText:
          "Data is stored pseudonymised and used solely for research purposes in connection with the bachelor's project. Data will be deleted or anonymised no later than 6 months after the project is completed.",
        rightsLabel: "Your rights",
        rightsText:
          "You have the right to access, correct, and delete your data, as well as the right to restrict processing. You also have the right to lodge a complaint with the Danish Data Protection Authority (datatilsynet.dk).",
        controllerLabel: "Data controller",
        controllerText:
          "Magnus Lyng and Ole Thomassen, bachelor's students at the University of Copenhagen.",
        contactLabel: "Contact",
        contactText: "Magnus Lyng: lyngmagnus@gmail.com\nOle Thomassen: ole-thomassen@hotmail.com",
      },

      checkAge: "I confirm that I am at least 18 years old.",
      checkConsent:
        "I have read the information above and give my consent to participate in the study and to the processing of my data as described.",
      warningConsent: "You must accept both checkboxes to proceed.",
      nextBtn: "Next →",
    },

    demographics: {
      title: "Background questions",
      intro: "Please answer these brief questions about yourself.",
      ageLabel: "Age",
      agePlaceholder: "e.g. 23",
      genderLabel: "Gender",
      genderOptions: ["Male", "Female", "Other"],
      educationLabel: "Highest completed education",
      educationPlaceholder: "Select...",
      educationOptions: [
        "Primary school",
        "Upper secondary (A-levels / equivalent)",
        "Vocational education",
        "Professional bachelor",
        "Bachelor's degree",
        "Master's degree",
        "PhD or higher",
        "Other",
      ],
      warning: "You must fill in all fields to proceed.",
      backBtn: "← Back",
      nextBtn: "Next →",
    },

    pretest: {
      title: "Prior knowledge test",
      intro: "Answer these 4 questions. Give your best answer/guess :) there are no consequences.",
      dontKnow: "Don't know",
      warning: "You must answer all questions to proceed.",
      backBtn: "← Back",
      nextBtn: "Next →",
    },

    questions: [
      {
        question:
          "A person exercises a lot but loses only little weight. What is the best explanation?",
        options: [
          "The body compensates by saving energy elsewhere",
          "The body adapts so that it uses less energy for the same activities",
          "The person has lost muscle mass",
          "The body stops using energy",
        ],
        correct: 0,
      },
      {
        question:
          "What typically makes up the largest share of a person's daily energy expenditure?",
        options: [
          "Physical activity",
          "Digestion of food",
          "Basal metabolic rate (BMR)",
          "Brain activity",
        ],
        correct: 2,
      },
      {
        question:
          "What is the condition for the body to start drawing on its energy stores?",
        options: [
          "That energy intake equals energy expenditure",
          "That energy expenditure exceeds energy intake",
          "That one increases physical activity",
          "That BMR drops below a certain level",
        ],
        correct: 1,
      },
      {
        question:
          "What ultimately determines whether a person loses weight when they become more physically active?",
        options: [
          "Whether more exercise always means the body uses proportionally more energy",
          "Whether energy intake over time is lower than total energy expenditure",
          "Whether the body stops storing energy",
          "Whether BMR rises more than the activity level",
        ],
        correct: 1,
      },
    ],

    read: {
      title: "How does the body use energy?",
      instruction: "Read the text carefully. You must spend at least 1 minute on this page.",
      text: [
        "The body's energy balance can be understood through the relationship between energy intake (EI) and total energy expenditure (TEE). Energy intake comes from the food and drinks we consume, while energy expenditure is the total amount of energy the body uses throughout the day.",
        "If a person takes in more energy (EI) than the body uses (TEE), the excess energy is stored in the body as energy reserves, for example fat. If the body instead uses more energy than it takes in, it will draw on these reserves, which over time can lead to weight loss. This relationship can be expressed as: change in energy stores = EI − TEE.",
        "A large share of energy expenditure comes from basal metabolic rate (BMR), which is the energy the body uses at rest for basic functions such as breathing, blood circulation, and temperature regulation. Energy is also used for physical activity, for example when walking, exercising, or carrying out daily tasks.",
        "One might therefore expect that more physical activity linearly increases total energy expenditure. However, research suggests that the body can partially adapt its energy expenditure. According to the so-called constrained energy model, the body can reduce energy expenditure in other biological processes when activity level increases.",
        "This means that total energy expenditure does not necessarily increase proportionally with the amount of exercise. The body may instead compensate by using less energy on other processes. Therefore, the effect of increased physical activity on energy expenditure and weight loss may be smaller than one might initially expect.",
      ],
      warning: "You must read the text for at least 1 minute.",
      skipDev: "skip timer (dev)",
      nextBtn: "Next →",
    },

    zpd: {
      title: "Self-assessment",
      selfEfficacyLabel: "Belief in own abilities",
      selfEfficacyQ: "I feel that I can understand even the difficult parts of the material.",
      selfEfficacyScale: "1 = Not at all · 5 = Completely",
      evtLabel: "Assessment of the text",
      evtQuestions: [
        "The text will be useful to me in the future.",
        "It is important to me to understand the text well.",
        "I like the text.",
      ],
      evtScale: "1 = Does not apply · 2 = Barely applies · 3 = Mostly applies · 4 = Fully applies",
      warning: "You must answer all questions to proceed.",
      startChatBtn: "Start chat →",
    },

    chat: {
      title: "Chat",
      instruction: "Chat with the AI assistant for at least 3.5 minutes.",
      initialMessage:
        "You have now read the text. What would you like help understanding better?",
      inputPlaceholder: "Write a message...",
      sendBtn: "Send",
      typingIndicator: "Typing...",
      warning: "You must have chatted for at least 3.5 minutes.",
      skipDev: "skip timer (dev)",
      doneBtn: "Done with chat →",
      errorPrefix: "Error: ",
    },

    freeText: {
      title: "Apply the text to a scenario",
      scenario:
        "Kim starts exercising much more than before, but finds that the weight loss is less than expected.",
      question:
        "Explain in your own words why this might happen based on the model in the text, and what Kim could do to lose more weight.",
      placeholder: "Write here...",
      charCount: (n: number) => `Characters: ${n} / 250`,
      nextBtn: "Next →",
    },

    posttest: {
      title: "Post-test",
      intro: "Answer the same 4 questions as at the start.",
      dontKnow: "Don't know",
      warning: "You must answer all questions to proceed.",
      backBtn: "← Back",
      nextBtn: "Next →",
      saveError: (msg: string) =>
        `Error saving answers: ${msg}\n\nCheck the console for details.`,
    },

    survey: {
      title: "Final questions",
      experienceLabel: "Experience",
      experienceQuestions: [
        "I learned a lot from chatting with the chatbot.",
        "It was an easy conversation with the chatbot.",
        "The chatbot adapted to my learning needs.",
      ],
      experienceScale: "1 = Strongly disagree · 6 = Strongly agree",
      mentalEffortLabel: "Mental effort",
      mentalEffortQ: "In the preceding conversation with the chatbot, I invested:",
      mentalEffortOptions: [
        [1, "Very, very low mental effort"],
        [2, "Very low mental effort"],
        [3, "Low mental effort"],
        [4, "Rather low mental effort"],
        [5, "Neither low nor high mental effort"],
        [6, "Rather high mental effort"],
        [7, "High mental effort"],
        [8, "Very high mental effort"],
        [9, "Very, very high mental effort"],
      ] as [number, string][],
      warning: "You must answer all questions to proceed.",
      nextBtn: "Next →",
    },

    done: {
      title: "Thank you for participating!",
      thanks:
        "It means so much to us that YOU took part! Your answers will contribute to our bachelor's project in psychology.",
      signoff: "— Ole and Magnus",
      contact:
        "If you have any questions, you are welcome to contact us at:\nlyngmagnus@gmail.com\nole-thomassen@hotmail.com",
      giveawayTitle: "Take the follow-up test in a week and win 500 DKK.",
      giveawayText:
        "We will draw lots among participants who complete the follow-up test. Enter your email below. You will receive an email in about a week with a link to a short follow-up test (5 min). You are only entered in the draw once you have completed it. Your email is used only for this purpose and is not linked to your other responses.",
      emailPlaceholder: "your@email.com",
      signupBtn: "Sign up",
      signupConfirm:
        "You're signed up! We'll send you a link to the follow-up study in about a week, and of course contact you if you win :)",
    },

    followup: {
      appTitle: "Bachelor Experiment: Follow-up",
      invalidTitle: "Invalid link",
      invalidText:
        "This link is invalid or has expired. Please check that you used the correct link from our email.",
      invalidContact: "Questions? Contact lyngmagnus@gmail.com",
      introTitle: "Thank you for coming back! :)",
      introText:
        "This is the follow-up part of Magnus and Ole's bachelor experiment. It only takes about 5 minutes.",
      introHighlight: "about 5 minutes",
      introInstruction:
        "You will be asked to explain the topic from the first experiment in your own words without any aids.",
      introTeaser: "Ready to win 500 DKK... maybe?",
      startBtn: "Start →",
      freeTextTitle: "Apply the text to a scenario",
      freeTextScenario:
        "Kim starts exercising much more than before, but finds that the weight loss is less than expected.",
      freeTextQuestion:
        "Explain in your own words why this might happen based on the model in the text, and what Kim could do to lose more weight.",
      placeholder: "Write here...",
      charCount: (n: number) => `Characters: ${n} / 250`,
      submitBtn: "Finish →",
      savingBtn: "Saving...",
      doneTitle: "Thank you so much!",
      doneText:
        "You have now completed the follow-up study. Your answers are saved and contribute enormously to our bachelor's project and thus to knowledge about how people learn best with AI!",
      doneDrawText:
        "We will draw lots, and 2 winners will receive 500 DKK each. We will contact the winners (maybe you?!) by email at the end of May 2026.",
      doneHighlight: "500 DKK",
      doneSignoff: "— Ole and Magnus",
      doneContact:
        "PS.!\nIf you have any questions, you are welcome to contact us at:\nlyngmagnus@gmail.com\nole-thomassen@hotmail.com",
    },
  },
} as const;
