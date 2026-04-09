"""
fritekst_kode.py — Manuel kodning af fritekst-besvarelser (0–1 per parameter).

Rubrik (6 parametre, alle 0/1):
  A1 energibalance   — Vægttab afhænger eksplicit af forholdet EI vs TEE
  A2 kompensation    — Kroppen reducerer energiforbrug i ANDRE processer ved øget motion
  A3 konsekvens_tee  — TEE stiger ikke proportionalt → vægttab mindre end forventet
  A4 kim_kobling     — Forklaringen anvendes eksplicit på Kim (ikke kun generel teori)
  B1 loesning_ei     — Foreslår at reducere EI / spise mindre / skabe større energiunderskud
  B2 loesning_model  — Løsningen begrundes med energibalance-modellen / kompensationsideen
"""

import pandas as pd
from scipy import stats

# ── Kodning ───────────────────────────────────────────────────────────────────
# fmt: off
#                                                               A1  A2  A3  A4  B1  B2
SCORES = [
  # "kroppen bruger mindre energi på at være i gang... spise sundere"
  # A1: nej (ingen EI vs TEE) A2: ja A3: nej A4: ja (hans krop) B1: ja B2: nej
  ("47e8e70c-8048-411a-b9ee-569250879a17",                       0,  1,  0,  1,  1,  0),

  # "energiindtag er større end hans energiforbrug" — EI>TEE, men ingen kompensation
  # A1: ja A2: nej A3: nej A4: ja (Kims) B1: nej B2: nej
  ("b1e2ecfd-57e7-4909-a064-be9432186272",                       1,  0,  0,  1,  0,  0),

  # "BMR... kroppen sparer og kompenserer... holder på energi"
  # A1: nej A2: ja A3: nej A4: ja (hans BMR) B1: nej (kostændringer for vagt) B2: nej
  ("4f0101b1-c1e8-40f1-ac5b-17b4a067b71a",                       0,  1,  0,  1,  0,  0),

  # "kroppen reducerer andre processer (fordøjelse, kropsvarme)"
  # A1: ja (EI lavere end TEE) A2: ja A3: nej A4: nej (generelt) B1: ja (moderate mængder) B2: nej
  ("9dfb4037-63f6-4317-a85b-d00aee4bfe31",                       1,  1,  0,  0,  1,  0),

  # "ikke lineært... spare energi på andre aktiviteter... Man opnår ikke ønskede TEE"
  # A1: ja (energibalancen) A2: ja A3: ja (TEE stiger ikke) A4: nej (kun "man") B1: nej B2: nej
  ("c3d88702-28e3-4076-976f-320086107639",                       1,  1,  1,  0,  0,  0),

  # "basale energiforbrug falder... ikke forbrænde særligt mange flere kalorier... begrænse energioptag"
  # A1: nej A2: ja A3: ja ("ikke forbrænde særligt mange flere") A4: ja (hans) B1: ja B2: nej
  ("f10630c4-7386-459c-b6af-bb6fecba9178",                       0,  1,  1,  1,  1,  0),

  # "fokusere på EI og forbænding... ikke lineært... for at nå 250 ord"
  # A1: ja (EI + forbænding) A2: nej A3: ja (ikke lineært) A4: ja (Kim) B1: ja (implicit: EI) B2: nej
  ("1aa78112-6b72-4c1d-974b-8639a78529b0",                       1,  0,  1,  1,  1,  0),

  # "Kims EI højere/nær TEE... Kim ikke når energidepoterne"
  # A1: ja A2: nej A3: nej (årsag = EI>TEE, ikke kompensation) A4: ja B1: ja B2: nej
  ("14c6375d-73c2-4164-81f9-e52df12ca18f",                       1,  0,  0,  1,  1,  0),

  # "EI er større end TEE [forkert retning!]... kroppen bruger mindre energi på andre processer... Kim reducere/tilpasse"
  # A1: nej (forkert retning: EI>TEE for vægttab?) A2: ja A3: nej A4: ja B1: ja B2: ja (pga kompensation → reducer EI)
  ("90024121-078e-4d48-8858-5fdc80d47355",                       0,  1,  0,  1,  1,  1),

  # "kroppen bruger mindre energi på andre processor... mindske energiindtag + øge forbrug"
  # A1: ja A2: ja A3: nej A4: ja B1: ja B2: nej (løsning kobles ikke eksplicit til kompensation)
  ("b4e5ac23-6903-47bd-afa9-5e228f048970",                       1,  1,  0,  1,  1,  0),

  # Engelsk, forkert mekanisme ("more efficient at running"), "her" for Kim, ingen løsning
  # A1: nej A2: nej A3: nej A4: nej B1: nej B2: nej
  ("0b9fe50b-9538-4a87-bf0a-894544b74994",                       0,  0,  0,  0,  0,  0),

  # "Constrained energy model... bruger mindre energi på andre processor... stiger ikke som forventet... sænke EI"
  # A1: ja A2: ja A3: ja A4: ja B1: ja B2: ja — perfekt
  ("97c2f522-dba8-4a7a-887e-c10c23be4e42",                       1,  1,  1,  1,  1,  1),

  # "kroppen holder på og passer på energien... ikke proportionelt... ikke indtage så mange kalorier"
  # A1: ja A2: nej (for vagt — "holder på energien" ≠ reducerer andre processer) A3: ja A4: ja B1: ja B2: nej
  ("9c97035b-2dee-4dd9-b4c9-fb48a47d8f43",                       1,  0,  1,  1,  1,  0),

  # "TEE stiger ikke voldsomt... nedregulere andre mekanismer... spise mindre, mindske EI"
  # A1: ja A2: ja A3: ja A4: ja B1: ja B2: nej (kombineret løsning uden eksplicit model-begrundelse)
  ("f9ad8823-5a44-49bd-a9f4-a9e8ac92c510",                       1,  1,  1,  1,  1,  0),

  # "kalorier > forbrug... vægttab mindre end forventet... spise/faste"
  # A1: ja A2: nej A3: nej (årsag er EI>TEE, ikke kompensation) A4: ja B1: ja B2: nej
  ("6a3f5f0b-640d-4755-b3e9-82310fb48c2f",                       1,  0,  0,  1,  1,  0),

  # "krop nedsætter sit energiforbrug... ikke nok at øge træning... energiindtag lavere end forbrug"
  # A1: ja A2: nej (mangler "andre steder") A3: ja A4: ja B1: ja B2: ja ("dermed" kobler til kompensation)
  ("13a9c2dc-5db0-45f4-9f85-f92af4a997a6",                       1,  0,  1,  1,  1,  1),

  # "bruge mindre energi på andre poster/funktioner... reducere madindtag"
  # A1: nej A2: ja A3: nej A4: ja (hans) B1: ja B2: nej
  ("5c05000c-3168-4b27-9e5b-23bbf97fcba7",                       0,  1,  0,  1,  1,  0),

  # "reducere energiforbruget andre steder... mere effektivt at reducere energiindtag"
  # A1: nej A2: ja A3: ja ("ikke nødvendigvis mere energi") A4: nej ("man/kroppen") B1: ja B2: ja (ud fra modellen)
  ("64d0b888-9194-48ad-8769-79f9391482c0",                       0,  1,  1,  0,  1,  1),

  # "regulere energiforbruget ned på vejrtrækning og blodcirkulation... vægten ikke falde som forventet"
  # A1: nej A2: ja A3: ja A4: ja B1: nej B2: nej
  ("d05ca7fe-c222-4357-9425-c973c7e0f262",                       0,  1,  1,  1,  0,  0),

  # "regulerer andre steder... mindske energiforbruget... spise mindre"
  # A1: nej A2: ja A3: nej A4: ja B1: ja B2: nej (begrundelsen er hvad der sker når man spiser mindre, ikke original kompensation)
  ("faf9ef5a-4f56-432e-8e0b-941e6a77c934",                       0,  1,  0,  1,  1,  0),

  # "BMR falder, omfordeler energi... EI < TEE... spise det samme som før"
  # A1: ja A2: ja A3: nej (implicit men ikke eksplicit) A4: ja B1: ja B2: ja ("grundlæggende" kobler)
  ("99ea2c3d-d249-4b3f-9ad6-32ba61ca5c51",                       1,  1,  0,  1,  1,  1),

  # "stofskifte nedsat... sparer på energien fx temperaturregulering... nedsætte energiindtag"
  # A1: nej A2: ja A3: nej A4: ja B1: ja B2: ja ("skal OGSÅ nedsætte energiindtag" — kobles til stofskifte)
  ("f218b040-ee23-4538-825f-ce9cca2b186f",                       0,  1,  0,  1,  1,  1),

  # "TEE, EI, biologiske processer... reducere EI → øge forskel EI/TEE" — bedste tekst
  # A1: ja A2: ja A3: ja A4: ja B1: ja B2: ja
  ("11c20b09-dba5-4dd9-b778-4ea060863531",                       1,  1,  1,  1,  1,  1),

  # "spiser muligvis for meget... krop kompenserer måske" — meget svag
  # A1: nej A2: nej A3: nej A4: ja B1: ja B2: nej
  ("4c279909-68f6-44d0-95b4-e36966918fff",                       0,  0,  0,  1,  1,  0),

  # "skrue ned for energiindtag... spiser for fed mad... forbrug overstiger indtag"
  # A1: ja A2: nej A3: nej A4: ja B1: ja B2: nej
  ("05841b1c-e405-4ad4-b74f-c9f0ced6d735",                       1,  0,  0,  1,  1,  0),

  # "nedjusterer metabolismen... måske træne endnu mere? dddddddddddddd"
  # A1: nej A2: nej (for vagt — se rubrik: "Stofskiftet ændrer sig" giver ikke 1) A3: nej A4: ja B1: nej (forkert løsning) B2: nej
  ("e457e097-a7c3-4cd1-83e7-984dde7b1623",                       0,  0,  0,  1,  0,  0),

  # "sund BMR via hvile" — forkert løsning, ingen forklaring
  # A1: nej A2: nej A3: nej A4: ja B1: nej B2: nej
  ("ba5f4289-e2af-4e7c-a02f-2f5aba673d7d",                       0,  0,  0,  1,  0,  0),
]
# fmt: on

cols = ["participantId", "A1_energibalance", "A2_kompensation", "A3_konsekvens_tee",
        "A4_kim_kobling", "B1_loesning_ei", "B2_loesning_model"]
df_coded = pd.DataFrame(SCORES, columns=cols)
param_cols = ["A1_energibalance", "A2_kompensation", "A3_konsekvens_tee",
              "A4_kim_kobling", "B1_loesning_ei", "B2_loesning_model"]
df_coded["total"] = df_coded[param_cols].sum(axis=1)
df_coded["total_norm"] = df_coded["total"] / 6  # 0–1 normaliseret

# ── Match med gruppe fra databaseeksport ──────────────────────────────────────
try:
    raw = pd.read_csv("data/raw/latest.csv")
    grp = raw[["participantId", "group", "completed"]].drop_duplicates()
    df = df_coded.merge(grp, on="participantId", how="left")
    print(f"\n  Matchede {df['group'].notna().sum()} af {len(df)} deltagere med gruppe")
except FileNotFoundError:
    print("  OBS: data/raw/latest.csv ikke fundet — gruppe-match springes over")
    df = df_coded.copy()
    df["group"] = None

# ── Gem ───────────────────────────────────────────────────────────────────────
import os
os.makedirs("data/processed", exist_ok=True)
df.to_csv("data/processed/fritekst_coded.csv", index=False)
print(f"\n  Gemt → data/processed/fritekst_coded.csv")

# ── Deskriptiv ────────────────────────────────────────────────────────────────
print("\n=== DESKRIPTIV ===")
print(f"\n  Alle (N={len(df)}):")
print(f"    Total score M={df['total'].mean():.2f} ± {df['total'].std():.2f}  (0–6)")
print(f"    Normeret    M={df['total_norm'].mean():.2f} ± {df['total_norm'].std():.2f} (0–1)")

print(f"\n  Andel 1 per parameter:")
for c in param_cols:
    pct = df[c].mean() * 100
    print(f"    {c:<25}: {pct:.0f}%")

# ── T-test: intervention vs control ───────────────────────────────────────────
# Utilstrækkelige besvarelser — eksplicit fyld, for kort, forkert sprog, self-admitted manglende engagement
# ba5f4289: 1 sætning, forkert løsning ("hvile")
# e457e097: "dddddddddddddd" fyld + "er ikke klar over hvad han bør gøre"
# 1aa78112: eksplicit "(for at nå 250 ord)" — indrømmer fyld
# 90024121: "ikkkkkkkkkkkke meeeeeeere at skrive" — eksplicit fyld
# faf9ef5a: "………………………………………………….,,,,..,,,,……" — lang padding-streng
# 0b9fe50b: Engelsk svar, bruger "her/she" for Kim — ikke engageret i dansk tekst
# 9dfb4037: "Har nok ikke læst grundigt nok i teksten 🤔" — self-admitted
EXCLUDE = {
    "ba5f4289-e2af-4e7c-a02f-2f5aba673d7d",  # "hvile" — 1 sætning
    "e457e097-a7c3-4cd1-83e7-984dde7b1623",  # "dddddddddddddd"
    "1aa78112-6b72-4c1d-974b-8639a78529b0",  # "for at nå 250 ord"
    "90024121-078e-4d48-8858-5fdc80d47355",  # "ikkkkkkkkkkkke meeeeeeere"
    "faf9ef5a-4f56-432e-8e0b-941e6a77c934",  # "………………,,,,..,,,,……"
    "0b9fe50b-9538-4a87-bf0a-894544b74994",  # engelsk + "her" for Kim
    "9dfb4037-63f6-4317-a85b-d00aee4bfe31",  # "har nok ikke læst grundigt nok"
}

if "group" in df.columns and df["group"].notna().any():
    df_test = df[~df["participantId"].isin(EXCLUDE)]
    ctrl = df_test[df_test["group"] == "control"]["total"].dropna()
    intr = df_test[df_test["group"] == "intervention"]["total"].dropna()

    print(f"\n=== T-TEST: INTERVENTION vs CONTROL ===")
    print(f"  control:      N={len(ctrl)}, M={ctrl.mean():.2f}, SD={ctrl.std():.2f}")
    print(f"  intervention: N={len(intr)}, M={intr.mean():.2f}, SD={intr.std():.2f}")

    if len(ctrl) >= 2 and len(intr) >= 2:
        t, p = stats.ttest_ind(intr, ctrl, equal_var=False)
        pooled_sd = ((ctrl.std()**2 + intr.std()**2) / 2) ** 0.5
        d = (intr.mean() - ctrl.mean()) / pooled_sd if pooled_sd > 0 else 0
        diff = intr.mean() - ctrl.mean()
        direction = "intervention > control" if diff > 0 else "control > intervention"
        print(f"\n  diff={diff:+.2f}, t={t:.3f}, p={p:.3f}, d={d:.2f}  [{direction}]")
        print(f"  {'SIGNIFIKANT *' if p < 0.05 else 'Ikke signifikant'} (α=.05)")
    else:
        print("  For få deltagere per gruppe til t-test")

    # Per parameter
    print(f"\n  Per parameter (ctrl M → intr M):")
    for c in param_cols:
        ci = df_test[df_test["group"] == "control"][c].dropna()
        ii = df_test[df_test["group"] == "intervention"][c].dropna()
        if len(ci) >= 2 and len(ii) >= 2:
            _, pp = stats.ttest_ind(ii, ci, equal_var=False)
            star = " *" if pp < 0.05 else ""
            print(f"    {c:<25}: ctrl={ci.mean():.2f}  intr={ii.mean():.2f}  p={pp:.3f}{star}")

if __name__ == "__main__":
    pass
