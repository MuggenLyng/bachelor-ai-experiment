"""
06_process.py — Eksplorativ procesanalyse af chat-adfærd.

Sammenligner procesvariabler mellem kontrol og intervention:
  - chatDuration, assistantMessageCount, userMessageCount, chatMessageCount
  - totalWordsUser, meanUserMessageLength        (afledt fra chatTranscript, bruger)
  - totalWordsAssistant, meanAssistantMessageLength (afledt fra chatTranscript, assistent)
  - questionCountUser, questionRatio             (afledt fra chatTranscript)

Korrelationer (Pearson + Spearman) med primær outcome (codeTotal):
  - questionRatio, totalWordsUser, meanUserMessageLength, chatDuration
"""

import json
import pandas as pd
import numpy as np
from scipy import stats


def _parse_msgs(transcript_str, role):
    """Returnerer liste af beskeder for given rolle fra chatTranscript JSON."""
    if pd.isna(transcript_str):
        return []
    try:
        msgs = json.loads(transcript_str)
        return [m["content"] for m in msgs if m.get("role") == role]
    except Exception:
        return []


def _ttest(label, ctrl, intr):
    if len(ctrl) < 2 or len(intr) < 2:
        print(f"  {label}: for få observationer")
        return
    res = stats.ttest_ind(intr, ctrl, equal_var=False)
    t, p, df_w = res.statistic, res.pvalue, res.df
    d = (intr.mean() - ctrl.mean()) / np.sqrt((ctrl.std()**2 + intr.std()**2) / 2)
    sig = "*" if p < 0.05 else "n.s."
    print(f"  {label}")
    print(f"    Kontrol:      M={ctrl.mean():.2f}, SD={ctrl.std():.2f}, N={len(ctrl)}")
    print(f"    Intervention: M={intr.mean():.2f}, SD={intr.std():.2f}, N={len(intr)}")
    print(f"    t({df_w:.2f}) = {t:.3f}, p = {p:.3f}, d = {d:.3f}  {sig}")


def run():
    print("=== 06 PROCESANALYSE ===")
    df = pd.read_csv("data/processed/processed.csv")

    # ── Afled chat-procesvariabler fra chatTranscript ────────────────────────
    user_msgs_list  = df["chatTranscript"].apply(lambda x: _parse_msgs(x, "user"))
    asst_msgs_list  = df["chatTranscript"].apply(lambda x: _parse_msgs(x, "assistant"))

    # Bruger
    df["totalWordsUser"] = user_msgs_list.apply(
        lambda msgs: sum(len(m.split()) for m in msgs)
    )
    df["meanUserMessageLength"] = df.apply(
        lambda row: row["totalWordsUser"] / row["userMessageCount"]
        if row["userMessageCount"] > 0 else np.nan, axis=1,
    )
    df["questionCountUser"] = user_msgs_list.apply(
        lambda msgs: sum(1 for m in msgs if "?" in m)
    )
    df["questionRatio"] = df.apply(
        lambda row: row["questionCountUser"] / row["userMessageCount"]
        if row["userMessageCount"] > 0 else np.nan, axis=1,
    )
    df["questionCountAssistant"] = asst_msgs_list.apply(
        lambda msgs: sum(1 for m in msgs if "?" in m)
    )
    df["questionRatioAssistant"] = df.apply(
        lambda row: row["questionCountAssistant"] / row["assistantMessageCount"]
        if row["assistantMessageCount"] > 0 else np.nan, axis=1,
    )

    # Tempo-normaliserede mål (kræver chatDuration i ms)
    def safe_div(a, b):
        return a / b if b and b > 0 else np.nan

    df["msgPerMinUser"]      = df.apply(lambda r: safe_div(r["userMessageCount"],      r["chatDuration"] / 1000 / 60), axis=1)
    df["msgPerMinAssistant"] = df.apply(lambda r: safe_div(r["assistantMessageCount"], r["chatDuration"] / 1000 / 60), axis=1)
    df["msgPerMinTotal"]     = df.apply(lambda r: safe_div(r["chatMessageCount"],      r["chatDuration"] / 1000 / 60), axis=1)
    df["secPerUserMsg"]      = df.apply(lambda r: safe_div(r["chatDuration"] / 1000,   r["userMessageCount"]),          axis=1)
    df["wordsPerMinUser"]    = df.apply(lambda r: safe_div(r["totalWordsUser"],        r["chatDuration"] / 1000 / 60), axis=1)

    # Assistent
    df["totalWordsAssistant"] = asst_msgs_list.apply(
        lambda msgs: sum(len(m.split()) for m in msgs)
    )
    df["meanAssistantMessageLength"] = df.apply(
        lambda row: row["totalWordsAssistant"] / row["assistantMessageCount"]
        if row["assistantMessageCount"] > 0 else np.nan, axis=1,
    )

    ctrl = df[df["group"] == "control"]
    intr = df[df["group"] == "intervention"]

    # ── 1) Basale chat-variabler ─────────────────────────────────────────────
    print(f"\n{'─'*60}")
    print("  [1] Basale chat-variabler (Welch t-test)")
    print(f"{'─'*60}")

    for col, label in [
        ("chatDuration",          "Chat varighed (ms)"),
        ("chatMessageCount",      "Beskeder i alt"),
        ("userMessageCount",      "Brugerbeskeder"),
        ("assistantMessageCount", "Assistentbeskeder"),
    ]:
        _ttest(label, ctrl[col].dropna(), intr[col].dropna())
        print()

    # ── 1b) Tempo-normaliserede mål ──────────────────────────────────────────
    print(f"{'─'*60}")
    print("  [1b] Beskeder per minut (tempo-normaliserede mål)")
    print(f"{'─'*60}")

    for col, label in [
        ("msgPerMinUser",      "Brugerbeskeder/min"),
        ("msgPerMinAssistant", "Assistentbeskeder/min"),
        ("msgPerMinTotal",     "Total beskeder/min"),
        ("secPerUserMsg",      "Sekunder per brugerbesked"),
        ("wordsPerMinUser",    "Brugerord/min"),
    ]:
        _ttest(label, ctrl[col].dropna(), intr[col].dropna())
        print()

    # ── 2) Afledte indholdsmål — bruger ─────────────────────────────────────
    print(f"{'─'*60}")
    print("  [2] Afledte indholdsmål — bruger (fra chatTranscript)")
    print(f"{'─'*60}")

    for col, label in [
        ("totalWordsUser",        "Ord i alt (bruger)"),
        ("meanUserMessageLength", "Gns. beskedlængde, bruger (ord)"),
    ]:
        _ttest(label, ctrl[col].dropna(), intr[col].dropna())
        print()

    # ── 3) Afledte indholdsmål — assistent ──────────────────────────────────
    print(f"{'─'*60}")
    print("  [3] Afledte indholdsmål — assistent (fra chatTranscript)")
    print(f"{'─'*60}")

    for col, label in [
        ("totalWordsAssistant",          "Ord i alt (assistent)"),
        ("meanAssistantMessageLength",   "Gns. beskedlængde, assistent (ord)"),
    ]:
        _ttest(label, ctrl[col].dropna(), intr[col].dropna())
        print()

    # ── 4) Spørgsmålsadfærd ─────────────────────────────────────────────────
    print(f"{'─'*60}")
    print("  [4] Spørgsmålsadfærd (per deltager → gns. per gruppe)")
    print(f"{'─'*60}")

    print("  — Deltager —")
    _ttest("Antal spørgsmålsbeskeder (questionCountUser)",
           ctrl["questionCountUser"].dropna(), intr["questionCountUser"].dropna())
    print()
    _ttest("Andel spørgsmålsbeskeder (questionRatio)",
           ctrl["questionRatio"].dropna(), intr["questionRatio"].dropna())
    print()

    print("  — Assistent —")
    _ttest("Antal spørgsmålsbeskeder (questionCountAssistant)",
           ctrl["questionCountAssistant"].dropna(), intr["questionCountAssistant"].dropna())
    print()
    _ttest("Andel spørgsmålsbeskeder (questionRatioAssistant)",
           ctrl["questionRatioAssistant"].dropna(), intr["questionRatioAssistant"].dropna())
    print()

    # ── Deskriptiv oversigt ──────────────────────────────────────────────────
    proc_cols = [
        ("chatDuration",               "Chat varighed (ms)"),
        ("chatMessageCount",           "Beskeder i alt"),
        ("userMessageCount",           "Brugerbeskeder"),
        ("assistantMessageCount",      "Assistentbeskeder"),
        ("totalWordsUser",             "Ord i alt (bruger)"),
        ("meanUserMessageLength",      "Gns. beskedlængde, bruger (ord)"),
        ("totalWordsAssistant",        "Ord i alt (assistent)"),
        ("meanAssistantMessageLength", "Gns. beskedlængde, assistent (ord)"),
        ("questionCountUser",           "Spørgsmål, deltager (antal)"),
        ("questionRatio",              "Spørgsmål, deltager (ratio)"),
        ("questionCountAssistant",     "Spørgsmål, assistent (antal)"),
        ("questionRatioAssistant",     "Spørgsmål, assistent (ratio)"),
        ("msgPerMinUser",              "Brugerbeskeder/min"),
        ("msgPerMinAssistant",         "Assistentbeskeder/min"),
        ("msgPerMinTotal",             "Total beskeder/min"),
        ("secPerUserMsg",              "Sekunder per brugerbesked"),
        ("wordsPerMinUser",            "Brugerord/min"),
    ]
    print(f"{'─'*60}")
    print("  Deskriptiv oversigt per gruppe")
    print(f"{'─'*60}")
    header = f"  {'Variabel':<36}  {'Gruppe':<14}  {'M':>8}  {'SD':>8}  {'Mdn':>8}"
    print(header)
    print(f"  {'─'*36}  {'─'*14}  {'─'*8}  {'─'*8}  {'─'*8}")
    for col, label in proc_cols:
        first = True
        for grp in ["control", "intervention"]:
            sub = df[df["group"] == grp][col].dropna()
            lbl = label if first else ""
            grp_lbl = "Kontrol" if grp == "control" else "Intervention"
            print(f"  {lbl:<36}  {grp_lbl:<14}  {sub.mean():>8.2f}  {sub.std():>8.2f}  {sub.median():>8.2f}")
            first = False
        print()

    # ── 5) Korrelationsmatrix: procesvariabler × outcomes ────────────────────
    proc_cols_mat = [
        ("questionCountUser",      "QCountU"),
        ("questionRatio",          "QRatioU"),
        ("questionRatioAssistant", "QRatioA"),
        ("totalWordsUser",         "WordsU"),
        ("meanUserMessageLength",  "MsgLen"),
        ("chatDuration",           "ChatDur"),
        ("msgPerMinUser",          "Msg/min"),
        ("secPerUserMsg",          "Sek/msg"),
    ]
    outcome_cols_mat = [
        ("posttestScore",      "PostMCQ"),
        ("learning_gain",      "MCQgain"),
        ("codeTotal",          "FTtot"),
        ("followUpCodeTotal",  "FUtot"),
        ("retention_change",   "RetΔ"),
    ]

    all_mat_cols = [c for c, _ in proc_cols_mat] + [c for c, _ in outcome_cols_mat]
    avail_mat    = [c for c in all_mat_cols if c in df.columns]
    mat5         = df[avail_mat].copy()

    proc_avail5    = [(c, l) for c, l in proc_cols_mat    if c in mat5.columns]
    outcome_avail5 = [(c, l) for c, l in outcome_cols_mat if c in mat5.columns]

    col_w5      = 9
    row_label_w5 = 10

    print(f"\n{'─'*60}")
    print("  [5] Korrelationsmatrix: procesvariabler × outcomes")
    print("      Pearson r  |  * p < .05  ** p < .01")
    print(f"{'─'*60}")
    header5 = f"  {'': <{row_label_w5}}" + "".join(f"  {l:>{col_w5}}" for _, l in outcome_avail5)
    print(header5)
    print(f"  {'─'*row_label_w5}" + ("  " + "─"*col_w5) * len(outcome_avail5))

    for pc, pl in proc_avail5:
        row = f"  {pl:<{row_label_w5}}"
        for oc, ol in outcome_avail5:
            sub = mat5[[pc, oc]].dropna()
            if len(sub) > 4:
                r5, p5 = stats.pearsonr(sub[pc], sub[oc])
                stars = "**" if p5 < 0.01 else ("*" if p5 < 0.05 else "")
                cell = f"{r5:+.2f}{stars}"
            else:
                cell = "—"
            row += f"  {cell:>{col_w5}}"
        print(row)
    print(f"  (N varierer per celle pga. pairwise deletion — FU-kolonner: N≈44, øvrige: N≈78)")
    # Udvalgt korrelation
    _sub_qc = df[["questionCountUser", "learning_gain"]].dropna()
    if len(_sub_qc) > 4:
        _r_qc, _p_qc = stats.pearsonr(_sub_qc["questionCountUser"], _sub_qc["learning_gain"])
        print(f"  => QCountU × MCQgain: r({len(_sub_qc)-2}) = {_r_qc:+.3f}, p = {_p_qc:.3f}, N = {len(_sub_qc)}")
    print()

    # ── 6) Korrelationsmatrix: sekundære variable × procesvariabler ──────────
    ux_items = ["easeOfConversating1", "adaptingToNeeds1", "perceivedLearning1"]
    if all(c in df.columns for c in ux_items):
        df["oplevelsesscore"] = df[ux_items].mean(axis=1)

    sec_vars = [
        ("evt_mean",             "EVT"),
        ("confidence",           "Self-efficacy"),
        ("mentalEffort",         "Mental effort"),
        ("perceivedLearning1",   "Oplevet læring"),
        ("adaptingToNeeds1",     "Tilpasning"),
        ("easeOfConversating1",  "Lethed"),
        ("oplevelsesscore",      "Oplev.score"),
    ]
    proc_vars = [
        ("chatDuration",          "ChatDur"),
        ("meanUserMessageLength", "MsgLength"),
        ("questionRatio",         "QRatio"),
        ("secPerUserMsg",         "Sek/msg"),
    ]

    all_cols = [c for c, _ in sec_vars] + [c for c, _ in proc_vars]
    avail    = [c for c in all_cols if c in df.columns]
    mat_df   = df[avail].dropna()

    print(f"{'─'*60}")
    print(f"  [6] Korrelationsmatrix: sekundære variable × procesvariabler")
    print(f"      Pearson r  (N={len(mat_df)})  |  * p < .05  ** p < .01")
    print(f"{'─'*60}")

    proc_avail  = [(c, l) for c, l in proc_vars if c in mat_df.columns]
    sec_avail   = [(c, l) for c, l in sec_vars  if c in mat_df.columns]

    # Header
    col_w = 10
    row_label_w = 18
    header = f"  {'': <{row_label_w}}" + "".join(f"  {l:>{col_w}}" for _, l in proc_avail)
    print(header)
    print(f"  {'─'*row_label_w}" + ("  " + "─"*col_w) * len(proc_avail))

    sig_notes = []
    for sc, sl in sec_avail:
        row = f"  {sl:<{row_label_w}}"
        for pc, pl in proc_avail:
            r, p = stats.pearsonr(mat_df[sc], mat_df[pc])
            if p < 0.01:
                stars = "**"
            elif p < 0.05:
                stars = "*"
            else:
                stars = ""
            cell = f"{r:+.2f}{stars}"
            row += f"  {cell:>{col_w}}"
            if stars:
                sig_notes.append((sl, pl, r, p))
        print(row)

    if sig_notes:
        print(f"\n  Signifikante korrelationer:")
        for sl, pl, r, p in sig_notes:
            print(f"    {sl} × {pl}:  r = {r:+.3f}, p = {p:.3f}")
    print()
