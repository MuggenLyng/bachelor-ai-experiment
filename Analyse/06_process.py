"""
06_process.py — Eksplorativ procesanalyse af chat-adfærd.

Sammenligner procesvariabler mellem kontrol og intervention:
  - chatDuration, assistantMessageCount, userMessageCount, chatMessageCount
  - totalWordsUser, meanUserMessageLength  (afledt fra chatTranscript)
  - questionCountUser, questionRatio       (afledt fra chatTranscript)
"""

import json
import pandas as pd
import numpy as np
from scipy import stats


def _user_msgs(transcript_str):
    """Returnerer liste af brugerbeskeders tekst fra chatTranscript JSON."""
    if pd.isna(transcript_str):
        return []
    try:
        msgs = json.loads(transcript_str)
        return [m["content"] for m in msgs if m.get("role") == "user"]
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
    user_msgs_list = df["chatTranscript"].apply(_user_msgs)

    df["totalWordsUser"] = user_msgs_list.apply(
        lambda msgs: sum(len(m.split()) for m in msgs)
    )
    df["meanUserMessageLength"] = df.apply(
        lambda row: row["totalWordsUser"] / row["userMessageCount"]
        if row["userMessageCount"] > 0 else np.nan,
        axis=1,
    )
    df["questionCountUser"] = user_msgs_list.apply(
        lambda msgs: sum(1 for m in msgs if "?" in m)
    )
    df["questionRatio"] = df.apply(
        lambda row: row["questionCountUser"] / row["userMessageCount"]
        if row["userMessageCount"] > 0 else np.nan,
        axis=1,
    )

    ctrl = df[df["group"] == "control"]
    intr = df[df["group"] == "intervention"]

    # ── 1) Basale chat-variabler ─────────────────────────────────────────────
    print(f"\n{'─'*60}")
    print("  [1] Basale chat-variabler (Welch t-test)")
    print(f"{'─'*60}")

    for col, label in [
        ("chatDuration",         "Chat varighed (ms)"),
        ("chatMessageCount",     "Beskeder i alt"),
        ("userMessageCount",     "Brugerbeskeder"),
        ("assistantMessageCount","Assistentbeskeder"),
    ]:
        _ttest(label,
               ctrl[col].dropna(),
               intr[col].dropna())
        print()

    # ── 2) Afledte indholdsmål ───────────────────────────────────────────────
    print(f"{'─'*60}")
    print("  [2] Afledte indholdsmål (fra chatTranscript)")
    print(f"{'─'*60}")

    for col, label in [
        ("totalWordsUser",       "Ord i alt (bruger)"),
        ("meanUserMessageLength","Gns. beskedlængde (ord)"),
    ]:
        _ttest(label,
               ctrl[col].dropna(),
               intr[col].dropna())
        print()

    # ── 3) Spørgsmålsadfærd ─────────────────────────────────────────────────
    print(f"{'─'*60}")
    print("  [3] Spørgsmålsadfærd (per deltager → gns. per gruppe)")
    print(f"{'─'*60}")

    _ttest("Antal spørgsmålsbeskeder (questionCountUser)",
           ctrl["questionCountUser"].dropna(),
           intr["questionCountUser"].dropna())
    print()
    _ttest("Andel spørgsmålsbeskeder (questionRatio = spørgsmål / userMessageCount)",
           ctrl["questionRatio"].dropna(),
           intr["questionRatio"].dropna())
    print()

    # ── Deskriptiv oversigt ──────────────────────────────────────────────────
    proc_cols = [
        "chatDuration", "chatMessageCount", "userMessageCount",
        "assistantMessageCount", "totalWordsUser", "meanUserMessageLength",
        "questionCountUser", "questionRatio",
    ]
    print(f"{'─'*60}")
    print("  Deskriptiv oversigt per gruppe")
    print(f"{'─'*60}")
    summary = df.groupby("group")[proc_cols].agg(["mean", "std", "median"]).round(2)
    print(summary.to_string())
    print()
