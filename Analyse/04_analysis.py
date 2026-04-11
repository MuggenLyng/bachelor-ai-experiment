"""
04_analysis.py — Statistiske tests.

PRIMARY:
  H1a: ANCOVA — posttestScore ~ group + pretestScore + age + gender + education
  H1b: ANCOVA — codeTotal    ~ group + pretestScore + age + gender + education
  H2:  t-test  — learning_gain + codeTotal (intervention vs control)

SECONDARY:
  H3: t-test  — perceivedLearning1 (subjektiv læring)
  H4: t-test  — easeOfConversating1, adaptingToNeeds1 (UX)
  H5: t-test  — mentalEffort
  H6: regression — EVT → learning_gain + codeTotal
  Mekanismer: chat varighed, chat beskeder, læsetid, fritekst tegn
              → learning_gain + codeTotal

BALANCE:
  Gruppebalance: age (t-test), gender + edu (chi-square)
"""

import pandas as pd
import numpy as np
from scipy import stats
import statsmodels.formula.api as smf
import warnings
warnings.filterwarnings("ignore")


def cohens_d(a, b):
    pooled_std = np.sqrt((a.std()**2 + b.std()**2) / 2)
    return (a.mean() - b.mean()) / pooled_std if pooled_std > 0 else 0


def ci95(a):
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


def linreg_report(label, predictor, outcome, df):
    sub = df[[predictor, outcome]].dropna()
    if len(sub) < 6:
        print(f"\n  {label}: for få observationer (N={len(sub)})")
        return
    slope, intercept, r_val, p_val, se = stats.linregress(sub[predictor], sub[outcome])
    print(f"\n  {label}")
    print(f"    β={slope:.3f}, r={r_val:.3f}, r²={r_val**2:.3f}, p={p_val:.3f}, N={len(sub)}")
    print(f"    => {'Signifikant' if p_val < 0.05 else 'Ikke signifikant'}")


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

    t, p = stats.ttest_ind(ctrl["age"].dropna(), intr["age"].dropna(), equal_var=False)
    print(f"  Alder: control M={ctrl['age'].mean():.1f}, intervention M={intr['age'].mean():.1f}, t={t:.3f}, p={p:.3f}")

    gender_ct = pd.crosstab(df["gender"], df["group"])
    chi2, p_gender, _, _ = stats.chi2_contingency(gender_ct, correction=False)
    print(f"  Køn (chi²={chi2:.3f}, p={p_gender:.3f}):\n{gender_ct.to_string()}")

    edu_ct = pd.crosstab(df["edu_group"], df["group"])
    chi2_edu, p_edu, _, _ = stats.chi2_contingency(edu_ct, correction=False)
    print(f"  Uddannelse (chi²={chi2_edu:.3f}, p={p_edu:.3f}):\n{edu_ct.to_string()}")

    r = ttest_report("Pretest balance", "pretestScore", df)
    results.append({**r, "test": "balance"})

    # =========================================================
    # H1a: ANCOVA — posttestScore (MCQ)
    # =========================================================
    print("\n--- H1a: ANCOVA (posttestScore) ---")
    df_anc = df.dropna(subset=["posttestScore", "pretestScore", "age", "gender_num", "edu_group"])
    model = smf.ols(
        "posttestScore ~ C(group) + pretestScore + age + gender_num + C(edu_group)",
        data=df_anc
    ).fit()
    print(model.summary().tables[1])
    coef = model.params.get("C(group)[T.intervention]", None)
    pval = model.pvalues.get("C(group)[T.intervention]", None)
    if coef is not None:
        print(f"\n  => Group effect: b={coef:.3f}, p={pval:.3f}")

    # =========================================================
    # H2: Learning gain (t-test)
    # =========================================================
    print("\n--- H2: Learning gain (MCQ) ---")
    r = ttest_report("learning_gain", "learning_gain", df)
    results.append({**r, "test": "H2"})

    # =========================================================
    # SECONDARY OUTCOMES
    # =========================================================
    print("\n--- SECONDARY OUTCOMES ---")
    for col, label in [
        ("perceivedLearning1",  "H3: Subjektiv læring"),
        ("easeOfConversating1", "H4a: Nem samtale"),
        ("adaptingToNeeds1",    "H4b: Tilpasning"),
        ("mentalEffort",        "H5: Mental indsats"),
    ]:
        if col in df.columns:
            r = ttest_report(label, col, df)
            results.append({**r, "test": "secondary"})

    # =========================================================
    # H6: EVT → learning_gain + codeTotal
    # =========================================================
    print("\n--- H6: EVT som prædiktor ---")
    linreg_report("EVT → learning_gain", "evt_mean", "learning_gain", df)
    if "codeTotal" in df.columns:
        coded_evt = df[df["codeTotal"].notna()]
        linreg_report("EVT → codeTotal", "evt_mean", "codeTotal", coded_evt)

    # =========================================================
    # MEKANISMER — regression: learning_gain + codeTotal
    # =========================================================
    print("\n--- MEKANISMER (regression) ---")
    mechanism_predictors = [
        ("chat_duration_min",  "Chat varighed (min)"),
        ("chatMessageCount",   "Chat beskeder"),
        ("readingTime",        "Læsetid (ms)"),
        ("freeTextWordCount",  "Fritekst tegn"),
    ]
    for predictor, pred_label in mechanism_predictors:
        if predictor not in df.columns:
            continue
        linreg_report(f"{pred_label} → learning_gain", predictor, "learning_gain", df)
        if "codeTotal" in df.columns:
            coded_mek = df[df["codeTotal"].notna()]
            linreg_report(f"{pred_label} → codeTotal", predictor, "codeTotal", coded_mek)

    # =========================================================
    # DESKRIPTIV TABEL PR. GRUPPE
    # =========================================================
    print("\n--- DESKRIPTIV TABEL PR. GRUPPE ---")
    desc_cols = [
        "age", "pretestScore", "posttestScore", "learning_gain", "codeTotal",
        "perceivedLearning1", "easeOfConversating1", "adaptingToNeeds1",
        "mentalEffort", "evt_mean", "chat_duration_min",
        "freeTextWordCount", "confidence",
    ]
    desc_cols = [c for c in desc_cols if c in df.columns]
    labels = {
        "age": "Alder", "pretestScore": "Pretest", "posttestScore": "Posttest",
        "learning_gain": "Learning gain", "codeTotal": "Fritekst total (0–8)",
        "perceivedLearning1": "Subj. læring", "easeOfConversating1": "Nem samtale",
        "adaptingToNeeds1": "Tilpasning", "mentalEffort": "Mental indsats",
        "evt_mean": "EVT", "chat_duration_min": "Chat (min)",
        "freeTextWordCount": "Fritekst tegn", "confidence": "Confidence",
    }
    print(f"\n  {'Variabel':<24} {'Control (M±SD)':<22} {'Intervention (M±SD)':<22} {'N ctrl':<7} {'N intr':<7} {'p':<8} {'d'}")
    print(f"  {'-'*101}")
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
        print(f"  {labels.get(col, col):<24} {ctrl_str:<22} {intr_str:<22} {len(c):<7} {len(i):<7} {p_str:<8} {d_str}")
    desc = df.groupby("group")[desc_cols].agg(["mean", "std", "count"]).round(3)
    desc.to_csv("data/processed/descriptives.csv")

    # =========================================================
    # FRITEKST DESKRIPTIVER
    # =========================================================
    print("\n--- FRITEKST DESKRIPTIVER ---")
    if "freeTextWordCount" in df.columns:
        for grp in ["control", "intervention"]:
            sub = df[df["group"] == grp]["freeTextWordCount"].dropna()
            chars = df[df["group"] == grp]["freeTextResponse"].dropna().str.len() if "freeTextResponse" in df.columns else pd.Series(dtype=float)
            print(f"  {grp}: tegn M={chars.mean():.1f} SD={chars.std():.1f} | "
                  f"ord-felt M={sub.mean():.1f} SD={sub.std():.1f} N={len(sub)}")

    # =========================================================
    # KORRELATIONSMATRIX — sekundære variable + codeTotal
    # =========================================================
    print("\n--- KORRELATIONSMATRIX (sekundære variable) ---")
    corr_cols = [
        "learning_gain", "codeTotal", "perceivedLearning1", "easeOfConversating1",
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

        # H2 (fritekst): t-test codeTotal
        print(f"\n  H2 (fritekst): t-test codeTotal")
        r = ttest_report("Fritekst total (manuel)", "codeTotal", coded)
        results.append({**r, "test": "fritekst_total"})

        print(f"\n  T-test per parameter:")
        for c, label in [("codeA1","A1 energibalance"), ("codeA2","A2 kompensation"),
                         ("codeA3","A3 konsekvens"), ("codeB1","B1 løsning")]:
            r = ttest_report(label, c, coded)
            results.append({**r, "test": f"fritekst_{c}"})

        # H1b: ANCOVA — codeTotal
        print("\n--- H1b: ANCOVA (codeTotal) ---")
        df_anc_ft = coded.dropna(subset=["codeTotal", "pretestScore", "age", "gender_num", "edu_group"])
        if len(df_anc_ft) > 10:
            model_ft = smf.ols(
                "codeTotal ~ C(group) + pretestScore + age + gender_num + C(edu_group)",
                data=df_anc_ft
            ).fit()
            print(model_ft.summary().tables[1])
            coef_ft = model_ft.params.get("C(group)[T.intervention]", None)
            pval_ft = model_ft.pvalues.get("C(group)[T.intervention]", None)
            if coef_ft is not None:
                print(f"\n  => Group effect: b={coef_ft:.3f}, p={pval_ft:.3f}")
        else:
            print(f"  (for få observationer: N={len(df_anc_ft)})")

    else:
        print("  (ingen kodningsdata i processed.csv — kør pipeline igen efter db push)")

    # --- Gem resultater ---
    res_df = pd.DataFrame(results)
    res_df.to_csv("data/processed/results.csv", index=False)
    print(f"\n  Gemt → data/processed/results.csv, descriptives.csv, correlations.csv")
    return res_df


if __name__ == "__main__":
    run()
