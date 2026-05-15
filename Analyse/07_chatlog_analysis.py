"""
07_chatlog_analysis.py — Eksplorativ analyse af chatlog-kodning.

⚠️  FORELØBIG ANALYSE — kun ~36 deltagere er kodet (af 78 i alt).
    Resultater skal fortolkes med forsigtighed (lav power).

Koderne (gennemsnit per besked per deltager, skala 0–2):
  chat_sum        — chatbot: opsummering (summarizing)
  pers_sum        — deltager: opsummering
  chat_scaf       — chatbot: stilladsering (scaffolding)
  pers_scaf_resp  — deltager: respons på stilladsering

NB: Koderne er allerede normaliserede (gns. per besked), så ingen
yderligere normalisering er nødvendig.
"""

import os
import json
import pandas as pd
import numpy as np
from scipy import stats
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# ── Farver (matcher øvrige plots) ────────────────────────────────────────────
CLR_CTRL  = "#4C72B0"
CLR_INTR  = "#DD8452"
ALPHA_DOT = 0.6


# ── Hjælpefunktioner ─────────────────────────────────────────────────────────

def _fmt_p(p):
    """Formater p-værdi: p < .001 i stedet for p = 0.000."""
    if p < 0.001:
        return "< .001"
    return f"= {p:.3f}"


def _ttest(label, a, b, indent="  "):
    """Welch t-test + Cohen's d."""
    if len(a) < 2 or len(b) < 2:
        print(f"{indent}{label}: for få obs.")
        return {}
    res   = stats.ttest_ind(b, a, equal_var=False)
    t, p, df_w = res.statistic, res.pvalue, res.df
    d = (b.mean() - a.mean()) / np.sqrt((a.std()**2 + b.std()**2) / 2) if (a.std()**2 + b.std()**2) > 0 else 0
    sig = "*" if p < 0.05 else "n.s."
    print(f"{indent}{label}")
    print(f"{indent}  ctrl:  M={a.mean():.3f}, SD={a.std():.3f}, Mdn={a.median():.3f}, N={len(a)}")
    print(f"{indent}  intr:  M={b.mean():.3f}, SD={b.std():.3f}, Mdn={b.median():.3f}, N={len(b)}")
    print(f"{indent}  t({df_w:.1f}) = {t:.3f}, p {_fmt_p(p)}, d = {d:.3f}  [{sig}]")
    return {"label": label, "ctrl_M": a.mean(), "ctrl_SD": a.std(), "ctrl_N": len(a),
            "intr_M": b.mean(), "intr_SD": b.std(), "intr_N": len(b),
            "t": t, "df": df_w, "p_welch": p, "d": d}


def _corr_block(df, x_vars, y_vars, title):
    """Pearson r-matrix med * p<.05 ** p<.01."""
    x_avail = [(c, l) for c, l in x_vars if c in df.columns]
    y_avail = [(c, l) for c, l in y_vars if c in df.columns]
    if not x_avail or not y_avail:
        return
    col_w = 10
    row_w = max(len(l) for _, l in x_avail) + 2
    print(f"  {title}")
    hdr = f"  {'':>{row_w}}" + "".join(f"  {l:>{col_w}}" for _, l in y_avail)
    print(hdr)
    print(f"  {'-'*row_w}" + ("  " + "-"*col_w) * len(y_avail))
    for xc, xl in x_avail:
        row = f"  {xl:>{row_w}}"
        for yc, yl in y_avail:
            sub = df[[xc, yc]].dropna()
            if len(sub) > 4:
                r, p = stats.pearsonr(sub[xc], sub[yc])
                stars = "**" if p < 0.01 else ("*" if p < 0.05 else "")
                cell = f"{r:+.2f}{stars}"
            else:
                cell = f"{'—':>5}"
            row += f"  {cell:>{col_w}}"
        print(row)
    print(f"  * p < .05  ** p < .01\n")


def _save_md(df_table, path):
    """Gem DataFrame som Markdown-tabel og CSV."""
    csv_path = path + ".csv"
    md_path  = path + ".md"
    df_table.to_csv(csv_path, index=False)
    # Markdown pipe-tabel
    cols = list(df_table.columns)
    header = "| " + " | ".join(str(c) for c in cols) + " |"
    sep    = "| " + " | ".join("---" for _ in cols) + " |"
    rows   = []
    for _, r in df_table.iterrows():
        rows.append("| " + " | ".join(str(v) for v in r) + " |")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join([header, sep] + rows) + "\n")
    print(f"  Gemt → {csv_path}  og  {md_path}")


# ── Jitter-hjælper ────────────────────────────────────────────────────────────

def _jitter(ax, data_ctrl, data_intr, label, offset=0.15):
    np.random.seed(42)
    for vals, x, clr in [(data_ctrl, 0, CLR_CTRL), (data_intr, 1, CLR_INTR)]:
        jx = x + np.random.uniform(-offset, offset, len(vals))
        ax.scatter(jx, vals, color=clr, alpha=ALPHA_DOT, s=28, zorder=3)
        ax.plot([x - 0.25, x + 0.25], [vals.mean(), vals.mean()],
                color=clr, lw=2.5, zorder=4)
    ax.set_xticks([0, 1])
    ax.set_xticklabels(["Kontrol", "Intervention"])
    ax.set_ylabel("Gns. score per besked (0–2)")
    ax.set_title(label, fontsize=10, fontweight="bold")
    ax.set_ylim(-0.1, 2.1)
    ax.spines[["top", "right"]].set_visible(False)


def run():
    print("=== 07 CHATLOG-KODNING (EKSPLORATIV, FORELØBIG) ===")

    # ── Indlæs og merge ──────────────────────────────────────────────────────
    xl   = pd.read_excel("data/processed/chatlog_kodning.xlsx", sheet_name=0)
    main = pd.read_csv("data/processed/processed.csv")

    # Udtræk GENNEMSNIT-rækker med faktisk kodning
    avg = xl[xl["Aktør"] == "GENNEMSNIT"][
        ["#", "ParticipantID", "CHAT-SUM", "PERS-SUM", "CHAT-SCAF", "PERS-SCAF-RESP"]
    ].copy()
    avg.columns = ["nr", "participantId", "chat_sum", "pers_sum", "chat_scaf", "pers_scaf_resp"]
    avg = avg[avg[["chat_sum","pers_sum","chat_scaf","pers_scaf_resp"]].notna().any(axis=1)].copy()

    # Numerisk konvertering (AVERAGEIF-formler kan returnere strenge)
    for c in ["chat_sum","pers_sum","chat_scaf","pers_scaf_resp"]:
        avg[c] = pd.to_numeric(avg[c], errors="coerce")

    df = main.merge(avg[["participantId","chat_sum","pers_sum","chat_scaf","pers_scaf_resp"]],
                    on="participantId", how="inner")

    # Afled oplevelsesscore
    ux = ["easeOfConversating1","adaptingToNeeds1","perceivedLearning1"]
    if all(c in df.columns for c in ux):
        df["oplevelsesscore"] = df[ux].mean(axis=1)

    ctrl = df[df["group"] == "control"]
    intr = df[df["group"] == "intervention"]

    n_total = len(df)
    pct = round(n_total / len(main) * 100)
    print(f"⚠️  {n_total} af {len(main)} deltagere kodet ({pct}%) — fortolk med forsigtighed.\n")
    print(f"  N kodet i alt: {n_total}  (kontrol={len(ctrl)}, intervention={len(intr)})")
    print()

    # ── Aflede procesvariabler (fra processed.csv) ───────────────────────────
    import json as _json
    def _parse_role(t, role):
        if pd.isna(t): return []
        try: return [m["content"] for m in _json.loads(t) if m.get("role") == role]
        except: return []

    _user_msgs  = df["chatTranscript"].apply(lambda x: _parse_role(x, "user"))
    _asst_msgs  = df["chatTranscript"].apply(lambda x: _parse_role(x, "assistant"))
    df["totalWordsUser"]    = _user_msgs.apply(lambda ms: sum(len(m.split()) for m in ms))
    df["questionCountUser"] = _user_msgs.apply(lambda ms: sum(1 for m in ms if "?" in m))
    df["questionRatio"]     = df.apply(
        lambda r: r["questionCountUser"] / r["userMessageCount"]
        if r.get("userMessageCount", 0) > 0 else np.nan, axis=1)
    df["meanUserMsgLen"]    = df.apply(
        lambda r: r["totalWordsUser"] / r["userMessageCount"]
        if r.get("userMessageCount", 0) > 0 else np.nan, axis=1)
    df["chatDurMin"]        = df["chatDuration"] / 1000 / 60
    df["msgPerMinUser"]     = df.apply(
        lambda r: r["userMessageCount"] / r["chatDurMin"]
        if r.get("chatDurMin", 0) > 0 else np.nan, axis=1)
    df["secPerUserMsg"]     = df.apply(
        lambda r: (r["chatDuration"] / 1000) / r["userMessageCount"]
        if r.get("userMessageCount", 0) > 0 else np.nan, axis=1)
    df["questionCountAsst"] = _asst_msgs.apply(lambda ms: sum(1 for m in ms if "?" in m))
    df["questionRatioAsst"] = df.apply(
        lambda r: r["questionCountAsst"] / r["assistantMessageCount"]
        if r.get("assistantMessageCount", 0) > 0 else np.nan, axis=1)

    CODES = [
        ("chat_sum",       "CHAT-SUM (chatbot summarizing)"),
        ("pers_sum",       "PERS-SUM (deltager summarizing)"),
        ("chat_scaf",      "CHAT-SCAF (chatbot scaffolding)"),
        ("pers_scaf_resp", "PERS-SCAF-RESP (deltager scaf-respons)"),
    ]

    # ── 1) Deskriptiv statistik ──────────────────────────────────────────────
    print(f"{'─'*60}")
    print("  [1] Deskriptiv statistik per gruppe")
    print(f"{'─'*60}")

    desc_rows = []
    for grp_lbl, sub in [("Kontrol", ctrl), ("Intervention", intr)]:
        for col, label in CODES:
            s = sub[col].dropna()
            desc_rows.append({
                "Gruppe": grp_lbl, "Kode": label,
                "M": round(s.mean(), 3), "SD": round(s.std(), 3),
                "Mdn": round(s.median(), 3), "Min": round(s.min(), 3),
                "Max": round(s.max(), 3), "N": len(s),
            })
    desc_df = pd.DataFrame(desc_rows)
    print(desc_df.to_string(index=False))
    print()
    _save_md(desc_df, "data/processed/chatlog_deskriptiv")

    # ── 2) Gruppeforskelle — Welch t-test + Mann-Whitney ────────────────────
    print(f"{'─'*60}")
    print("  [2] Gruppeforskelle (Welch t-test + Mann-Whitney U)")
    print(f"{'─'*60}")

    test_rows = []
    for col, label in CODES:
        a = ctrl[col].dropna()
        b = intr[col].dropna()
        res = _ttest(label, a, b)
        if res:
            test_rows.append(res)
        print()

    test_df = pd.DataFrame(test_rows).round(3)
    _save_md(test_df, "data/processed/chatlog_gruppeforskelle")

    chatlog_vars = [
        ("chat_sum",       "CHAT-SUM"),
        ("pers_sum",       "PERS-SUM"),
        ("chat_scaf",      "CHAT-SCAF"),
        ("pers_scaf_resp", "PERS-SCAF-RESP"),
    ]
    # Udvalgte outcomes og sekundære mål
    focus_primary = [
        ("codeTotal",         "FTtot"),
        ("followUpCodeTotal", "FUtot"),
        ("retention_change",  "RetΔ"),
    ]
    focus_secondary = [
        ("mentalEffort",        "CogLoad"),
        ("perceivedLearning1",  "pLearn"),
        ("easeOfConversating1", "Ease"),
        ("adaptingToNeeds1",    "Adapt"),
        ("evt_mean",            "EVT"),
        ("confidence",          "Conf"),
    ]

    # ── 3) Pearson-korrelationer (alle kodede, N≈36) ─────────────────────────
    print(f"{'─'*60}")
    print("  [3] Pearson-korrelationer: chatlog-koder × udvalgte outcomes")
    print(f"  ⚠️  Eksplorativt, N={n_total}")
    print(f"{'─'*60}")
    _corr_block(df, chatlog_vars, focus_primary, "Chatlog-koder × primære outcomes")

    full_secondary = [
        ("mentalEffort",        "CogLoad"),
        ("perceivedLearning1",  "pLearn"),
        ("easeOfConversating1", "Ease"),
        ("adaptingToNeeds1",    "Adapt"),
        ("evt_mean",            "EVT"),
        ("confidence",          "Conf"),
    ]
    _corr_block(df, chatlog_vars, full_secondary, "Chatlog-koder × sekundære mål")

    # Gem fuld korrelationsmatrix
    all_corr_cols = (
        [c for c, _ in chatlog_vars] +
        [c for c, _ in focus_primary if c in df.columns] +
        [c for c, _ in focus_secondary if c in df.columns]
    )
    corr_mat = df[[c for c in all_corr_cols if c in df.columns]].corr().round(3)
    corr_mat.to_csv("data/processed/chatlog_korrelationer.csv")
    print(f"  Fuld korrelationsmatrix gemt → data/processed/chatlog_korrelationer.csv")

    # ── 4) Partial korrelationer kontrolleret for gruppe ─────────────────────
    print(f"{'─'*60}")
    print("  [4] Partial korrelationer kontrolleret for gruppe")
    print(f"  ⚠️  Eksplorativt, N={n_total}")
    print(f"{'─'*60}")

    import pingouin as pg
    df["group_num"] = (df["group"] == "intervention").astype(int)

    focus_all = focus_primary + focus_secondary
    col_w_p = 14
    row_w_p = max(len(l) for _, l in chatlog_vars) + 2
    hdr_labels = [l for _, l in focus_all if _ in df.columns]
    print(f"  {'':>{row_w_p}}" + "".join(f"  {l:>{col_w_p}}" for _, l in focus_all if _ in df.columns))
    print(f"  {'-'*row_w_p}" + ("  " + "-"*col_w_p) * len(hdr_labels))

    for xc, xl in chatlog_vars:
        row = f"  {xl:>{row_w_p}}"
        for yc, yl in focus_all:
            if yc not in df.columns:
                continue
            sub = df[[xc, yc, "group_num"]].dropna()
            if len(sub) > 6:
                try:
                    res_pc = pg.partial_corr(data=sub, x=xc, y=yc, covar="group_num")
                    r_pc = res_pc["r"].values[0]
                    p_pc = res_pc["p_val"].values[0]
                    stars = "**" if p_pc < 0.01 else ("*" if p_pc < 0.05 else "")
                    p_str = "< .001" if p_pc < 0.001 else f"{p_pc:.3f}"
                    cell = f"{r_pc:+.2f}{stars}({p_str})"
                except Exception:
                    cell = "—"
            else:
                cell = "—"
            row += f"  {cell:>{col_w_p}}"
        print(row)
    print(f"  Format: r(p)  |  * p < .05  ** p < .01")
    print()

    # ── 5) Within-group Spearman ─────────────────────────────────────────────
    print(f"{'─'*60}")
    print("  [5] Within-group Spearman-korrelationer")
    print(f"  ⚠️  Eksplorativt — N≈{len(ctrl)} ctrl, N≈{len(intr)} intr")
    print(f"{'─'*60}")

    col_w_s = 15
    row_w_s = max(len(l) for _, l in chatlog_vars) + 2

    def _spearman_table(var_list, grp_lbl, grp_df):
        avail = [(c, l) for c, l in var_list if c in grp_df.columns]
        print(f"  {'':>{row_w_s}}" + "".join(f"  {l:>{col_w_s}}" for _, l in avail))
        print(f"  {'-'*row_w_s}" + ("  " + "-"*col_w_s) * len(avail))
        for xc, xl in chatlog_vars:
            row = f"  {xl:>{row_w_s}}"
            for yc, _ in avail:
                sub = grp_df[[xc, yc]].dropna()
                if len(sub) > 4:
                    rho, p_s = stats.spearmanr(sub[xc], sub[yc])
                    stars = "**" if p_s < 0.01 else ("*" if p_s < 0.05 else "")
                    p_str = "< .001" if p_s < 0.001 else f"{p_s:.3f}"
                    cell = f"{rho:+.2f}{stars}({p_str})"
                else:
                    cell = "—"
                row += f"  {cell:>{col_w_s}}"
            print(row)

    for grp_lbl, grp_df in [("Kontrol", ctrl), ("Intervention", intr)]:
        print(f"\n  — {grp_lbl} (N={len(grp_df)}) — primære outcomes —")
        _spearman_table(focus_primary, grp_lbl, grp_df)
        print(f"\n  — {grp_lbl} (N={len(grp_df)}) — sekundære mål —")
        _spearman_table(focus_secondary, grp_lbl, grp_df)
        print()

    print(f"  Format: ρ(p)  |  * p < .05  ** p < .01")
    print()

    # ── 5) Plots ─────────────────────────────────────────────────────────────
    legend_patches = [
        mpatches.Patch(color=CLR_CTRL,  label="Kontrol"),
        mpatches.Patch(color=CLR_INTR,  label="Intervention"),
    ]

    # Plot A: chatbot-koder
    fig, axes = plt.subplots(1, 2, figsize=(8, 4.5), sharey=True)
    fig.suptitle("Chatbot-koder per gruppe (foreløbig, N≈36)", fontsize=11, fontweight="bold")
    _jitter(axes[0], ctrl["chat_sum"].dropna(),  intr["chat_sum"].dropna(),  "CHAT-SUM\n(Opsummering)")
    _jitter(axes[1], ctrl["chat_scaf"].dropna(), intr["chat_scaf"].dropna(), "CHAT-SCAF\n(Stilladsering)")
    fig.legend(handles=legend_patches, loc="lower center", ncol=2, frameon=False, fontsize=9)
    plt.tight_layout(rect=[0, 0.07, 1, 1])
    fig.savefig("plots/26_chatlog_chatbot_grupper.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("\n  Gemt → plots/26_chatlog_chatbot_grupper.png")

    # Plot B: deltager-koder
    fig, axes = plt.subplots(1, 2, figsize=(8, 4.5), sharey=True)
    fig.suptitle("Deltager-koder per gruppe (foreløbig, N≈36)", fontsize=11, fontweight="bold")
    _jitter(axes[0], ctrl["pers_sum"].dropna(),       intr["pers_sum"].dropna(),       "PERS-SUM\n(Opsummering)")
    _jitter(axes[1], ctrl["pers_scaf_resp"].dropna(), intr["pers_scaf_resp"].dropna(), "PERS-SCAF-RESP\n(Scaf-respons)")
    fig.legend(handles=legend_patches, loc="lower center", ncol=2, frameon=False, fontsize=9)
    plt.tight_layout(rect=[0, 0.07, 1, 1])
    fig.savefig("plots/27_chatlog_deltager_grupper.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Gemt → plots/27_chatlog_deltager_grupper.png")

    # Plot C: scatter chat_scaf × codeTotal
    if "codeTotal" in df.columns:
        fig, ax = plt.subplots(figsize=(5.5, 4.5))
        for grp, clr, lbl in [("control", CLR_CTRL, "Kontrol"), ("intervention", CLR_INTR, "Intervention")]:
            sub = df[df["group"] == grp][["chat_scaf","codeTotal"]].dropna()
            ax.scatter(sub["chat_scaf"], sub["codeTotal"], color=clr, alpha=ALPHA_DOT, s=35, label=lbl)
        # Samlet regressionslinje
        sub_all = df[["chat_scaf","codeTotal"]].dropna()
        if len(sub_all) > 4:
            m, b_i, r, p, _ = stats.linregress(sub_all["chat_scaf"], sub_all["codeTotal"])
            xs = np.linspace(sub_all["chat_scaf"].min(), sub_all["chat_scaf"].max(), 100)
            ax.plot(xs, m*xs + b_i, color="gray", lw=1.5, ls="--",
                    label=f"r = {r:+.2f}, p = {p:.3f}")
        ax.set_xlabel("CHAT-SCAF (chatbot stilladsering, gns. per besked)")
        ax.set_ylabel("Fritekstscore (codeTotal, 0–8)")
        ax.set_title("CHAT-SCAF × Fritekstscore\n(foreløbig, N≈36)", fontsize=10, fontweight="bold")
        ax.legend(fontsize=8, frameon=False)
        ax.spines[["top","right"]].set_visible(False)
        plt.tight_layout()
        fig.savefig("plots/28_chatscaf_vs_fritekst.png", dpi=150, bbox_inches="tight")
        plt.close()
        print("  Gemt → plots/28_chatscaf_vs_fritekst.png")

    # Plot D: scatter chat_scaf × followUpCodeTotal
    if "followUpCodeTotal" in df.columns:
        sub_fu = df[["chat_scaf","followUpCodeTotal","group"]].dropna()
        if len(sub_fu) >= 5:
            fig, ax = plt.subplots(figsize=(5.5, 4.5))
            for grp, clr, lbl in [("control", CLR_CTRL, "Kontrol"), ("intervention", CLR_INTR, "Intervention")]:
                s = sub_fu[sub_fu["group"] == grp]
                ax.scatter(s["chat_scaf"], s["followUpCodeTotal"], color=clr, alpha=ALPHA_DOT, s=35, label=lbl)
            m, b_i, r, p, _ = stats.linregress(sub_fu["chat_scaf"], sub_fu["followUpCodeTotal"])
            xs = np.linspace(sub_fu["chat_scaf"].min(), sub_fu["chat_scaf"].max(), 100)
            ax.plot(xs, m*xs + b_i, color="gray", lw=1.5, ls="--",
                    label=f"r = {r:+.2f}, p = {p:.3f}")
            ax.set_xlabel("CHAT-SCAF (chatbot stilladsering, gns. per besked)")
            ax.set_ylabel("Follow-up fritekstscore (0–8)")
            ax.set_title("CHAT-SCAF × Follow-up score\n(foreløbig, N≈36)", fontsize=10, fontweight="bold")
            ax.legend(fontsize=8, frameon=False)
            ax.spines[["top","right"]].set_visible(False)
            plt.tight_layout()
            fig.savefig("plots/29_chatscaf_vs_followup.png", dpi=150, bbox_inches="tight")
            plt.close()
            print("  Gemt → plots/29_chatscaf_vs_followup.png")

    # ── Plot E: Heatmap — partial r (chatlog × primære outcomes) ────────────
    import pingouin as pg2
    pc_codes   = [("chat_sum","CHAT-SUM"), ("pers_sum","PERS-SUM"),
                  ("chat_scaf","CHAT-SCAF"), ("pers_scaf_resp","PERS-SCAF-RESP")]
    pc_outcomes = [("codeTotal","Fritekst\n(FTtot)"),
                   ("followUpCodeTotal","Follow-up\n(FUtot)"),
                   ("retention_change","Retention Δ\n(RetΔ)")]

    r_mat = np.full((len(pc_codes), len(pc_outcomes)), np.nan)
    p_mat = np.full((len(pc_codes), len(pc_outcomes)), np.nan)
    for i, (xc, _) in enumerate(pc_codes):
        for j, (yc, _) in enumerate(pc_outcomes):
            sub = df[[xc, yc, "group_num"]].dropna()
            if len(sub) > 6:
                try:
                    res = pg2.partial_corr(data=sub, x=xc, y=yc, covar="group_num")
                    r_mat[i, j] = res["r"].values[0]
                    p_mat[i, j] = res["p_val"].values[0]
                except Exception:
                    pass

    fig, ax = plt.subplots(figsize=(6, 4))
    vmax = max(abs(np.nanmin(r_mat)), abs(np.nanmax(r_mat)), 0.3)
    im = ax.imshow(r_mat, cmap="RdBu_r", vmin=-vmax, vmax=vmax, aspect="auto")
    plt.colorbar(im, ax=ax, label="Partial r (kontrolleret for gruppe)")

    ax.set_xticks(range(len(pc_outcomes)))
    ax.set_xticklabels([l for _, l in pc_outcomes], fontsize=9)
    ax.set_yticks(range(len(pc_codes)))
    ax.set_yticklabels([l for _, l in pc_codes], fontsize=9)

    for i in range(len(pc_codes)):
        for j in range(len(pc_outcomes)):
            if not np.isnan(r_mat[i, j]):
                p = p_mat[i, j]
                stars = "**" if p < 0.01 else ("*" if p < 0.05 else "")
                txt = f"{r_mat[i,j]:+.2f}{stars}"
                clr = "white" if abs(r_mat[i, j]) > vmax * 0.6 else "black"
                ax.text(j, i, txt, ha="center", va="center", fontsize=9, color=clr)

    ax.set_title("Partial korrelationer: chatlog-koder × primære outcomes\n"
                 "(kontrolleret for gruppe, * p<.05 ** p<.01)", fontsize=9, fontweight="bold")
    ax.spines[["top","right","left","bottom"]].set_visible(False)
    plt.tight_layout()
    fig.savefig("plots/30_partial_corr_heatmap.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("\n  Gemt → plots/30_partial_corr_heatmap.png")

    # ── Plot F+G: 2×2 rå vs. residualiseret — PERS-SUM og PERS-SCAF-RESP ────
    import statsmodels.formula.api as smf2

    def _resid(df_sub, col):
        m = smf2.ols(f"{col} ~ group_num", data=df_sub).fit()
        return m.resid

    # Farver til disse plots
    C_INTR  = "#4C72B0"   # blå = intervention
    C_CTRL  = "#999999"   # grå = kontrol
    C_TOTAL = "#DD8452"   # orange = samlet stiplede linje

    def _within_r(sub, xc, yc, grp):
        g = sub[sub["group"] == grp][[xc, yc]].dropna()
        if len(g) > 3:
            r, p = stats.pearsonr(g[xc], g[yc])
            p_str = "< .001" if p < 0.001 else f"= {p:.3f}"
            return r, p_str
        return None, None

    def _raw_panel(ax, sub, xc, yc, xl, yl, title):
        r_all, p_all = stats.pearsonr(sub[xc], sub[yc])
        p_str_all = "< .001" if p_all < 0.001 else f"= {p_all:.3f}"

        for grp, clr in [("control", C_CTRL), ("intervention", C_INTR)]:
            g = sub[sub["group"] == grp]
            ax.scatter(g[xc], g[yc], color=clr, alpha=0.65, s=28, zorder=3)
            if len(g) > 3:
                mg, bg, *_ = stats.linregress(g[xc], g[yc])
                xs = np.linspace(g[xc].min(), g[xc].max(), 200)
                ax.plot(xs, mg*xs + bg, color=clr, lw=2, zorder=4)

        m_all, b_all, *_ = stats.linregress(sub[xc], sub[yc])
        xs_all = np.linspace(sub[xc].min(), sub[xc].max(), 200)
        ax.plot(xs_all, m_all*xs_all + b_all, color=C_TOTAL, lw=1.8, ls="--", zorder=2)

        ax.set_xlabel(xl, fontsize=9)
        ax.set_ylabel(yl, fontsize=9)
        ax.set_title(title, fontsize=9, fontweight="bold")
        ax.spines[["top","right"]].set_visible(False)
        ax.tick_params(labelsize=8)

        # Legend i bunden med within-group r
        r_ctrl, p_ctrl = _within_r(sub, xc, yc, "control")
        r_intr, p_intr = _within_r(sub, xc, yc, "intervention")
        legend_elements = []
        if r_ctrl is not None:
            legend_elements.append(
                mpatches.Patch(color=C_CTRL, label=f"Kontrol (r = {r_ctrl:+.2f}, p {p_ctrl})"))
        if r_intr is not None:
            legend_elements.append(
                mpatches.Patch(color=C_INTR, label=f"Intervention (r = {r_intr:+.2f}, p {p_intr})"))
        legend_elements.append(
            mpatches.Patch(color=C_TOTAL, label=f"Samlet (r = {r_all:+.2f}, p {p_str_all})"))
        ax.legend(handles=legend_elements, fontsize=7, frameon=False,
                  loc="upper center", bbox_to_anchor=(0.5, -0.18), ncol=1)

    def _resid_panel(ax, sub, xc, yc, xl, yl, title):
        rx = _resid(sub, xc)
        ry = _resid(sub, yc)
        r_pc, p_pc = stats.pearsonr(rx, ry)
        p_str = "< .001" if p_pc < 0.001 else f"= {p_pc:.3f}"

        for grp, clr in [("control", C_CTRL), ("intervention", C_INTR)]:
            idx = (sub["group"] == grp).values
            ax.scatter(rx[idx], ry[idx], color=clr, alpha=0.65, s=28, zorder=3)

        xs = np.linspace(rx.min(), rx.max(), 200)
        slope, intercept, *_ = stats.linregress(rx, ry)
        ax.plot(xs, slope*xs + intercept, color=C_TOTAL, lw=1.8, ls="--", zorder=4)
        ax.axhline(0, color="#cccccc", lw=0.8, ls=":")
        ax.axvline(0, color="#cccccc", lw=0.8, ls=":")
        ax.set_xlabel(f"{xl} (residual)", fontsize=9)
        ax.set_ylabel(f"{yl} (residual)", fontsize=9)
        ax.set_title(title, fontsize=9, fontweight="bold")
        ax.spines[["top","right"]].set_visible(False)
        ax.tick_params(labelsize=8)

        # Within-group r på residualer (= within-group r på originale variable)
        r_ctrl, p_ctrl = _within_r(sub, xc, yc, "control")
        r_intr, p_intr = _within_r(sub, xc, yc, "intervention")
        legend_elements = []
        if r_ctrl is not None:
            legend_elements.append(
                mpatches.Patch(color=C_CTRL, label=f"Kontrol (r = {r_ctrl:+.2f}, p {p_ctrl})"))
        if r_intr is not None:
            legend_elements.append(
                mpatches.Patch(color=C_INTR, label=f"Intervention (r = {r_intr:+.2f}, p {p_intr})"))
        legend_elements.append(
            mpatches.Patch(color=C_TOTAL, label=f"Partial r = {r_pc:+.2f}, p {p_str}"))
        ax.legend(handles=legend_elements, fontsize=7, frameon=False,
                  loc="upper center", bbox_to_anchor=(0.5, -0.18), ncol=1)

    for xc, xl, fname, figtitle in [
        ("pers_sum",       "PERS-SUM",       "31_pers_sum_2x2",       "PERS-SUM × Fritekst og Follow-up"),
        ("pers_scaf_resp", "PERS-SCAF-RESP", "34_pers_scaf_resp_2x2", "PERS-SCAF-RESP × Fritekst og Follow-up"),
    ]:
        fig, axes = plt.subplots(2, 2, figsize=(10, 8))

        for row, (yc, yl, yshort) in enumerate([
            ("codeTotal",       "Fritekstscore (0–8)", "fritekst"),
            ("followUpCodeTotal","Follow-up score (0–8)", "FU-fritekst"),
        ]):
            sub = df[[xc, yc, "group_num", "group"]].dropna()
            if len(sub) < 6:
                axes[row, 0].axis("off")
                axes[row, 1].axis("off")
                continue
            _raw_panel(axes[row, 0],   sub, xc, yc, xl, yl,
                       title=f"Rå {xl} × {yshort}")
            _resid_panel(axes[row, 1], sub, xc, yc, xl, yl,
                         title=f"Partial {xl} × {yshort}\n(kontrolleret for gruppe)")

        fig.suptitle(figtitle, fontsize=11, fontweight="bold")
        plt.tight_layout(rect=[0, 0.0, 1, 0.97])
        plt.subplots_adjust(hspace=0.55, wspace=0.35)
        fig.savefig(f"plots/{fname}.png", dpi=150, bbox_inches="tight")
        plt.close()
        print(f"  Gemt → plots/{fname}.png")

    # ── Procesvariabler × chatlogmål (Pearson r) ─────────────────────────────
    proc_vars_mat = [
        ("chatDurMin",        "ChatDur (min)"),
        ("userMessageCount",  "BrugBeskeder"),
        ("totalWordsUser",    "OrdBruger"),
        ("meanUserMsgLen",    "MsgLængde"),
        ("questionCountUser", "QCount"),
        ("questionRatio",     "QRatio"),
        ("msgPerMinUser",     "Msg/min"),
        ("secPerUserMsg",     "Sek/msg"),
    ]
    code_vars_mat = [
        ("chat_sum",       "CHAT-SUM"),
        ("pers_sum",       "PERS-SUM"),
        ("chat_scaf",      "CHAT-SCAF"),
        ("pers_scaf_resp", "PERS-SCAF-RESP"),
    ]

    col_w_m   = 14
    row_lbl_m = 16
    n_mat = len(df[[c for c, _ in proc_vars_mat + code_vars_mat if c in df.columns]].dropna())

    print(f"\n{'─'*60}")
    print(f"  [7] Procesvariabler × chatlogmål — Pearson r (N={n_total})")
    print( "      * p < .05  ** p < .01")
    print(f"{'─'*60}")
    print(f"  {'':>{row_lbl_m}}" + "".join(f"  {l:>{col_w_m}}" for _, l in code_vars_mat))
    print(f"  {'─'*row_lbl_m}" + ("  " + "─"*col_w_m) * len(code_vars_mat))

    for pc, pl in proc_vars_mat:
        if pc not in df.columns:
            continue
        row_str = f"  {pl:<{row_lbl_m}}"
        for cc, _ in code_vars_mat:
            if cc not in df.columns:
                row_str += f"  {'—':>{col_w_m}}"
                continue
            sub_m = df[[pc, cc]].dropna()
            if len(sub_m) > 4:
                r_m, p_m = stats.pearsonr(sub_m[pc], sub_m[cc])
                stars = "**" if p_m < 0.01 else ("*" if p_m < 0.05 else "")
                p_str_m = "< .001" if p_m < 0.001 else f"{p_m:.3f}"
                cell_m = f"{r_m:+.2f}{stars}({p_str_m})"
            else:
                cell_m = "—"
            row_str += f"  {cell_m:>{col_w_m}}"
        print(row_str)
    print(f"  Format: r(p)  |  N varierer per celle (pairwise deletion)")

    # ── [8] Partial korrelationer (kontrolleret for gruppe) ───────────────────
    # Procesmål + kognitiv-oplevelsesmål × primære læringsoutcomes
    import pingouin as pg8

    row_vars_8 = [
        ("meanUserMsgLen",    "MsgLængde"),
        ("chatDurMin",        "ChatDur (min)"),
        ("secPerUserMsg",     "Sek/msg"),
        ("questionRatio",     "QRatio (bruger)"),
        ("questionRatioAsst", "QRatio (chatbot)"),
        ("mentalEffort",      "Cogn. load"),
        ("perceivedLearning1","Oplevet læring"),
        ("easeOfConversating1","Lethed"),
        ("adaptingToNeeds1",  "Tilpasning"),
    ]
    col_vars_8 = [
        ("codeTotal",         "FTtot"),
        ("followUpCodeTotal", "FUtot"),
        ("retention_change",  "RetΔ"),
    ]

    col_w_8   = 14
    row_lbl_8 = 20

    print(f"\n{'─'*60}")
    print( "  [8] Partial korrelationer kontrolleret for gruppe")
    print( "      Procesmål + kognitiv-oplevelsesmål × primære læringsoutcomes")
    print( "      Pearson partial r  |  * p < .05  ** p < .01")
    print(f"{'─'*60}")
    print(f"  {'':>{row_lbl_8}}" + "".join(f"  {l:>{col_w_8}}" for _, l in col_vars_8))
    print(f"  {'─'*row_lbl_8}" + ("  " + "─"*col_w_8) * len(col_vars_8))

    sep_printed = False
    for i, (rc, rl) in enumerate(row_vars_8):
        # Separator mellem procesmål og kognitiv-oplevelsesmål
        if i == 5 and not sep_printed:
            print(f"  {'─'*row_lbl_8}" + ("  " + "─"*col_w_8) * len(col_vars_8))
            sep_printed = True
        if rc not in df.columns:
            continue
        row_str = f"  {rl:<{row_lbl_8}}"
        for cc, _ in col_vars_8:
            if cc not in df.columns:
                row_str += f"  {'—':>{col_w_8}}"
                continue
            sub_8 = df[[rc, cc, "group_num"]].dropna()
            if len(sub_8) > 6:
                try:
                    res8 = pg8.partial_corr(data=sub_8, x=rc, y=cc, covar="group_num")
                    r8   = res8["r"].values[0]
                    p8   = res8["p_val"].values[0]
                    stars = "**" if p8 < 0.01 else ("*" if p8 < 0.05 else "")
                    p_str8 = "< .001" if p8 < 0.001 else f"{p8:.3f}"
                    cell8 = f"{r8:+.2f}{stars}({p_str8})"
                except Exception:
                    cell8 = "—"
            else:
                cell8 = "—"
            row_str += f"  {cell8:>{col_w_8}}"
        print(row_str)
    print(f"  Format: r(p)  |  N varierer per celle (pairwise deletion)")
    print(f"  FU-kolonner baseret på ~{len(df['followUpCodeTotal'].dropna())} deltagere med follow-up data")

    # ── [9] Bootstrap mediationsanalyser ─────────────────────────────────────
    import pingouin as pg9

    _med_models = [
        ("group_num", "meanUserMsgLen",  "followUpCodeTotal",
         "Model 1", "Gruppe → MsgLængde → FU-fritekst"),
        ("group_num", "meanUserMsgLen",  "codeTotal",
         "Model 2", "Gruppe → MsgLængde → Fritekst"),
        ("group_num", "pers_sum",        "codeTotal",
         "Model 3", "Gruppe → PERS-SUM → Fritekst"),
        ("group_num", "pers_sum",        "followUpCodeTotal",
         "Model 4", "Gruppe → PERS-SUM → FU-fritekst"),
        ("group_num", "pers_scaf_resp",  "codeTotal",
         "Model 5", "Gruppe → PERS-SCAF-RESP → Fritekst"),
        ("group_num", "pers_scaf_resp",  "followUpCodeTotal",
         "Model 6", "Gruppe → PERS-SCAF-RESP → FU-fritekst"),
        ("group_num", "meanUserMsgLen",  "retention_change",
         "Model 7", "Gruppe → MsgLængde → fritekst-retention"),
        ("group_num", "pers_sum",        "retention_change",
         "Model 8", "Gruppe → PERS-SUM → fritekst-retention"),
        ("group_num", "pers_scaf_resp",  "retention_change",
         "Model 9", "Gruppe → PERS-SCAF-RESP → fritekst-retention"),
    ]

    print(f"\n{'─'*60}")
    print("  [9] Bootstrap mediationsanalyser (5.000 resamples, percentile CI)")
    print(f"{'─'*60}")

    _med_results = []

    def _fp(p):
        if pd.isna(p): return "—"
        return "< .001" if p < 0.001 else f"{p:.3f}"

    for _x, _m, _y, _tag, _lbl in _med_models:
        if _m not in df.columns or _y not in df.columns:
            print(f"\n  {_lbl}: data mangler")
            continue
        _sub = df[[_x, _m, _y]].dropna()
        _N = len(_sub)

        _res = pg9.mediation_analysis(
            data=_sub, x=_x, m=_m, y=_y,
            n_boot=5000, seed=42, alpha=0.05
        )
        # pingouin path labels: "{m} ~ X", "Y ~ {m}", "Total", "Direct", "Indirect"
        # CI cols: "CI2.5", "CI97.5"
        def _g(row_idx, col):
            try: return _res.iloc[row_idx][col]
            except: return np.nan

        _a   = _g(0, "coef"); _a_se = _g(0, "se"); _a_p  = _g(0, "pval")
        _b   = _g(1, "coef"); _b_se = _g(1, "se"); _b_p  = _g(1, "pval")
        _c   = _g(2, "coef"); _c_p  = _g(2, "pval")
        _cp  = _g(3, "coef"); _cp_p = _g(3, "pval")
        _ind = _g(4, "coef")
        _lo  = _g(4, "CI2.5")
        _hi  = _g(4, "CI97.5")
        _ci_sig = (not (np.isnan(_lo) or np.isnan(_hi))) and not (_lo < 0 < _hi)
        _prop = _ind / _c if (not pd.isna(_c) and abs(_c) > 1e-6) else np.nan
        _b_stable = abs(_b_se) < abs(_b) * 0.5 if (not pd.isna(_b_se) and not pd.isna(_b) and abs(_b) > 1e-6) else None

        print(f"\n  {_tag}: {_lbl}  (N={_N})")
        print(f"  {'─'*55}")
        print(f"  a-path  (gruppe → mediator):   b = {_a:+.3f}, SE = {_a_se:.3f}, p = {_fp(_a_p)}")
        print(f"  b-path  (mediator → outcome):  b = {_b:+.3f}, SE = {_b_se:.3f}, p = {_fp(_b_p)}")
        print(f"  c-path  (total effekt):         b = {_c:+.3f}, p = {_fp(_c_p)}")
        print(f"  c'-path (direkte effekt):       b = {_cp:+.3f}, p = {_fp(_cp_p)}")
        _ci_str = f"[{_lo:+.3f}, {_hi:+.3f}]" if not (np.isnan(_lo) or np.isnan(_hi)) else "[—, —]"
        _sig_note = "  ← CI ekskluderer nul" if _ci_sig else "  ← CI inkluderer nul"
        print(f"  Indirekte (a×b):               b = {_ind:+.3f}, 95% CI {_ci_str}{_sig_note}")
        if not pd.isna(_prop):
            print(f"  Proportion mediated:           {_prop:.3f} ({_prop*100:.1f}%)")
        if _b_stable is not None:
            _stab_lbl = "stabil (SE < 50% af koefficient)" if _b_stable else "ustabil (SE ≥ 50% af koefficient)"
            print(f"  b-path stabilitet:             {_stab_lbl}")

        _med_results.append({
            "model": _tag, "label": _lbl, "N": _N,
            "a": _a, "b": _b, "c": _c, "c_prime": _cp, "indirect": _ind,
            "ci_lo": _lo, "ci_hi": _hi, "ci_sig": _ci_sig,
        })

    # ── Forest plot: indirekte effekter med CI ────────────────────────────────
    if _med_results:
        _fig_m, _ax_m = plt.subplots(figsize=(7, 3.5))
        _ys = list(range(len(_med_results)))
        for _i, _row in enumerate(_med_results):
            _clr = "#4C72B0" if _row["ci_sig"] else "#999999"
            _ax_m.scatter(_row["indirect"], _i, color=_clr, s=60, zorder=4)
            if not (np.isnan(_row["ci_lo"]) or np.isnan(_row["ci_hi"])):
                _ax_m.plot([_row["ci_lo"], _row["ci_hi"]], [_i, _i],
                           color=_clr, lw=2.5, zorder=3)
        _ax_m.axvline(0, color="#cccccc", lw=1.2, ls="--", zorder=1)
        _ax_m.set_yticks(_ys)
        _ax_m.set_yticklabels(
            [f"{r['model']}: {r['label'].split('→')[1].strip()} →\n{r['label'].split('→')[2].strip()}"
             for r in _med_results],
            fontsize=8
        )
        _ax_m.set_xlabel("Indirekte effekt (a × b)  med 95% bootstrap CI", fontsize=9)
        _ax_m.set_title("Bootstrap mediationsanalyser\n"
                         "(blå = CI ekskluderer nul)", fontsize=9, fontweight="bold")
        _ax_m.spines[["top", "right"]].set_visible(False)
        plt.tight_layout()
        _fig_m.savefig("plots/35_mediation_forest.png", dpi=150, bbox_inches="tight")
        plt.close()
        print(f"\n  Gemt → plots/35_mediation_forest.png")

    # ── [10] Regression med interaktionsled ──────────────────────────────────
    import statsmodels.formula.api as smf
    import statsmodels.api as _sm10
    from statsmodels.stats.outliers_influence import variance_inflation_factor as _vif
    import matplotlib.pyplot as _plt10

    _C_CTRL10 = "#999999"
    _C_INTR10 = "#4C72B0"

    _reg_models = [
        ("A", "meanUserMsgLen",  "MsgLængde",      False),
        ("B", "pers_sum",        "PERS-SUM",        True),
        ("C", "pers_scaf_resp",  "PERS-SCAF-RESP",  True),
    ]
    _reg_outcomes = [
        ("codeTotal",         "Fritekstscore (0–8)"),
        ("followUpCodeTotal", "FU-Fritekstscore (0–8)"),
    ]

    print(f"\n{'─'*60}")
    print("  [10] Regression med interaktionsled")
    print("       outcome ~ gruppe + moderator + gruppe × moderator")
    print("       Kovariater: pretestScore, alder, køn, uddannelse")
    print(f"{'─'*60}")

    for _mod_tag, _mod_col, _mod_lbl, _do_vif in _reg_models:
        if _mod_col not in df.columns:
            continue

        # Én figur per model med 2 subplots (én per outcome)
        _fig10, _axes10 = _plt10.subplots(1, 2, figsize=(11, 4.5))

        print(f"\n  ══ Model {_mod_tag}: moderator = {_mod_lbl} ══")

        for _ax10, (_out_col, _out_lbl) in zip(_axes10, _reg_outcomes):
            if _out_col not in df.columns:
                _ax10.axis("off")
                continue

            _cov_cols = [_out_col, "group_num", _mod_col,
                         "pretestScore", "age", "gender", "education"]
            _df10 = df[[c for c in _cov_cols if c in df.columns]].dropna().copy()
            _N10 = len(_df10)

            _formula10 = (f"{_out_col} ~ group_num * {_mod_col}"
                          f" + pretestScore + age + C(gender) + C(education)")
            _m10 = smf.ols(_formula10, data=_df10).fit()

            # Koefficienter
            print(f"\n  Outcome: {_out_lbl}  (N={_N10})")
            print(f"  {'─'*58}")
            print(f"  {'Term':<28}  {'b':>8}  {'SE':>7}  {'p':>9}")
            print(f"  {'─'*28}  {'─'*8}  {'─'*7}  {'─'*9}")

            _focus = [
                ("Intercept",                    "Intercept"),
                ("group_num",                    "Gruppe"),
                (_mod_col,                       _mod_lbl),
                (f"group_num:{_mod_col}",        f"Gruppe × {_mod_lbl}"),
                ("pretestScore",                 "Pretest"),
                ("age",                          "Alder"),
            ]
            for _term, _term_lbl in _focus:
                if _term not in _m10.params:
                    continue
                _b10  = _m10.params[_term]
                _se10 = _m10.bse[_term]
                _p10  = _m10.pvalues[_term]
                _p_s  = "< .001" if _p10 < 0.001 else f"{_p10:.3f}"
                _sig  = "**" if _p10 < 0.01 else ("*" if _p10 < 0.05 else "")
                _bold = " ◄" if "×" in _term_lbl and _p10 < 0.10 else ""
                print(f"  {_term_lbl:<28}  {_b10:>+8.3f}  {_se10:>7.3f}  {_p_s:>9}  {_sig}{_bold}")

            print(f"  R² = {_m10.rsquared:.3f}, adj. R² = {_m10.rsquared_adj:.3f}")

            # VIF for PERS-modeller
            if _do_vif:
                _exog     = _m10.model.exog
                _exog_nm  = _m10.model.exog_names
                _vif_rows = []
                for _vi, _vn in enumerate(_exog_nm):
                    if any(k in _vn for k in ["group_num", _mod_col]):
                        try:
                            _v = _vif(_exog, _vi)
                            _vif_rows.append((_vn, _v))
                        except Exception:
                            pass
                if _vif_rows:
                    print(f"  VIF (relevante led):")
                    for _vn, _v in _vif_rows:
                        _flag = "  ⚠ høj" if _v > 10 else ("  ⚠ moderat" if _v > 5 else "")
                        print(f"    {_vn:<35}  VIF = {_v:.1f}{_flag}")

            # ── Interaktionsplot ─────────────────────────────────────────────
            _mod_rng = np.linspace(_df10[_mod_col].min(), _df10[_mod_col].max(), 150)
            _m_pre   = _df10["pretestScore"].mean()
            _m_age   = _df10["age"].mean()
            _mo_g    = _df10["gender"].mode()[0]
            _mo_e    = _df10["education"].mode()[0]

            for _gval, _gname, _gclr, _glbl in [
                (0, "control",      _C_CTRL10, "Kontrol"),
                (1, "intervention", _C_INTR10, "Intervention"),
            ]:
                _pred10 = pd.DataFrame({
                    "group_num":    _gval,
                    _mod_col:       _mod_rng,
                    "pretestScore": _m_pre,
                    "age":          _m_age,
                    "gender":       _mo_g,
                    "education":    _mo_e,
                })
                _yp = _m10.predict(_pred10)
                _ax10.plot(_mod_rng, _yp, color=_gclr, lw=2.2, label=_glbl)
                _g10 = _df10[_df10["group_num"] == _gval]
                _ax10.scatter(_g10[_mod_col], _g10[_out_col],
                              color=_gclr, alpha=0.3, s=20, zorder=2)

            _ax10.set_xlabel(_mod_lbl, fontsize=9)
            _ax10.set_ylabel(_out_lbl, fontsize=9)
            _ax10.set_title(f"Model {_mod_tag}: {_mod_lbl} × {_out_lbl[:14]}",
                            fontsize=9, fontweight="bold")
            _ax10.legend(fontsize=8, frameon=False)
            _ax10.spines[["top", "right"]].set_visible(False)
            _ax10.tick_params(labelsize=8)

        _fig10.suptitle(
            f"Model {_mod_tag} — Interaktionsplot: Gruppe × {_mod_lbl}\n"
            f"(kovariater holdt ved gennemsnit/typisk)",
            fontsize=9, fontweight="bold"
        )
        _plt10.tight_layout(rect=[0, 0, 1, 0.93])
        _fname10 = f"plots/3{5 + ['A','B','C'].index(_mod_tag) + 1}_reg_model{_mod_tag.lower()}.png"
        _fig10.savefig(_fname10, dpi=150, bbox_inches="tight")
        _plt10.close()
        print(f"\n  Gemt → {_fname10}")

    print(f"\n⚠️  Analysen er baseret på N={n_total} af {len(main)} deltagere ({pct}% kodet).")


if __name__ == "__main__":
    run()
