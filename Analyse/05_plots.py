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

    # 2) Learning gain boxplot
    fig, ax = plt.subplots(figsize=(5, 5))
    sns.boxplot(data=df, x="group", y="learning_gain", palette=COLORS, ax=ax, width=0.5)
    sns.stripplot(data=df, x="group", y="learning_gain", ax=ax, color="white",
                  edgecolor="gray", linewidth=0.8, size=6, jitter=True)
    ax.axhline(0, linestyle="--", color="gray", linewidth=1)
    ax.set_xlabel("Gruppe")
    ax.set_ylabel("Learning gain (posttest − pretest)")
    ax.set_title("Learning gain per gruppe")
    plt.tight_layout()
    plt.savefig("plots/02_learning_gain.png", dpi=150)
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
        fig, ax = plt.subplots(figsize=(6, 5))
        for grp, color in COLORS.items():
            sub = df[df["group"] == grp].dropna(subset=["chat_duration_min", "learning_gain"])
            ax.scatter(sub["chat_duration_min"], sub["learning_gain"],
                       label=grp.capitalize(), color=color, alpha=0.7)
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

    # 7) EVT → learning_gain OG posttest side om side
    from scipy.stats import linregress
    evt_targets = [
        ("learning_gain", "Learning gain (posttest − pretest)"),
        ("posttestScore",  "Posttest score (0–4)"),
        ("pretestScore",   "Pretest score (0–4)"),
    ]
    sub_base = df[["evt_mean", "learning_gain", "posttestScore", "pretestScore", "group"]].dropna()
    if len(sub_base) > 5:
        fig, axes = plt.subplots(1, 3, figsize=(17, 5))
        for ax, (ycol, ylabel) in zip(axes, evt_targets):
            sub = sub_base[["evt_mean", ycol, "group"]].dropna()
            for grp, color in COLORS.items():
                g = sub[sub["group"] == grp]
                ax.scatter(g["evt_mean"], g[ycol], color=color,
                           label=grp.capitalize(), s=60, edgecolors="white",
                           linewidth=0.6, zorder=5, alpha=0.9)
            slope, intercept, r, p, _ = linregress(sub["evt_mean"], sub[ycol])
            x_range = np.linspace(sub["evt_mean"].min(), sub["evt_mean"].max(), 100)
            ax.plot(x_range, slope * x_range + intercept, color="white",
                    linewidth=2, linestyle="--", zorder=4,
                    label=f"Regression (r={r:.2f}, p={p:.3f})")
            ax.set_xlabel("EVT score (motivation)")
            ax.set_ylabel(ylabel)
            ax.set_title(f"EVT → {ylabel.split('(')[0].strip()}")
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
        fig, ax = plt.subplots(figsize=(6, 5))
        grp_order = ["control", "intervention"]
        grp_labels = ["Control\n(standard AI)", "Intervention\n(pæd.-psyk. AI)"]
        for xi, (grp, color) in enumerate(COLORS.items()):
            sub = coded[coded["group"] == grp]["codeTotal"].dropna().values
            # jitter x
            rng = np.random.default_rng(42)
            jitter = rng.uniform(-0.12, 0.12, size=len(sub))
            ax.scatter(xi + jitter, sub, color=color, alpha=0.7,
                       edgecolors="white", linewidth=0.6, s=60, zorder=3)
            # mean line
            m = sub.mean()
            se = sem(sub)
            ax.plot([xi - 0.22, xi + 0.22], [m, m], color=color,
                    linewidth=2.5, zorder=4)
            # SE bar
            ax.plot([xi, xi], [m - se, m + se], color=color,
                    linewidth=2, zorder=4)
            ax.plot([xi - 0.08, xi + 0.08], [m - se, m - se],
                    color=color, linewidth=1.5, zorder=4)
            ax.plot([xi - 0.08, xi + 0.08], [m + se, m + se],
                    color=color, linewidth=1.5, zorder=4)

        # stat annotation
        ctrl_s = coded[coded["group"] == "control"]["codeTotal"].dropna()
        intr_s = coded[coded["group"] == "intervention"]["codeTotal"].dropna()
        t_ft, p_ft = ttest_ind(intr_s, ctrl_s, equal_var=False)
        ps = ((ctrl_s.std()**2 + intr_s.std()**2) / 2) ** 0.5
        d_ft = (intr_s.mean() - ctrl_s.mean()) / ps if ps > 0 else 0
        sig_str = "p < .05 *" if p_ft < 0.05 else f"p = {p_ft:.3f}"
        ax.set_title(f"Fritekst total score per deltager\n"
                     f"Δ = {intr_s.mean()-ctrl_s.mean():+.2f}, d = {d_ft:.2f}, {sig_str}")
        ax.set_xticks([0, 1])
        ax.set_xticklabels(grp_labels)
        ax.set_ylabel("Total score (A1+A2+A3+B1, max 8)")
        ax.set_ylim(-0.3, 8.5)
        ax.set_yticks(range(9))
        plt.tight_layout()
        plt.savefig("plots/08_fritekst_dotplot.png", dpi=150)
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
    # 10) Total testtid — histogram + KDE per gruppe
    # =========================================================
    if "total_duration_min" in df.columns:
        from scipy import stats as scipy_stats

        dur = df["total_duration_min"].dropna()
        # Fjern ekstreme outliers (>120 min — sandsynligvis afbrudt og genoptaget)
        dur_clean = dur[dur <= 120]
        n_outliers = len(dur) - len(dur_clean)

        fig, ax = plt.subplots(figsize=(9, 5))

        for grp, color in COLORS.items():
            sub = df[(df["group"] == grp) & df["total_duration_min"].notna()]
            sub = sub[sub["total_duration_min"] <= 120]["total_duration_min"]
            ax.hist(sub, bins=15, alpha=0.35, color=color, label=f"{grp.capitalize()} (N={len(sub)})",
                    density=True)
            if len(sub) > 5:
                kde = scipy_stats.gaussian_kde(sub, bw_method="scott")
                xs = np.linspace(0, 120, 300)
                ax.plot(xs, kde(xs), color=color, linewidth=2)
                ax.axvline(sub.mean(), color=color, linestyle="--", linewidth=1.5,
                           label=f"  M={sub.mean():.1f} min")

        # Normalfordelingstest (Shapiro-Wilk på alle)
        if len(dur_clean) >= 3:
            stat_sw, p_sw = scipy_stats.shapiro(dur_clean)
            sw_txt = f"Shapiro-Wilk: W={stat_sw:.3f}, p={p_sw:.3f}"
            norm_txt = "≈ normalfordelt" if p_sw > 0.05 else "ikke normalfordelt (skæv)"
            ax.text(0.98, 0.97, f"{sw_txt}\n{norm_txt}",
                    transform=ax.transAxes, ha="right", va="top",
                    fontsize=9, color="#444",
                    bbox=dict(boxstyle="round,pad=0.3", fc="white", alpha=0.7))

        ax.set_xlabel("Total tid (minutter)")
        ax.set_ylabel("Tæthed")
        title = f"Samlet testtid per deltager  (createdAt → updatedAt)"
        if n_outliers:
            title += f"\n({n_outliers} outlier(s) >120 min ekskluderet fra plot)"
        ax.set_title(title)
        ax.legend()
        plt.tight_layout()
        plt.savefig("plots/10_total_duration.png", dpi=150, bbox_inches="tight")
        plt.close()
        print("  Gemt → plots/10_total_duration.png")

    print(f"  Gemt → plots/")

if __name__ == "__main__":
    run()
