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

    print(f"  Gemt → plots/")

if __name__ == "__main__":
    run()
