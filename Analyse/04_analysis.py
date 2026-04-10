"""
04_analysis.py — Statistiske tests.

PRIMARY:
  H1: ANCOVA — posttestScore ~ group + pretestScore + age + gender + education
  H2: t-test  — learning_gain (intervention vs control)

SECONDARY:
  H3: t-test  — perceivedLearning1 (subjektiv læring)
  H4: t-test  — easeOfConversating1, adaptingToNeeds1 (UX)
  H5: t-test  — mentalEffort
  H6: regression — chatDuration → learning_gain
  H7: regression — freeTextWordCount → learning_gain

BALANCE:
  Gruppebalance: age (t-test), gender + edu (chi-square)
"""

import pandas as pd
import numpy as np
from scipy import stats
import statsmodels.formula.api as smf
import statsmodels.api as sm
import warnings
warnings.filterwarnings("ignore")

def cohens_d(a, b):
    pooled_std = np.sqrt((a.std()**2 + b.std()**2) / 2)
    return (a.mean() - b.mean()) / pooled_std if pooled_std > 0 else 0

def ci95(a):
    """95% CI for mean (Welch)."""
    n = len(a)
    if n < 2:
        return (np.nan, np.nan)
    se = stats.sem(a)
    h = se * stats.t.ppf(0.975, df=n - 1)
    return (a.mean() - h, a.mean() + h)

def ttest_report(label, col, df):
    ctrl = df[df["group"] == "control"][col].dropna()
    intr = df[df["group"] == "intervention"][col].dropna()
    t, p = stats.ttest_ind(intr, ctrl, equal_var=False)
    d = cohens_d(intr, ctrl)
    direction = "intervention > control" if intr.mean() > ctrl.mean() else "control > intervention"
    ci_ctrl = ci95(ctrl)
    ci_intr = ci95(intr)
    # 95% CI for the difference (Welch)
    se_diff = np.sqrt(ctrl.std()**2/len(ctrl) + intr.std()**2/len(intr))
    df_welch = (ctrl.std()**2/len(ctrl) + intr.std()**2/len(intr))**2 / (
        (ctrl.std()**2/len(ctrl))**2/(len(ctrl)-1) + (intr.std()**2/len(intr))**2/(len(intr)-1))
    h = se_diff * stats.t.ppf(0.975, df=df_welch)
    diff = intr.mean() - ctrl.mean()
    print(f"\n  {label}")
    print(f"    control:      M={ctrl.mean():.3f}, SD={ctrl.std():.3f}, N={len(ctrl)}, 95% CI=[{ci_ctrl[0]:.3f}, {ci_ctrl[1]:.3f}]")
    print(f"    intervention: M={intr.mean():.3f}, SD={intr.std():.3f}, N={len(intr)}, 95% CI=[{ci_intr[0]:.3f}, {ci_intr[1]:.3f}]")
    print(f"    diff={diff:.3f}, 95% CI=[{diff-h:.3f}, {diff+h:.3f}], t={t:.3f}, p={p:.3f}, d={d:.3f}  [{direction}]")
    return {"label": label, "t": t, "p": p, "d": d, "ctrl_M": ctrl.mean(), "intr_M": intr.mean(),
            "diff": diff, "ci_low": diff - h, "ci_high": diff + h}

def run():
    print("=== 04 ANALYSIS ===")
    df = pd.read_csv("data/processed/processed.csv")

    ctrl = df[df["group"] == "control"]
    intr = df[df["group"] == "intervention"]
    print(f"\n  N total={len(df)}  control={len(ctrl)}  intervention={len(intr)}")

    results = []

    # =========================================================
    # GRUPPEBALANCE
    # =========================================================
    print("\n--- GRUPPEBALANCE ---")

    # Alder
    t, p = stats.ttest_ind(ctrl["age"].dropna(), intr["age"].dropna(), equal_var=False)
    print(f"  Alder: control M={ctrl['age'].mean():.1f}, intervention M={intr['age'].mean():.1f}, t={t:.3f}, p={p:.3f}")

    # Køn
    gender_ct = pd.crosstab(df["gender"], df["group"])
    chi2, p_gender, _, _ = stats.chi2_contingency(gender_ct, correction=False)
    print(f"  Køn (chi²={chi2:.3f}, p={p_gender:.3f}):\n{gender_ct.to_string()}")

    # Uddannelse
    edu_ct = pd.crosstab(df["edu_group"], df["group"])
    chi2_edu, p_edu, _, _ = stats.chi2_contingency(edu_ct, correction=False)
    print(f"  Uddannelse (chi²={chi2_edu:.3f}, p={p_edu:.3f}):\n{edu_ct.to_string()}")

    # Pretest
    r = ttest_report("Pretest balance", "pretestScore", df)
    results.append({**r, "test": "balance"})

    # =========================================================
    # H1: ANCOVA — PRIMARY
    # =========================================================
    print("\n--- H1: ANCOVA (posttestScore) ---")
    df_ancova = df.dropna(subset=["posttestScore", "pretestScore", "age", "gender_num", "edu_group"])
    model = smf.ols(
        "posttestScore ~ C(group) + pretestScore + age + gender_num + C(edu_group)",
        data=df_ancova
    ).fit()
    print(model.summary().tables[1])
    group_coef = model.params.get("C(group)[T.intervention]", None)
    group_p    = model.pvalues.get("C(group)[T.intervention]", None)
    if group_coef is not None:
        print(f"\n  => Group effect: b={group_coef:.3f}, p={group_p:.3f}")

    # =========================================================
    # H2: Learning gain (t-test)
    # =========================================================
    print("\n--- H2: Learning gain ---")
    r = ttest_report("learning_gain", "learning_gain", df)
    results.append({**r, "test": "H2"})

    # =========================================================
    # SECONDARY
    # =========================================================
    print("\n--- SECONDARY OUTCOMES ---")
    for col, label in [
        ("perceivedLearning1",  "H3: Subjektiv læring"),
        ("easeOfConversating1", "H4a: Nem samtale"),
        ("adaptingToNeeds1",    "H4b: Tilpasning"),
        ("mentalEffort",        "H5: Mental indsats"),
        ("chat_duration_min",   "H7: Chat varighed"),
        ("freeTextWordCount",   "H8: Fritekst tegn"),
    ]:
        if col in df.columns:
            r = ttest_report(label, col, df)
            results.append({**r, "test": "secondary"})

    # =========================================================
    # H6 (KORREKT): EVT som prædiktor for learning_gain (på tværs af grupper)
    # =========================================================
    print("\n--- H6: EVT → learning_gain (korrelation på tværs af grupper) ---")
    sub_evt = df[["evt_mean", "learning_gain", "group"]].dropna()
    if len(sub_evt) > 5:
        slope, intercept, r_val, p_val, se = stats.linregress(sub_evt["evt_mean"], sub_evt["learning_gain"])
        print(f"  N={len(sub_evt)}, β={slope:.3f}, r={r_val:.3f}, r²={r_val**2:.3f}, p={p_val:.3f}")
        print(f"  => {'Signifikant' if p_val < 0.05 else 'Ikke signifikant'} korrelation mellem EVT og learning gain")

    # =========================================================
    # MEKANISMER — regression
    # =========================================================
    print("\n--- MEKANISMER (regression) ---")
    for predictor, label in [
        ("chat_duration_min", "Chat varighed → learning_gain"),
        ("freeTextWordCount", "Fritekst tegn → learning_gain"),
    ]:
        sub = df[[predictor, "learning_gain"]].dropna()
        if len(sub) > 5:
            slope, intercept, r, p, se = stats.linregress(sub[predictor], sub["learning_gain"])
            print(f"\n  {label}")
            print(f"    β={slope:.3f}, r={r:.3f}, p={p:.3f}, N={len(sub)}")

    # =========================================================
    # DESKRIPTIV TABEL PR. GRUPPE  (med p og Cohen's d)
    # =========================================================
    print("\n--- DESKRIPTIV TABEL PR. GRUPPE ---")
    desc_cols = [
        "age", "pretestScore", "posttestScore", "learning_gain",
        "perceivedLearning1", "easeOfConversating1", "adaptingToNeeds1",
        "mentalEffort", "evt_mean", "chat_duration_min",
        "freeTextWordCount", "confidence",
    ]
    desc_cols = [c for c in desc_cols if c in df.columns]
    labels = {
        "age": "Alder", "pretestScore": "Pretest", "posttestScore": "Posttest",
        "learning_gain": "Learning gain", "perceivedLearning1": "Subj. læring",
        "easeOfConversating1": "Nem samtale", "adaptingToNeeds1": "Tilpasning",
        "mentalEffort": "Mental indsats", "evt_mean": "EVT",
        "chat_duration_min": "Chat (min)", "freeTextWordCount": "Fritekst tegn",
        "confidence": "Confidence",
    }
    print(f"\n  {'Variabel':<20} {'Control (M±SD)':<22} {'Intervention (M±SD)':<22} {'N ctrl':<7} {'N intr':<7} {'p':<8} {'d'}")
    print(f"  {'-'*97}")
    for col in desc_cols:
        c = df[df["group"] == "control"][col].dropna()
        i = df[df["group"] == "intervention"][col].dropna()
        ctrl_str = f"{c.mean():.2f} ± {c.std():.2f}"
        intr_str = f"{i.mean():.2f} ± {i.std():.2f}"
        if len(c) >= 2 and len(i) >= 2:
            _, p_val = stats.ttest_ind(i, c, equal_var=False)
            d_val = cohens_d(i, c)
            p_str = f"{p_val:.3f}" + (" *" if p_val < 0.05 else "")
            d_str = f"{d_val:.2f}"
        else:
            p_str, d_str = "—", "—"
        print(f"  {labels.get(col, col):<20} {ctrl_str:<22} {intr_str:<22} {len(c):<7} {len(i):<7} {p_str:<8} {d_str}")
    desc = df.groupby("group")[desc_cols].agg(["mean", "std", "count"]).round(3)
    desc.to_csv("data/processed/descriptives.csv")

    # =========================================================
    # FRITEKST DESKRIPTIVER
    # =========================================================
    print("\n--- FRITEKST DESKRIPTIVER ---")
    ft_cols = [c for c in ["freeTextWordCount", "freeTextResponse"] if c in df.columns]
    if "freeTextWordCount" in df.columns:
        for grp in ["control", "intervention"]:
            sub = df[df["group"] == grp]["freeTextWordCount"].dropna()
            chars = df[df["group"] == grp]["freeTextResponse"].dropna().str.len()
            print(f"  {grp}: tegn M={chars.mean():.1f} SD={chars.std():.1f} | "
                  f"ord-felt M={sub.mean():.1f} SD={sub.std():.1f} N={len(sub)}")

    # =========================================================
    # KORRELATIONSMATRIX — sekundære variable
    # =========================================================
    print("\n--- KORRELATIONSMATRIX (sekundære variable) ---")
    corr_cols = [
        "learning_gain", "perceivedLearning1", "easeOfConversating1",
        "adaptingToNeeds1", "mentalEffort", "evt_mean",
        "chat_duration_min", "freeTextWordCount", "confidence",
    ]
    corr_cols = [c for c in corr_cols if c in df.columns]
    corr = df[corr_cols].corr().round(3)
    print(corr.to_string())
    corr.to_csv("data/processed/correlations.csv")

    # =========================================================
    # FRITEKST KODNING — manuel (codeA1/A2/A3/B1/codeTotal)
    # =========================================================
    print("\n--- FRITEKST KODNING (manuel, 0–2 pr. parameter) ---")
    code_cols = ["codeA1", "codeA2", "codeA3", "codeB1", "codeTotal"]
    has_coding = all(c in df.columns for c in code_cols)
    if has_coding:
        coded = df[df["codeTotal"].notna()].copy()
        print(f"  Kodede deltagere: N={len(coded)}  "
              f"(control={len(coded[coded['group']=='control'])}, "
              f"intervention={len(coded[coded['group']=='intervention'])})")

        print(f"\n  Deskriptiv per gruppe:")
        for grp in ["control", "intervention"]:
            sub = coded[coded["group"] == grp]
            print(f"    {grp}: total M={sub['codeTotal'].mean():.2f} SD={sub['codeTotal'].std():.2f} N={len(sub)}")
            for c in ["codeA1", "codeA2", "codeA3", "codeB1"]:
                print(f"      {c}: M={sub[c].mean():.2f}")

        print(f"\n  T-test total score:")
        r = ttest_report("Fritekst total (manuel)", "codeTotal", coded)
        results.append({**r, "test": "fritekst_total"})

        print(f"\n  T-test per parameter:")
        for c, label in [("codeA1","A1 energibalance"), ("codeA2","A2 kompensation"),
                         ("codeA3","A3 konsekvens"), ("codeB1","B1 løsning")]:
            r = ttest_report(label, c, coded)
            results.append({**r, "test": f"fritekst_{c}"})
    else:
        print("  (ingen kodningsdata i processed.csv — kør pipeline igen efter db push)")

    # --- Gem resultater ---
    res_df = pd.DataFrame(results)
    res_df.to_csv("data/processed/results.csv", index=False)
    print(f"\n  Gemt → data/processed/results.csv, descriptives.csv, correlations.csv")
    return res_df

if __name__ == "__main__":
    run()
