"""
05_plots.py — Visualiseringer.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os

os.makedirs("plots", exist_ok=True)
sns.set_theme(style="whitegrid", palette="muted")
COLORS = {"control": "#6B7280", "intervention": "#3B82F6"}

def run():
    print("=== 05 PLOTS ===")
    df = pd.read_csv("data/processed/processed.csv")

    # 1) To plots side om side: linjediagram + learning gain barplot
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    # 1a) Linjediagram — gennemsnitlig pre/post
    from scipy.stats import ttest_ind
    ax = axes[0]
    for grp, color in COLORS.items():
        sub = df[df["group"] == grp]
        ax.plot(["Pretest", "Posttest"],
                [sub["pretestScore"].mean(), sub["posttestScore"].mean()],
                marker="o", label=grp.capitalize(), color=color, linewidth=2)
    ax.set_ylim(0, 4)
    ax.set_yticks([0, 1, 2, 3, 4])
    ax.set_ylabel("Score (0–4)")
    ax.set_title("Gennemsnitlig score: pre vs. post")
    ax.legend()

    # 1b) Learning gain barplot med stats
    ax = axes[1]
    ctrl_gain = df[df["group"] == "control"]["learning_gain"].dropna()
    intr_gain = df[df["group"] == "intervention"]["learning_gain"].dropna()
    t_val, p_val = ttest_ind(intr_gain, ctrl_gain, equal_var=False)
    diff = intr_gain.mean() - ctrl_gain.mean()
    pooled_std = np.sqrt((ctrl_gain.std()**2 + intr_gain.std()**2) / 2)
    d_val = diff / pooled_std if pooled_std > 0 else 0
    se_diff = np.sqrt(ctrl_gain.std()**2/len(ctrl_gain) + intr_gain.std()**2/len(intr_gain))
    from scipy.stats import t as t_dist
    df_w = (ctrl_gain.std()**2/len(ctrl_gain) + intr_gain.std()**2/len(intr_gain))**2 / (
           (ctrl_gain.std()**2/len(ctrl_gain))**2/(len(ctrl_gain)-1) +
           (intr_gain.std()**2/len(intr_gain))**2/(len(intr_gain)-1))
    h = se_diff * t_dist.ppf(0.975, df=df_w)

    for i, (grp, color) in enumerate(COLORS.items()):
        sub = df[df["group"] == grp]["learning_gain"].dropna()
        ax.bar(i, sub.mean(), color=color, alpha=0.85,
               yerr=sub.sem(), capsize=4, label=grp.capitalize())
    ax.set_xticks([0, 1])
    ax.set_xticklabels(["Control", "Intervention"])
    ax.axhline(0, color="gray", linewidth=0.8, linestyle="--")
    ax.set_ylabel("Learning gain (posttest − pretest)")
    sig_str = "p < 0.05 *" if p_val < 0.05 else "n.s."
    ax.set_title(f"Learning gain per gruppe (M ± SE)\n"
                 f"Δ={diff:+.2f}, 95% CI=[{diff-h:.2f}, {diff+h:.2f}], d={d_val:.2f}, {sig_str}")

    plt.suptitle("Score-oversigt", y=1.02)
    plt.tight_layout()
    plt.savefig("plots/01_pre_post.png", dpi=150, bbox_inches="tight")
    plt.close()

    # 3) Subjektive mål (barplot med fejlmarginer)
    secondary_cols = {
        "perceivedLearning1":  "Subjektiv læring",
        "easeOfConversating1": "Nem samtale",
        "adaptingToNeeds1":    "Tilpasning til behov",
        "mentalEffort":        "Mental indsats",
    }
    existing = {k: v for k, v in secondary_cols.items() if k in df.columns}
    if existing:
        fig, axes = plt.subplots(1, len(existing), figsize=(4 * len(existing), 5))
        if len(existing) == 1:
            axes = [axes]
        for ax, (col, label) in zip(axes, existing.items()):
            sns.barplot(data=df, x="group", y=col, palette=COLORS, ax=ax,
                        errorbar="se", capsize=0.1)
            ax.set_title(label)
            ax.set_xlabel("")
        plt.suptitle("Sekundære mål per gruppe", y=1.02)
        plt.tight_layout()
        plt.savefig("plots/03_secondary.png", dpi=150, bbox_inches="tight")
        plt.close()

    # 4) Chat varighed vs. learning gain (scatterplot)
    if "chat_duration_min" in df.columns:
        from scipy.stats import linregress
        fig, ax = plt.subplots(figsize=(6, 5))
        sub_all = df.dropna(subset=["chat_duration_min", "learning_gain"])
        for grp, color in COLORS.items():
            sub = sub_all[sub_all["group"] == grp]
            ax.scatter(sub["chat_duration_min"], sub["learning_gain"],
                       label=grp.capitalize(), color=color, alpha=0.7)
        if len(sub_all) > 2:
            slope, intercept, r, p, _ = linregress(sub_all["chat_duration_min"], sub_all["learning_gain"])
            x_range = np.linspace(sub_all["chat_duration_min"].min(), sub_all["chat_duration_min"].max(), 100)
            ax.plot(x_range, slope * x_range + intercept, color="#f97316",
                    linewidth=2, linestyle="--", label="Regression")
            ax.text(0.97, 0.05, f"r = {r:.2f},  p = {p:.3f}",
                    transform=ax.transAxes, ha="right", va="bottom", fontsize=10, color="#f97316",
                    bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.7, edgecolor="#f97316"))
        ax.set_xlabel("Chat varighed (minutter)")
        ax.set_ylabel("Learning gain")
        ax.set_title("Chat varighed vs. learning gain")
        ax.legend()
        plt.tight_layout()
        plt.savefig("plots/04_chat_vs_learning.png", dpi=150)
        plt.close()

    # 5) Jittered dotplot — pre og posttest score per gruppe
    fig, axes = plt.subplots(1, 2, figsize=(10, 5))
    for ax, (col, title) in zip(axes, [("pretestScore", "Pretest"), ("posttestScore", "Posttest")]):
        sns.stripplot(data=df, x="group", y=col, palette=COLORS, ax=ax,
                      size=8, jitter=True, alpha=0.8, edgecolor="white", linewidth=0.6)
        ax.set_ylim(-0.3, 4.3)
        ax.set_yticks([0, 1, 2, 3, 4])
        ax.set_xlabel("Gruppe")
        ax.set_ylabel("Score (0–4)")
        ax.set_title(f"{title} score per deltager")
    plt.tight_layout()
    plt.savefig("plots/05_pre_post_dotplot.png", dpi=150)
    plt.close()

    # 6) Tidsfordeling: læsning og chat (KDE per gruppe)
    time_vars = [
        ("readingTime",      "Læsetid (sekunder)",      lambda x: x / 1000, 60,   "Min. 1 min"),
        ("chat_duration_min","Chat varighed (minutter)", lambda x: x,        3.5,  "Min. 3,5 min"),
        ("freeTextWordCount","Fritekst (antal tegn)",    lambda x: x,        250,  "Min. 250 tegn"),
    ]

    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    for ax, (col, xlabel, transform, min_val, min_label) in zip(axes, time_vars):
        show_median = (col == "freeTextWordCount")
        for grp, color in COLORS.items():
            vals = df[df["group"] == grp][col].dropna()
            if len(vals) < 2:
                continue
            vals = vals.apply(transform)
            sns.kdeplot(vals, ax=ax, label=grp.capitalize(), color=color,
                        fill=True, alpha=0.25, linewidth=2)
            if show_median:
                mean_label = f"{grp.capitalize()} M = {vals.mean():.1f} (Mdn = {vals.median():.1f})"
            else:
                mean_label = f"{grp.capitalize()} M = {vals.mean():.1f}"
            ax.axvline(vals.mean(), color=color, linestyle="--", linewidth=1.2,
                       alpha=0.8, label=mean_label)
            from scipy.stats import gaussian_kde
            kde = gaussian_kde(vals)
            ax.scatter(vals, kde(vals), color=color, s=40, zorder=5,
                       edgecolors="white", linewidth=0.6, alpha=0.9)
        # Minimumsgrænse
        ax.axvline(min_val, color="red", linestyle=":", linewidth=1.5, zorder=6)
        ha = "left" if col != "freeTextWordCount" else "right"
        offset = " " if ha == "left" else " "
        ax.text(min_val, ax.get_ylim()[1] * 0.97,
                f"{min_label} " if ha == "right" else f" {min_label}",
                color="red", fontsize=7, va="top", ha=ha)
        ax.set_xlabel(xlabel)
        ax.set_ylabel("Tæthed")
        ax.legend(fontsize=8)

    axes[0].set_title("Fordeling af læsetid")
    axes[1].set_title("Fordeling af chat varighed")
    axes[2].set_title("Fordeling af fritekst længde")
    plt.suptitle("Tids- og tekstfordeling per gruppe", y=1.02)
    plt.tight_layout()
    plt.savefig("plots/06_time_distributions.png", dpi=150, bbox_inches="tight")
    plt.close()

    # 7) EVT → learning_gain, posttest, pretest + fritekst score
    from scipy.stats import linregress
    evt_targets = [
        ("learning_gain", "Learning gain (posttest − pretest)"),
        ("posttestScore",  "Posttest score (0–4)"),
        ("pretestScore",   "Pretest score (0–4)"),
    ]
    sub_base = df[["evt_mean", "learning_gain", "posttestScore", "pretestScore", "group"]].dropna()
    has_code = "codeTotal" in df.columns
    n_plots = 4 if has_code else 3
    if len(sub_base) > 5:
        fig, axes = plt.subplots(1, n_plots, figsize=(5.5 * n_plots, 5))
        for ax, (ycol, ylabel) in zip(axes, evt_targets):
            sub = sub_base[["evt_mean", ycol, "group"]].dropna()
            for grp, color in COLORS.items():
                g = sub[sub["group"] == grp]
                ax.scatter(g["evt_mean"], g[ycol], color=color,
                           label=grp.capitalize(), s=60, edgecolors="white",
                           linewidth=0.6, zorder=5, alpha=0.9)
            slope, intercept, r, p, _ = linregress(sub["evt_mean"], sub[ycol])
            x_range = np.linspace(sub["evt_mean"].min(), sub["evt_mean"].max(), 100)
            ax.plot(x_range, slope * x_range + intercept, color="#f97316",
                    linewidth=2, linestyle="--", zorder=4, label="Regression")
            ax.set_xlabel("EVT score (motivation)")
            ax.set_ylabel(ylabel)
            ax.set_title(f"EVT → {ylabel.split('(')[0].strip()}")
            ax.legend(fontsize=9)
            ax.text(0.97, 0.05, f"r = {r:.2f},  p = {p:.3f}",
                    transform=ax.transAxes, ha="right", va="bottom",
                    fontsize=10, color="#f97316",
                    bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.7, edgecolor="#f97316"))
        if has_code:
            ax = axes[3]
            sub_ft = df[["evt_mean", "codeTotal", "group"]].dropna()
            for grp, color in COLORS.items():
                g = sub_ft[sub_ft["group"] == grp]
                ax.scatter(g["evt_mean"], g["codeTotal"], color=color,
                           label=grp.capitalize(), s=60, edgecolors="white",
                           linewidth=0.6, zorder=5, alpha=0.9)
            if len(sub_ft) > 2:
                slope, intercept, r, p, _ = linregress(sub_ft["evt_mean"], sub_ft["codeTotal"])
                x_range = np.linspace(sub_ft["evt_mean"].min(), sub_ft["evt_mean"].max(), 100)
                ax.plot(x_range, slope * x_range + intercept, color="#f97316",
                        linewidth=2, linestyle="--", zorder=4, label="Regression")
                ax.text(0.97, 0.05, f"r = {r:.2f},  p = {p:.3f}",
                        transform=ax.transAxes, ha="right", va="bottom",
                        fontsize=10, color="#f97316",
                        bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.7, edgecolor="#f97316"))
            ax.set_xlabel("EVT score (motivation)")
            ax.set_ylabel("Fritekst score (0–8)")
            ax.set_title("EVT → Fritekst score")
            ax.legend(fontsize=9)
        plt.suptitle("EVT motivation som prædiktor", y=1.02)
        plt.tight_layout()
        plt.savefig("plots/07_evt_learning.png", dpi=150, bbox_inches="tight")
        plt.close()

    # ── FRITEKST KODNING ────────────────────────────────────────────────────────
    code_cols = ["codeA1", "codeA2", "codeA3", "codeB1", "codeTotal"]
    if all(c in df.columns for c in code_cols):
        coded = df[df["codeTotal"].notna()].copy()
        from scipy.stats import ttest_ind, sem

        # 8) Dotplot — total fritekst score per deltager per gruppe
        from scipy.stats import t as t_dist
        fig, ax = plt.subplots(figsize=(6, 5.5))
        for xi, (grp, color) in enumerate(COLORS.items()):
            sub = coded[coded["group"] == grp]["codeTotal"].dropna().values
            rng = np.random.default_rng(42)
            jitter = rng.uniform(-0.12, 0.12, size=len(sub))
            ax.scatter(xi + jitter, sub, color=color, alpha=0.65,
                       edgecolors="white", linewidth=0.5, s=55, zorder=3)
            m = sub.mean()
            se = sem(sub)
            ci = t_dist.ppf(0.975, df=len(sub) - 1) * se  # 95% CI
            # mean line
            ax.plot([xi - 0.22, xi + 0.22], [m, m], color=color,
                    linewidth=2.5, zorder=4)
            # 95% CI bar
            ax.plot([xi, xi], [m - ci, m + ci], color=color, linewidth=2, zorder=4)
            ax.plot([xi - 0.08, xi + 0.08], [m - ci, m - ci], color=color, linewidth=1.5, zorder=4)
            ax.plot([xi - 0.08, xi + 0.08], [m + ci, m + ci], color=color, linewidth=1.5, zorder=4)

        ax.set_title("FritekstScore i kontrol- og interventionsbetingelsen", pad=10)
        ax.set_xticks([0, 1])
        ax.set_xticklabels(["Kontrol", "Intervention"])
        ax.set_ylabel("Total score (A1 + A2 + A3 + B1, 0–8)")
        ax.set_ylim(-0.3, 8.5)
        ax.set_yticks(range(9))
        sns.despine(ax=ax)
        plt.tight_layout(pad=1.5)
        plt.savefig("plots/08_fritekst_dotplot.png", dpi=150, bbox_inches="tight")
        plt.close()

        # 9) Barplot — gennemsnit per parameter + total per gruppe
        params = ["codeA1", "codeA2", "codeA3", "codeB1"]
        param_labels = ["A1\nEnergibalance", "A2\nKompensation",
                        "A3\nKonsekvens", "B1\nLøsning"]
        width = 0.35

        fig, (ax_params, ax_total) = plt.subplots(
            1, 2, figsize=(11, 5),
            gridspec_kw={"width_ratios": [4, 1.2]}
        )

        # venstre: individuelle parametre (skala 0–2)
        x = np.arange(len(params))
        for i, (grp, color) in enumerate(COLORS.items()):
            sub = coded[coded["group"] == grp]
            means = [sub[c].mean() for c in params]
            sems  = [sem(sub[c].dropna()) for c in params]
            offset = (i - 0.5) * width
            ax_params.bar(x + offset, means, width, label=grp.capitalize(),
                          color=color, alpha=0.85, yerr=sems,
                          capsize=4, error_kw={"linewidth": 1.2})

        for xi, c in enumerate(params):
            ci = coded[coded["group"] == "control"][c].dropna()
            ii = coded[coded["group"] == "intervention"][c].dropna()
            if len(ci) >= 2 and len(ii) >= 2:
                _, pp = ttest_ind(ii, ci, equal_var=False)
                if pp < 0.05:
                    ymax = max(ci.mean() + sem(ci), ii.mean() + sem(ii))
                    ax_params.text(xi, ymax + 0.08, "*", ha="center",
                                   fontsize=14, color="black")

        ax_params.set_xticks(x)
        ax_params.set_xticklabels(param_labels)
        ax_params.set_ylabel("Gennemsnit score (0–2)")
        ax_params.set_ylim(0, 2.3)
        ax_params.set_yticks([0, 0.5, 1.0, 1.5, 2.0])
        ax_params.legend()
        ax_params.set_title("Per parameter (M ± SE)")

        # højre: total score (skala 0–8)
        for i, (grp, color) in enumerate(COLORS.items()):
            sub = coded[coded["group"] == grp]["codeTotal"].dropna()
            offset = (i - 0.5) * width
            ax_total.bar(offset, sub.mean(), width, label=grp.capitalize(),
                         color=color, alpha=0.85, yerr=sem(sub),
                         capsize=4, error_kw={"linewidth": 1.2})

        # signifikansannotering total
        ct = coded[coded["group"] == "control"]["codeTotal"].dropna()
        it = coded[coded["group"] == "intervention"]["codeTotal"].dropna()
        _, pp_tot = ttest_ind(it, ct, equal_var=False)
        ps_tot = ((ct.std()**2 + it.std()**2) / 2) ** 0.5
        d_tot = (it.mean() - ct.mean()) / ps_tot if ps_tot > 0 else 0
        ymax_tot = max(ct.mean() + sem(ct), it.mean() + sem(it))
        sig_lbl = "*" if pp_tot < 0.05 else f"p={pp_tot:.2f}"
        ax_total.text(0, ymax_tot + 0.3, sig_lbl, ha="center",
                      fontsize=12 if pp_tot < 0.05 else 9, color="black")

        ax_total.set_xticks([0])
        ax_total.set_xticklabels(["Total\n(max 8)"])
        ax_total.set_ylabel("Gennemsnit score (0–8)")
        ax_total.set_ylim(0, 8.5)
        ax_total.set_yticks([0, 2, 4, 6, 8])
        ax_total.set_title(f"Total (d={d_tot:.2f})")

        plt.suptitle("Fritekst kodning per gruppe (M ± SE)  |  * = p < .05",
                     y=1.02)
        plt.tight_layout()
        plt.savefig("plots/09_fritekst_params.png", dpi=150, bbox_inches="tight")
        plt.close()

        print("  Gemt → plots/08_fritekst_dotplot.png, plots/09_fritekst_params.png")

    # =========================================================
    # 12 + 13) FOLLOW-UP FRITEKST KODNING
    # =========================================================
    fu_code_cols = ["followUpCodeA1", "followUpCodeA2", "followUpCodeA3", "followUpCodeB1", "followUpCodeTotal"]
    if all(c in df.columns for c in fu_code_cols):
        from scipy.stats import ttest_ind, sem as scipy_sem
        fu_coded = df[df["followUpCodeTotal"].notna()].copy()

        if len(fu_coded) >= 2:
            # 12) Dotplot — follow-up total score
            from scipy.stats import t as t_dist_fu2
            fig, ax = plt.subplots(figsize=(6, 5.5))
            for xi, (grp, color) in enumerate(COLORS.items()):
                sub = fu_coded[fu_coded["group"] == grp]["followUpCodeTotal"].dropna().values
                if len(sub) == 0:
                    continue
                rng = np.random.default_rng(42)
                jitter = rng.uniform(-0.12, 0.12, size=len(sub))
                ax.scatter(xi + jitter, sub, color=color, alpha=0.65,
                           edgecolors="white", linewidth=0.5, s=55, zorder=3)
                if len(sub) >= 1:
                    m = sub.mean()
                    ax.plot([xi - 0.22, xi + 0.22], [m, m], color=color,
                            linewidth=2.5, zorder=4)
                if len(sub) >= 2:
                    se = scipy_sem(sub)
                    ci = t_dist_fu2.ppf(0.975, df=len(sub) - 1) * se  # 95% CI
                    ax.plot([xi, xi], [m - ci, m + ci], color=color, linewidth=2, zorder=4)
                    ax.plot([xi - 0.08, xi + 0.08], [m - ci, m - ci], color=color, linewidth=1.5, zorder=4)
                    ax.plot([xi - 0.08, xi + 0.08], [m + ci, m + ci], color=color, linewidth=1.5, zorder=4)

            from scipy.stats import t as t_dist_fu
            ax.set_title("Follow-up FritekstScore i kontrol- og interventionsbetingelsen", pad=10)
            ax.set_xticks([0, 1])
            ax.set_xticklabels(["Kontrol", "Intervention"])
            ax.set_ylabel("Total score (A1 + A2 + A3 + B1, 0–8)")
            ax.set_ylim(-0.3, 8.5)
            ax.set_yticks(range(9))
            sns.despine(ax=ax)
            plt.tight_layout(pad=1.5)
            plt.savefig("plots/12_followup_dotplot.png", dpi=150, bbox_inches="tight")
            plt.close()

            # 13) Barplot — per parameter + total
            fu_params = ["followUpCodeA1", "followUpCodeA2", "followUpCodeA3", "followUpCodeB1"]
            param_labels = ["A1\nEnergibalance", "A2\nKompensation", "A3\nKonsekvens", "B1\nLøsning"]
            width = 0.35

            fig, (ax_params, ax_total) = plt.subplots(
                1, 2, figsize=(11, 5),
                gridspec_kw={"width_ratios": [4, 1.2]}
            )

            ctrl_fu = fu_coded[fu_coded["group"] == "control"]["followUpCodeTotal"].dropna()
            intr_fu = fu_coded[fu_coded["group"] == "intervention"]["followUpCodeTotal"].dropna()

            x = np.arange(len(fu_params))
            for i, (grp, color) in enumerate(COLORS.items()):
                sub = fu_coded[fu_coded["group"] == grp]
                means = [sub[c].mean() for c in fu_params]
                sems  = [scipy_sem(sub[c].dropna()) if len(sub[c].dropna()) >= 2 else 0 for c in fu_params]
                offset = (i - 0.5) * width
                ax_params.bar(x + offset, means, width, label=grp.capitalize(),
                              color=color, alpha=0.85, yerr=sems,
                              capsize=4, error_kw={"linewidth": 1.2})

            ax_params.set_xticks(x)
            ax_params.set_xticklabels(param_labels)
            ax_params.set_ylabel("Gennemsnit score (0–2)")
            ax_params.set_ylim(0, 2.3)
            ax_params.set_yticks([0, 0.5, 1.0, 1.5, 2.0])
            ax_params.legend()
            ax_params.set_title("Per parameter (M ± SE)")

            for i, (grp, color) in enumerate(COLORS.items()):
                sub = fu_coded[fu_coded["group"] == grp]["followUpCodeTotal"].dropna()
                if len(sub) == 0:
                    continue
                offset = (i - 0.5) * width
                yerr = scipy_sem(sub) if len(sub) >= 2 else 0
                ax_total.bar(offset, sub.mean(), width, label=grp.capitalize(),
                             color=color, alpha=0.85, yerr=yerr,
                             capsize=4, error_kw={"linewidth": 1.2})

            if len(ctrl_fu) >= 2 and len(intr_fu) >= 2:
                ps_t = ((ctrl_fu.std()**2 + intr_fu.std()**2) / 2) ** 0.5
                d_t = (intr_fu.mean() - ctrl_fu.mean()) / ps_t if ps_t > 0 else 0
                _, pp_t = ttest_ind(intr_fu, ctrl_fu, equal_var=False)
                ymax_t = max(ctrl_fu.mean() + scipy_sem(ctrl_fu), intr_fu.mean() + scipy_sem(intr_fu))
                sig_lbl = "*" if pp_t < 0.05 else f"p={pp_t:.2f}"
                ax_total.text(0, ymax_t + 0.3, sig_lbl, ha="center",
                              fontsize=12 if pp_t < 0.05 else 9, color="black")
                ax_total.set_title(f"Total (d={d_t:.2f})")
            else:
                ax_total.set_title("Total")

            ax_total.set_xticks([0])
            ax_total.set_xticklabels(["Total\n(max 8)"])
            ax_total.set_ylabel("Gennemsnit score (0–8)")
            ax_total.set_ylim(0, 8.5)
            ax_total.set_yticks([0, 2, 4, 6, 8])

            plt.suptitle(f"Follow-up fritekst kodning per gruppe (N={len(fu_coded)}, M ± SE)  |  * = p < .05",
                         y=1.02)
            plt.tight_layout()
            plt.savefig("plots/13_followup_params.png", dpi=150, bbox_inches="tight")
            plt.close()

            print(f"  Gemt → plots/12_followup_dotplot.png, plots/13_followup_params.png  (N={len(fu_coded)})")
        else:
            print(f"  Follow-up kodning: kun N={len(fu_coded)} — springer plot over")

    # =========================================================
    # 10) Aktiv testtid — chat + læsning (histogram + KDE)
    # =========================================================
    if "chatDuration" in df.columns and "readingTime" in df.columns:
        from scipy import stats as scipy_stats

        df["active_min"] = (df["chatDuration"].fillna(0) + df["readingTime"].fillna(0)) / 1000 / 60
        sub_active = df[df["active_min"] > 0].copy()

        fig, ax = plt.subplots(figsize=(9, 5))
        all_vals = []
        for grp, color in COLORS.items():
            sub = sub_active[sub_active["group"] == grp]["active_min"]
            all_vals.extend(sub.tolist())
            ax.hist(sub, bins=12, alpha=0.35, color=color,
                    label=f"{grp.capitalize()} (N={len(sub)}, M={sub.mean():.1f} min)",
                    density=True)
            if len(sub) > 5:
                kde = scipy_stats.gaussian_kde(sub, bw_method="scott")
                xs = np.linspace(sub.min(), sub.max(), 300)
                ax.plot(xs, kde(xs), color=color, linewidth=2)
                ax.axvline(sub.mean(), color=color, linestyle="--", linewidth=1.5)

        if len(all_vals) >= 3:
            stat_sw, p_sw = scipy_stats.shapiro(all_vals)
            norm_txt = "≈ normalfordelt" if p_sw > 0.05 else "ikke normalfordelt (skæv)"
            ax.text(0.98, 0.97, f"Shapiro-Wilk: W={stat_sw:.3f}, p={p_sw:.3f}\n{norm_txt}",
                    transform=ax.transAxes, ha="right", va="top", fontsize=9, color="#444",
                    bbox=dict(boxstyle="round,pad=0.3", fc="white", alpha=0.7))

        ax.set_xlabel("Aktiv tid (minutter)")
        ax.set_ylabel("Tæthed")
        ax.set_title("Aktiv testtid per deltager (chat + læsning)")
        ax.legend()
        plt.tight_layout()
        plt.savefig("plots/10_total_duration.png", dpi=150, bbox_inches="tight")
        plt.close()
        print("  Gemt → plots/10_total_duration.png")

    # ── Plot 15: 2×2 linjediagram — immediate vs follow-up fritekst score ────────
    if "followUpCodeTotal" in df.columns and "codeTotal" in df.columns:
        paired15 = df[df["followUpCodeTotal"].notna() & df["codeTotal"].notna()].copy()
        if len(paired15) >= 4:
            from scipy import stats as scipy_stats
            fig, ax = plt.subplots(figsize=(7, 5))
            timepoints = ["Første måling", "Follow-up"]
            for grp, color in COLORS.items():
                sub = paired15[paired15["group"] == grp]
                means = [sub["codeTotal"].mean(), sub["followUpCodeTotal"].mean()]
                ns    = [sub["codeTotal"].count(), sub["followUpCodeTotal"].count()]
                cis   = [
                    scipy_stats.sem(sub["codeTotal"].dropna())   * scipy_stats.t.ppf(0.975, df=ns[0]-1),
                    scipy_stats.sem(sub["followUpCodeTotal"].dropna()) * scipy_stats.t.ppf(0.975, df=ns[1]-1),
                ]
                label = f"{'Kontrol' if grp == 'control' else 'Intervention'} (n={ns[0]})"
                ax.plot(timepoints, means, marker="o", color=color, linewidth=2.2, markersize=7, label=label)
                ax.fill_between(timepoints,
                    [m - c for m, c in zip(means, cis)],
                    [m + c for m, c in zip(means, cis)],
                    alpha=0.07, color=color)
                for x, m, ci in zip(timepoints, means, cis):
                    ax.errorbar(x, m, yerr=ci, fmt="none", color=color, capsize=5, linewidth=1.5)
            ax.set_ylabel("Total score (A1 + A2 + A3 + B1, 0–8)", fontsize=12)
            ax.set_ylim(0, 8)
            ax.set_yticks([0, 2, 4, 6, 8])
            ax.set_title("Fritekstscore ved første måling og follow-up", fontsize=13)
            ax.legend(fontsize=10)
            ax.grid(axis="y", alpha=0.3)
            sns.despine(ax=ax)
            plt.tight_layout()
            plt.savefig("plots/15_retention_lineplot.png", dpi=150, bbox_inches="tight")
            plt.close()
            print(f"  Gemt → plots/15_retention_lineplot.png  (N={len(paired15)})")
        else:
            print(f"  Plot 15: for få med begge mål (N={len(paired15)})")

    # ── Plot 14: Mekanismer — chat beskeder → learning_gain  +  fritekst tegn → codeTotal ──
    from scipy.stats import linregress
    mech_pairs = []
    if "chatMessageCount" in df.columns and "learning_gain" in df.columns:
        sub = df[["chatMessageCount", "learning_gain", "group"]].dropna()
        if len(sub) > 5:
            mech_pairs.append((sub, "chatMessageCount", "learning_gain",
                               "Chat beskeder", "Learning gain", "14a_mech_chat_gain"))
    if "freeTextWordCount" in df.columns and "codeTotal" in df.columns:
        sub = df[["freeTextWordCount", "codeTotal", "group"]].dropna()
        if len(sub) > 5:
            mech_pairs.append((sub, "freeTextWordCount", "codeTotal",
                               "Fritekst tegn", "Fritekst score (0–8)", "14b_mech_fritekst_code"))

    for sub, xcol, ycol, xlabel, ylabel, fname in mech_pairs:
        fig, ax = plt.subplots(figsize=(6, 5))
        for grp, color in COLORS.items():
            g = sub[sub["group"] == grp]
            ax.scatter(g[xcol], g[ycol], color=color, label=grp.capitalize(),
                       s=60, edgecolors="white", linewidth=0.6, zorder=5, alpha=0.9)
        slope, intercept, r, p, _ = linregress(sub[xcol], sub[ycol])
        x_range = np.linspace(sub[xcol].min(), sub[xcol].max(), 100)
        ax.plot(x_range, slope * x_range + intercept, color="#f97316",
                linewidth=2, linestyle="--", zorder=4, label="Regression")
        sig = "p < .05" if p < 0.05 else "n.s."
        ax.text(0.97, 0.05, f"r = {r:.2f},  p = {p:.3f}  ({sig})",
                transform=ax.transAxes, ha="right", va="bottom", fontsize=10, color="#f97316",
                bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.7, edgecolor="#f97316"))
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        ax.set_title(f"{xlabel} → {ylabel}")
        ax.legend(fontsize=9)
        plt.tight_layout()
        plt.savefig(f"plots/{fname}.png", dpi=150, bbox_inches="tight")
        plt.close()
        print(f"  Gemt → plots/{fname}.png  (N={len(sub)}, r={r:.2f}, p={p:.3f})")

    # ── Plot 11: Daglig deltagelse ────────────────────────────────────────────
    raw = pd.read_csv("data/raw/latest.csv")
    raw["createdAt"] = pd.to_datetime(raw["createdAt"], utc=True)
    completed_raw = raw[raw["completed"] == True].copy()
    completed_raw["date"] = completed_raw["createdAt"].dt.date
    daily = completed_raw.groupby("date").size().reset_index(name="n")
    daily["date"] = pd.to_datetime(daily["date"])

    # Follow-up per dag (bruger updatedAt som proxy for hvornår de tog followup)
    fu_col = "followUpCompleted"
    fu_date_col = "followUpCompletedAt" if "followUpCompletedAt" in raw.columns else None
    if fu_col in raw.columns:
        fu_raw = raw[raw[fu_col] == True].copy()
        if fu_date_col and fu_raw[fu_date_col].notna().any():
            fu_raw["fu_date"] = pd.to_datetime(fu_raw[fu_date_col], utc=True).dt.date
        else:
            fu_raw["fu_date"] = pd.to_datetime(fu_raw["updatedAt"], utc=True).dt.date
        daily_fu = fu_raw.groupby("fu_date").size().reset_index(name="n_fu")
        daily_fu["fu_date"] = pd.to_datetime(daily_fu["fu_date"])
    else:
        daily_fu = None

    all_dates = pd.date_range(daily["date"].min(), daily["date"].max(), freq="D")
    daily = daily.set_index("date").reindex(all_dates, fill_value=0).reset_index()
    daily.columns = ["date", "n"]
    daily["cumsum"] = daily["n"].cumsum()
    total_n = int(daily["n"].sum())

    if daily_fu is not None:
        daily_fu = daily_fu.set_index("fu_date").reindex(all_dates, fill_value=0).reset_index()
        daily_fu.columns = ["date", "n_fu"]
        daily_fu["cumsum_fu"] = daily_fu["n_fu"].cumsum()
        total_fu = int(daily_fu["n_fu"].sum())
    else:
        daily_fu = None
        total_fu = 0

    fig, (ax_bar, ax_cum) = plt.subplots(2, 1, figsize=(10, 7), sharex=True)

    import matplotlib.dates as mdates
    MONTH_DA = {3: "mar", 4: "apr", 5: "maj", 6: "jun", 7: "jul", 8: "aug"}

    # Øverst: nye per dag (del 1 + followup)
    width = 0.4
    dates_num = mdates.date2num(daily["date"].dt.to_pydatetime())
    bars = ax_bar.bar(daily["date"] - pd.Timedelta(hours=5), daily["n"],
                      color=COLORS["intervention"], alpha=0.75, width=0.4, label="Del 1")
    for bar, val in zip(bars, daily["n"]):
        if val > 0:
            ax_bar.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.05,
                        str(int(val)), ha="center", va="bottom", fontsize=8, color=COLORS["intervention"])
    if daily_fu is not None:
        bars_fu = ax_bar.bar(daily_fu["date"] + pd.Timedelta(hours=5), daily_fu["n_fu"],
                             color=COLORS["control"], alpha=0.75, width=0.4, label="Follow-up")
        for bar, val in zip(bars_fu, daily_fu["n_fu"]):
            if val > 0:
                ax_bar.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.05,
                            str(int(val)), ha="center", va="bottom", fontsize=8, color=COLORS["control"])
    ax_bar.set_ylabel("Nye fuldførsler per dag")
    title = f"Daglig deltagelse — Del 1: N={total_n}"
    if total_fu:
        title += f", Follow-up: N={total_fu}"
    ax_bar.set_title(title)
    ax_bar.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
    ax_bar.legend(fontsize=9)

    # Nederst: kumulativ (del 1 + followup)
    ax_cum.plot(daily["date"], daily["cumsum"], color=COLORS["intervention"], linewidth=2, label="Del 1")
    ax_cum.fill_between(daily["date"], daily["cumsum"], alpha=0.15, color=COLORS["intervention"])
    if daily_fu is not None and total_fu > 0:
        ax_cum.plot(daily_fu["date"], daily_fu["cumsum_fu"], color=COLORS["control"],
                    linewidth=2, linestyle="--", label="Follow-up")
        ax_cum.fill_between(daily_fu["date"], daily_fu["cumsum_fu"], alpha=0.1, color=COLORS["control"])
    ax_cum.set_ylabel("Kumulativt antal")
    ax_cum.set_xlabel("Dato")
    ax_cum.legend(fontsize=9)

    # Datoformat: "d. 2 apr"
    def fmt_date(d, _):
        dt = mdates.num2date(d)
        return f"d. {dt.day} {MONTH_DA.get(dt.month, dt.strftime('%b'))}"
    ax_cum.xaxis.set_major_locator(mdates.DayLocator(interval=1))
    ax_cum.xaxis.set_major_formatter(plt.FuncFormatter(fmt_date))
    fig.autofmt_xdate(rotation=45)
    plt.tight_layout()
    plt.savefig("plots/11_daglig_deltagelse.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Gemt → plots/11_daglig_deltagelse.png")

    # ── Plot 16: EVT → FUtot scatter ─────────────────────────────────────────────
    if "evt_mean" in df.columns and "followUpCodeTotal" in df.columns:
        from scipy.stats import linregress as _lr
        sub_ef = df[["evt_mean", "followUpCodeTotal", "group"]].dropna()
        if len(sub_ef) > 5:
            fig, ax = plt.subplots(figsize=(6, 5))
            for grp, color in COLORS.items():
                g = sub_ef[sub_ef["group"] == grp]
                ax.scatter(g["evt_mean"], g["followUpCodeTotal"], color=color,
                           label=grp.capitalize(), s=60, edgecolors="white",
                           linewidth=0.6, zorder=5, alpha=0.9)
            slope, intercept, r, p, _ = _lr(sub_ef["evt_mean"], sub_ef["followUpCodeTotal"])
            x_range = np.linspace(sub_ef["evt_mean"].min(), sub_ef["evt_mean"].max(), 100)
            ax.plot(x_range, slope * x_range + intercept, color="#f97316",
                    linewidth=2, linestyle="--", zorder=4, label="Regression")
            ax.text(0.97, 0.05, f"r = {r:.2f},  p = {p:.3f}",
                    transform=ax.transAxes, ha="right", va="bottom",
                    fontsize=10, color="#f97316",
                    bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.7, edgecolor="#f97316"))
            ax.set_xlabel("EVT score (motivation)")
            ax.set_ylabel("Follow-up fritekst score (0–8)")
            ax.set_title(f"EVT → Follow-up fritekst score (N={len(sub_ef)})")
            ax.legend(fontsize=9)
            plt.tight_layout()
            plt.savefig("plots/16_evt_futot.png", dpi=150, bbox_inches="tight")
            plt.close()
            print(f"  Gemt → plots/16_evt_futot.png  (N={len(sub_ef)}, r={r:.2f}, p={p:.3f})")

    # ── Plot 17: Raincloud — codeTotal og followUpCodeTotal per gruppe ────────────
    from scipy.stats import gaussian_kde as _kde, sem as _sem
    rain_vars = []
    if "codeTotal" in df.columns:
        rain_vars.append(("codeTotal", "Fritekst score (0–8)", "Umiddelbar"))
    if "followUpCodeTotal" in df.columns:
        rain_vars.append(("followUpCodeTotal", "Follow-up score (0–8)", "Follow-up"))
    if rain_vars:
        fig, axes = plt.subplots(1, len(rain_vars), figsize=(6 * len(rain_vars), 6))
        if len(rain_vars) == 1:
            axes = [axes]
        for ax, (col, ylabel, title_prefix) in zip(axes, rain_vars):
            sub_r = df[["group", col]].dropna()
            if len(sub_r) < 4:
                continue
            rng = np.random.default_rng(42)
            y_range = np.linspace(sub_r[col].min() - 0.3, sub_r[col].max() + 0.3, 300)
            for yi, (grp, color) in enumerate(COLORS.items()):
                vals = sub_r[sub_r["group"] == grp][col].values
                if len(vals) < 2:
                    continue
                # Half violin (right side)
                kde = _kde(vals, bw_method="scott")
                kde_v = kde(y_range)
                kde_v = kde_v / kde_v.max() * 0.35
                ax.fill_betweenx(y_range, yi + 0.05, yi + 0.05 + kde_v, alpha=0.35, color=color)
                ax.plot(yi + 0.05 + kde_v, y_range, color=color, linewidth=1.2)
                # Jittered dots (left side)
                jitter = rng.uniform(-0.20, -0.02, size=len(vals))
                ax.scatter(yi + jitter, vals, color=color, alpha=0.65,
                           s=45, edgecolors="white", linewidth=0.5, zorder=4)
                # IQR box + median
                q25, median, q75 = np.percentile(vals, [25, 50, 75])
                ax.plot([yi, yi], [q25, q75], color="black", linewidth=4, zorder=5, solid_capstyle="round")
                ax.scatter([yi], [median], color="white", s=45, zorder=6, edgecolors="black", linewidth=1.5)
                # Mean ± SE (diamond, left)
                m, se = vals.mean(), _sem(vals)
                ax.errorbar(yi - 0.28, m, yerr=se, fmt="D", color=color,
                            markersize=7, capsize=4, linewidth=1.5, zorder=5,
                            markeredgecolor="white", markeredgewidth=0.8)
            n_c = sub_r[sub_r["group"] == "control"][col].count()
            n_i = sub_r[sub_r["group"] == "intervention"][col].count()
            ax.set_xticks([0, 1])
            ax.set_xticklabels([f"Control\n(n={n_c})", f"Intervention\n(n={n_i})"])
            ax.set_ylabel(ylabel)
            ax.set_ylim(sub_r[col].min() - 0.8, sub_r[col].max() + 0.8)
            ax.set_title(f"Raincloud: {title_prefix}\n(◆=mean±SE  |  box=IQR+median)")
            sns.despine(ax=ax)
        plt.suptitle("Raincloud plots — fritekst scores per gruppe", y=1.02)
        plt.tight_layout()
        plt.savefig("plots/17_raincloud.png", dpi=150, bbox_inches="tight")
        plt.close()
        print("  Gemt → plots/17_raincloud.png")

    # ── Plot 18: Korrelationsheatmap ──────────────────────────────────────────────
    heatmap_col_map = {
        "codeTotal":           "FTtot",
        "followUpCodeTotal":   "FUtot",
        "retention_change":    "RetΔ",
        "perceivedLearning1":  "pLearn",
        "easeOfConversating1": "Ease",
        "adaptingToNeeds1":    "Adapt",
        "mentalEffort":        "MEffort",
        "evt_mean":            "EVT",
        "chat_duration_min":   "ChatMin",
        "freeTextWordCount":   "FTchars",
        "confidence":          "Conf",
    }
    hm_cols = [c for c in heatmap_col_map if c in df.columns]
    hm_df = None
    corr_hm = None
    if len(hm_cols) >= 4:
        hm_df = df[hm_cols].rename(columns=heatmap_col_map)
        corr_hm = hm_df.corr(method="pearson")
        n_hm = len(hm_df.dropna())
        mask = np.triu(np.ones_like(corr_hm, dtype=bool))
        fig, ax = plt.subplots(figsize=(10, 8))
        sns.heatmap(corr_hm, mask=mask, annot=True, fmt=".2f", center=0,
                    cmap="RdBu_r", vmin=-1, vmax=1, linewidths=0.5,
                    square=True, ax=ax, annot_kws={"size": 9})
        ax.set_title(f"Korrelationsheatmap (Pearson r, N≈{n_hm} pairwise)", fontsize=13)
        plt.tight_layout()
        plt.savefig("plots/18_heatmap.png", dpi=150, bbox_inches="tight")
        plt.close()
        print(f"  Gemt → plots/18_heatmap.png  ({len(hm_cols)} variable)")

    # ── Plot 19: Network graph — |r| ≥ 0.3 ───────────────────────────────────────
    try:
        import networkx as nx
        if corr_hm is not None and hm_df is not None:
            threshold = 0.3
            G = nx.Graph()
            short_names_net = list(hm_df.columns)
            G.add_nodes_from(short_names_net)
            for i, c1 in enumerate(short_names_net):
                for j, c2 in enumerate(short_names_net):
                    if j <= i:
                        continue
                    r = corr_hm.loc[c1, c2]
                    if abs(r) >= threshold:
                        G.add_edge(c1, c2, weight=float(r))
            if G.number_of_edges() > 0:
                fig, ax = plt.subplots(figsize=(9, 7))
                pos = nx.spring_layout(G, seed=42, k=2.2)
                pos_edges = [(u, v) for u, v, d in G.edges(data=True) if d["weight"] > 0]
                neg_edges = [(u, v) for u, v, d in G.edges(data=True) if d["weight"] < 0]
                pw = [abs(d["weight"]) * 5 for u, v, d in G.edges(data=True) if d["weight"] > 0]
                nw = [abs(d["weight"]) * 5 for u, v, d in G.edges(data=True) if d["weight"] < 0]
                nx.draw_networkx_nodes(G, pos, node_size=900, node_color="#e2e8f0",
                                       ax=ax, edgecolors="#94a3b8", linewidths=1.5)
                nx.draw_networkx_labels(G, pos, font_size=9, font_weight="bold", ax=ax)
                if pos_edges:
                    nx.draw_networkx_edges(G, pos, edgelist=pos_edges, width=pw,
                                           edge_color="#3B82F6", alpha=0.65, ax=ax)
                if neg_edges:
                    nx.draw_networkx_edges(G, pos, edgelist=neg_edges, width=nw,
                                           edge_color="#EF4444", alpha=0.65, ax=ax, style="dashed")
                edge_labels = {(u, v): f"{d['weight']:.2f}" for u, v, d in G.edges(data=True)}
                nx.draw_networkx_edge_labels(G, pos, edge_labels, font_size=7, ax=ax)
                ax.set_title(f"Korrelationsnetværk (|r| ≥ {threshold})\n"
                             f"Blå = positiv, Rød stiplet = negativ  |  {G.number_of_edges()} kanter", fontsize=12)
                ax.axis("off")
                plt.tight_layout()
                plt.savefig("plots/19_network.png", dpi=150, bbox_inches="tight")
                plt.close()
                print(f"  Gemt → plots/19_network.png  ({G.number_of_edges()} kanter, |r|≥{threshold})")
            else:
                print(f"  Plot 19: ingen korrelationer over |r| = {threshold}")
    except ImportError:
        print("  Plot 19 (network): networkx ikke installeret — springer over")

    # ── Plot 20: Slope plot — immediate → follow-up per deltager ─────────────────
    if "followUpCodeTotal" in df.columns and "codeTotal" in df.columns:
        paired20 = df[df["followUpCodeTotal"].notna() & df["codeTotal"].notna()].copy()
        if len(paired20) >= 4:
            fig, ax = plt.subplots(figsize=(6, 6))
            for _, row in paired20.iterrows():
                color = COLORS.get(str(row["group"]), "#888")
                ax.plot([0, 1], [row["codeTotal"], row["followUpCodeTotal"]],
                        color=color, alpha=0.35, linewidth=1.2)
                ax.scatter([0, 1], [row["codeTotal"], row["followUpCodeTotal"]],
                           color=color, s=22, alpha=0.55, zorder=4)
            for grp, color in COLORS.items():
                sub_g = paired20[paired20["group"] == grp]
                if len(sub_g) == 0:
                    continue
                means = [sub_g["codeTotal"].mean(), sub_g["followUpCodeTotal"].mean()]
                ax.plot([0, 1], means, color=color, linewidth=3.5,
                        marker="o", markersize=9, zorder=5, label=f"{grp.capitalize()} (n={len(sub_g)})")
            ax.set_xticks([0, 1])
            ax.set_xticklabels(["Umiddelbar\nfritekst", "Follow-up\nfritekst"], fontsize=12)
            ax.set_ylabel("Score (0–8)", fontsize=11)
            ax.set_ylim(-0.3, 8.5)
            ax.set_yticks(range(9))
            ax.set_title(f"Slope plot: fritekst retention per deltager (N={len(paired20)})\n"
                         f"Tynde linjer = individer  |  Tykke = gruppemiddelværdi")
            ax.legend(fontsize=10)
            sns.despine(ax=ax)
            plt.tight_layout()
            plt.savefig("plots/20_slope.png", dpi=150, bbox_inches="tight")
            plt.close()
            print(f"  Gemt → plots/20_slope.png  (N={len(paired20)})")

    # ── Plot 21: ChatMin → FUtot  +  ChatMin → RetΔ ──────────────────────────────
    from scipy.stats import linregress as _lr2
    chat21_pairs = []
    if "chat_duration_min" in df.columns and "followUpCodeTotal" in df.columns:
        sub21a = df[["chat_duration_min", "followUpCodeTotal", "group"]].dropna()
        if len(sub21a) > 5:
            chat21_pairs.append((sub21a, "chat_duration_min", "followUpCodeTotal",
                                 "Chat varighed (min)", "Follow-up fritekst score (0–8)", "ChatMin → FUtot"))
    if "chat_duration_min" in df.columns and "retention_change" in df.columns:
        sub21b = df[["chat_duration_min", "retention_change", "group"]].dropna()
        if len(sub21b) > 5:
            chat21_pairs.append((sub21b, "chat_duration_min", "retention_change",
                                 "Chat varighed (min)", "Retention ændring (FUtot − FTtot)", "ChatMin → RetΔ"))
    if chat21_pairs:
        fig, axes = plt.subplots(1, len(chat21_pairs), figsize=(6 * len(chat21_pairs), 5))
        if len(chat21_pairs) == 1:
            axes = [axes]
        for ax, (sub, xcol, ycol, xlabel, ylabel, title) in zip(axes, chat21_pairs):
            for grp, color in COLORS.items():
                g = sub[sub["group"] == grp]
                ax.scatter(g[xcol], g[ycol], color=color, label=grp.capitalize(),
                           s=60, edgecolors="white", linewidth=0.6, zorder=5, alpha=0.9)
            slope, intercept, r, p, _ = _lr2(sub[xcol], sub[ycol])
            x_range = np.linspace(sub[xcol].min(), sub[xcol].max(), 100)
            ax.plot(x_range, slope * x_range + intercept, color="#f97316",
                    linewidth=2, linestyle="--", zorder=4, label="Regression")
            sig = "p < .05" if p < 0.05 else "n.s."
            ax.text(0.97, 0.05, f"r = {r:.2f},  p = {p:.3f}  ({sig})",
                    transform=ax.transAxes, ha="right", va="bottom", fontsize=10, color="#f97316",
                    bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.7, edgecolor="#f97316"))
            ax.set_xlabel(xlabel)
            ax.set_ylabel(ylabel)
            ax.set_title(title)
            ax.legend(fontsize=9)
            sns.despine(ax=ax)
        plt.tight_layout()
        plt.savefig("plots/21_chatmin_fu_scatter.png", dpi=150, bbox_inches="tight")
        plt.close()
        print(f"  Gemt → plots/21_chatmin_fu_scatter.png")

    # ── Plot 22: Forest plot — effektstørrelser ───────────────────────────────────
    results_path = "data/processed/results.csv"
    if os.path.exists(results_path):
        res_df = pd.read_csv(results_path)
        forest_rows = res_df[res_df["label"].notna()].copy().reset_index(drop=True)
        if len(forest_rows) >= 2:
            fig, ax = plt.subplots(figsize=(10, max(4, len(forest_rows) * 0.6 + 1.5)))
            y_pos = np.arange(len(forest_rows))
            for i, row in forest_rows.iterrows():
                p = row.get("p", np.nan)
                d = row.get("d", np.nan)
                diff = row.get("diff", np.nan)
                ci_low = row.get("ci_low", np.nan)
                ci_high = row.get("ci_high", np.nan)
                # Prefer Cohen's d, else b-coefficient
                effect = d if (not pd.isna(d) and d != 0 and not np.isinf(d)) else diff
                sig = not pd.isna(p) and p < 0.05
                color = "#3B82F6" if sig else "#6B7280"
                marker = "D" if sig else "o"
                if not pd.isna(effect):
                    ax.scatter([effect], [i], color=color, s=70, marker=marker, zorder=4)
                    if not pd.isna(ci_low) and not pd.isna(ci_high):
                        ax.plot([ci_low, ci_high], [i, i], color=color, linewidth=2, zorder=3)
                        ax.plot([ci_low, ci_low], [i - 0.15, i + 0.15], color=color, linewidth=1.5, zorder=3)
                        ax.plot([ci_high, ci_high], [i - 0.15, i + 0.15], color=color, linewidth=1.5, zorder=3)
                p_str = f"p={p:.3f}" if not pd.isna(p) else ""
                ax.text(ax.get_xlim()[1] if ax.get_xlim()[1] != 0 else 1,
                        i, f"  {p_str}", va="center", fontsize=8, color=color)
            ax.axvline(0, color="black", linewidth=1.2, linestyle="--", alpha=0.5, zorder=2)
            ax.set_yticks(y_pos)
            ax.set_yticklabels(forest_rows["label"].tolist(), fontsize=9)
            ax.set_xlabel("Effektstørrelse  (Cohen's d  |  b-koefficient for ANCOVA)", fontsize=10)
            ax.set_title("Forest plot — effektstørrelser for hovedanalyser\n(blå ◆ = p < .05  |  grå ● = n.s.  |  95% CI hvor tilgængeligt)", fontsize=12)
            ax.grid(axis="x", alpha=0.25)
            sns.despine(ax=ax)
            plt.tight_layout()
            plt.savefig("plots/22_forest.png", dpi=150, bbox_inches="tight")
            plt.close()
            print(f"  Gemt → plots/22_forest.png  ({len(forest_rows)} effekter)")

    # ── Plot 23: PCA af oplevelsesmål (eksplorativt) ──────────────────────────────
    try:
        from sklearn.decomposition import PCA
        from sklearn.preprocessing import StandardScaler
        pca_col_map = {
            "perceivedLearning1":  "pLearn",
            "easeOfConversating1": "Ease",
            "adaptingToNeeds1":    "Adapt",
            "mentalEffort":        "MEffort",
            "evt_mean":            "EVT",
            "confidence":          "Conf",
        }
        pca_avail = [c for c in pca_col_map if c in df.columns]
        if len(pca_avail) >= 3:
            pca_df = df[pca_avail + ["group"]].dropna()
            if len(pca_df) >= 10:
                X_scaled = StandardScaler().fit_transform(pca_df[pca_avail].values)
                pca = PCA(n_components=2)
                X_pca = pca.fit_transform(X_scaled)
                short_pca = [pca_col_map[c] for c in pca_avail]
                fig, axes = plt.subplots(1, 2, figsize=(13, 5))
                # Score plot
                ax = axes[0]
                for grp, color in COLORS.items():
                    mask_g = (pca_df["group"] == grp).values
                    ax.scatter(X_pca[mask_g, 0], X_pca[mask_g, 1],
                               color=color, label=grp.capitalize(), s=60,
                               edgecolors="white", linewidth=0.6, alpha=0.8)
                ax.set_xlabel(f"PC1 ({pca.explained_variance_ratio_[0]*100:.1f}%)")
                ax.set_ylabel(f"PC2 ({pca.explained_variance_ratio_[1]*100:.1f}%)")
                ax.set_title("PCA: oplevelsesmål (score plot)")
                ax.legend()
                sns.despine(ax=ax)
                # Loading plot (biplot)
                ax = axes[1]
                for j, name in enumerate(short_pca):
                    ax.annotate("", xy=(pca.components_[0, j], pca.components_[1, j]),
                                xytext=(0, 0),
                                arrowprops=dict(arrowstyle="->", color="#3B82F6", lw=2))
                    ax.text(pca.components_[0, j] * 1.15, pca.components_[1, j] * 1.15,
                            name, ha="center", va="center", fontsize=10, fontweight="bold")
                circle = plt.Circle((0, 0), 1, color="gray", fill=False, linestyle="--", alpha=0.4)
                ax.add_patch(circle)
                ax.axhline(0, color="gray", linewidth=0.6, alpha=0.4)
                ax.axvline(0, color="gray", linewidth=0.6, alpha=0.4)
                ax.set_xlim(-1.3, 1.3)
                ax.set_ylim(-1.3, 1.3)
                ax.set_xlabel(f"PC1 ({pca.explained_variance_ratio_[0]*100:.1f}%)")
                ax.set_ylabel(f"PC2 ({pca.explained_variance_ratio_[1]*100:.1f}%)")
                ax.set_title("Loadings (biplot)")
                sns.despine(ax=ax)
                var_tot = sum(pca.explained_variance_ratio_[:2]) * 100
                plt.suptitle(f"PCA: oplevelsesmål — {var_tot:.1f}% forklaret varians (N={len(pca_df)})",
                             y=1.02, fontsize=12)
                plt.tight_layout()
                plt.savefig("plots/23_pca.png", dpi=150, bbox_inches="tight")
                plt.close()
                print(f"  Gemt → plots/23_pca.png  (N={len(pca_df)}, var={var_tot:.1f}%)")
    except ImportError:
        print("  Plot 23 (PCA): sklearn ikke installeret — springer over")

    # ── Plot 24: Cognitive load — barplot + dotplot side om side ─────────────────
    if "mentalEffort" in df.columns:
        from scipy.stats import sem, t as t_dist
        me_data = df[["group", "mentalEffort"]].dropna()

        fig, ax_dot = plt.subplots(figsize=(6, 5.5))

        rng = np.random.default_rng(42)
        for xi, (grp, color) in enumerate(COLORS.items()):
            sub = me_data[me_data["group"] == grp]["mentalEffort"].values
            jitter = rng.uniform(-0.12, 0.12, size=len(sub))
            ax_dot.scatter(xi + jitter, sub, color=color, alpha=0.65,
                           edgecolors="white", linewidth=0.5, s=55, zorder=3)
            m  = sub.mean()
            se = sem(sub)
            ci = t_dist.ppf(0.975, df=len(sub) - 1) * se
            ax_dot.plot([xi - 0.22, xi + 0.22], [m, m], color=color, linewidth=2.5, zorder=4)
            ax_dot.plot([xi, xi], [m - ci, m + ci], color=color, linewidth=2, zorder=4)
            ax_dot.plot([xi - 0.08, xi + 0.08], [m - ci, m - ci], color=color, linewidth=1.5, zorder=4)
            ax_dot.plot([xi - 0.08, xi + 0.08], [m + ci, m + ci], color=color, linewidth=1.5, zorder=4)

        ax_dot.set_xticks([0, 1])
        ax_dot.set_xticklabels(["Kontrol", "Intervention"])
        ax_dot.set_ylabel("Cognitive load (Paas 1–9)")
        ax_dot.set_ylim(0.5, 9.5)
        ax_dot.set_yticks(range(1, 10))
        ax_dot.set_title("Cognitive load for hver betingelse", pad=10)
        sns.despine(ax=ax_dot)

        plt.tight_layout(pad=1.5)
        plt.savefig("plots/24_cognitive_load.png", dpi=150, bbox_inches="tight")
        plt.close()
        n_c = me_data[me_data["group"] == "control"].shape[0]
        n_i = me_data[me_data["group"] == "intervention"].shape[0]
        print(f"  Gemt → plots/24_cognitive_load.png  (N={len(me_data)}: ctrl={n_c}, intr={n_i})")

    # ── Plot 25: Frafald per trin (bilag) ────────────────────────────────────
    dropout_path = "data/clean/dropouts.csv"
    if os.path.exists(dropout_path):
        drop = pd.read_csv(dropout_path)

        # Rækkefølge følger eksperimentets flow
        step_order = ["consent", "education", "pretest", "read", "zpd",
                      "chat", "mentalEffort", "freeText"]
        step_labels = {
            "consent":     "Samtykke",
            "education":   "Demografi",
            "pretest":     "Pretest",
            "read":        "Læsning",
            "zpd":         "Self-efficacy\nog SEVT",
            "chat":        "Chat",
            "mentalEffort":"Oplevelse\nspørgeskema",
            "freeText":    "Fritekst",
        }

        counts = drop["dropoutStep"].value_counts()
        steps  = [s for s in step_order if s in counts.index]
        values = [counts[s] for s in steps]
        labels = [step_labels[s] for s in steps]

        fig, ax = plt.subplots(figsize=(7, 4.5))
        bars = ax.bar(labels, values, color="#6B7280", alpha=0.85, width=0.55)

        for bar, val in zip(bars, values):
            ax.text(bar.get_x() + bar.get_width() / 2,
                    bar.get_height() + 0.2,
                    str(val), ha="center", va="bottom",
                    fontsize=11, fontweight="bold", color="#1a1a1a")

        ax.set_ylabel("Antal frafaldne", fontsize=11)
        ax.set_xlabel("Eksperimenttrin", fontsize=11)
        ax.set_title(f"Frafald per trin (N = {len(drop)} i alt)", fontsize=12, pad=10)
        ax.set_ylim(0, max(values) + 2.5)
        ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
        sns.despine(ax=ax)
        plt.tight_layout(pad=1.5)
        plt.savefig("plots/25_frafald_per_trin.png", dpi=150, bbox_inches="tight")
        plt.close()
        print(f"  Gemt → plots/25_frafald_per_trin.png  (N={len(drop)} frafaldne)")

    print(f"  Gemt → plots/")

if __name__ == "__main__":
    run()
