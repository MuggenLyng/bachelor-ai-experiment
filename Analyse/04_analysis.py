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
import pingouin as pg
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
    res = stats.ttest_ind(intr, ctrl, equal_var=False)
    t, p, df_welch = res.statistic, res.pvalue, res.df
    d = cohens_d(intr, ctrl)
    direction = "intervention > control" if intr.mean() > ctrl.mean() else "control > intervention"
    ci_ctrl = ci95(ctrl)
    ci_intr = ci95(intr)
    se_diff = np.sqrt(ctrl.std()**2/len(ctrl) + intr.std()**2/len(intr))
    h = se_diff * stats.t.ppf(0.975, df=df_welch)
    diff = intr.mean() - ctrl.mean()
    print(f"\n  {label}")
    print(f"    control:      M={ctrl.mean():.3f}, SD={ctrl.std():.3f}, N={len(ctrl)}, 95% CI=[{ci_ctrl[0]:.3f}, {ci_ctrl[1]:.3f}]")
    print(f"    intervention: M={intr.mean():.3f}, SD={intr.std():.3f}, N={len(intr)}, 95% CI=[{ci_intr[0]:.3f}, {ci_intr[1]:.3f}]")
    print(f"    diff={diff:.3f}, 95% CI=[{diff-h:.3f}, {diff+h:.3f}]")
    print(f"    t({df_welch:.2f}) = {t:.3f}, p = {p:.3f}, d = {d:.3f}  [{direction}]")
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


def _emm(model, data, group_col, cont_cols, cat_cols):
    """Estimated marginal means: hold continuous covariates at their means,
    average over categorical levels weighted by sample frequencies."""
    cont_means = {c: data[c].mean() for c in cont_cols if c in data.columns}
    emms = {}
    for grp in ["control", "intervention"]:
        if cat_cols:
            cat_data = data[cat_cols].dropna()
            combos = cat_data.drop_duplicates()
            weighted_sum, total_w = 0.0, 0
            for _, combo in combos.iterrows():
                w = (cat_data == combo).all(axis=1).sum()
                row = {group_col: grp, **cont_means, **combo.to_dict()}
                weighted_sum += model.predict(pd.DataFrame([row]))[0] * w
                total_w += w
            emms[grp] = weighted_sum / total_w
        else:
            emms[grp] = model.predict(pd.DataFrame([{group_col: grp, **cont_means}]))[0]
    return emms


def _print_emm(model, data, group_col, cont_cols, cat_cols):
    emms = _emm(model, data, group_col, cont_cols, cat_cols)
    ci = model.conf_int().loc["C(group)[T.intervention]"]
    diff = emms["intervention"] - emms["control"]
    print(f"  Adjusted means:  kontrol = {emms['control']:.3f},  intervention = {emms['intervention']:.3f}")
    print(f"  Adjusted diff (int − ctrl) = {diff:.3f},  95% CI [{ci[0]:.3f}, {ci[1]:.3f}]")


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

    edu_clean = df[["edu_group", "group"]].dropna()
    edu_ct = pd.crosstab(edu_clean["edu_group"], edu_clean["group"])
    chi2_edu, p_edu, df_edu, expected_edu = stats.chi2_contingency(edu_ct, correction=False)
    print(f"\n  Uddannelse (chi-square balancetjek):")
    print(f"  Krydstabel (observerede frekvenser):")
    print(edu_ct.to_string())
    print(f"\n  Forventede frekvenser:")
    exp_df = pd.DataFrame(expected_edu, index=edu_ct.index, columns=edu_ct.columns)
    print(exp_df.round(2).to_string())
    print(f"\n  χ²({df_edu}) = {chi2_edu:.3f}, p = {p_edu:.3f}")
    if p_edu >= 0.05:
        print(f"  => Ingen signifikant forskel i uddannelsesfordeling mellem grupper (p = {p_edu:.3f}) — grupperne er sammenlignelige på uddannelse.")
    else:
        print(f"  => Signifikant forskel i uddannelsesfordeling mellem grupper (p = {p_edu:.3f}) — mulig confound.")

    r = ttest_report("Pretest balance", "pretestScore", df)
    results.append({**r, "test": "balance"})

    r = ttest_report("Posttest balance", "posttestScore", df)
    results.append({**r, "test": "posttest_balance"})

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

    import statsmodels.stats.anova as anova_pkg_h1a
    aov_h1a = anova_pkg_h1a.anova_lm(model, typ=2)
    ss_g_h1a = aov_h1a.loc["C(group)", "sum_sq"] if "C(group)" in aov_h1a.index else None
    ss_tot_h1a = model.ess + model.ssr
    eta2_h1a = ss_g_h1a / ss_tot_h1a if ss_g_h1a is not None else None
    eta2_str_h1a = f", η²={eta2_h1a:.3f}" if eta2_h1a is not None else ""

    if coef is not None:
        print(f"\n  => Group effect: b={coef:.3f}, p={pval:.3f}{eta2_str_h1a}, N={len(df_anc)}")
        print(f"  Kovariater: pretest, alder, køn, uddannelse")
        _print_emm(model, df_anc, "group", ["pretestScore", "age", "gender_num"], ["edu_group"])
        print(f"\n  Type II ANOVA tabel:")
        print(aov_h1a.round(3))

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
    # EVT — Cronbach's alpha (intern konsistens)
    # =========================================================
    evt_items = ["evt1", "evt2", "evt3"]
    if all(c in df.columns for c in evt_items):
        evt_data = df[evt_items].dropna()
        k = len(evt_items)
        item_vars = evt_data.var(axis=0, ddof=1)
        total_var = evt_data.sum(axis=1).var(ddof=1)
        alpha_evt = (k / (k - 1)) * (1 - item_vars.sum() / total_var)
        print(f"\n--- EVT reliabilitet ---")
        print(f"  Cronbach's α = {alpha_evt:.3f}  (N={len(evt_data)}, k={k} items)")
        if alpha_evt >= 0.7:
            print(f"  => Acceptabel intern konsistens (α ≥ .70)")
        else:
            print(f"  => Lav intern konsistens (α < .70)")

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
        "followUpCodeTotal", "retention_change",
        "followUpCodeA1", "followUpCodeA2", "followUpCodeA3", "followUpCodeB1",
        "perceivedLearning1", "easeOfConversating1", "adaptingToNeeds1",
        "mentalEffort", "evt_mean", "chat_duration_min",
        "freeTextWordCount", "confidence",
    ]
    desc_cols = [c for c in desc_cols if c in df.columns]
    labels = {
        "age": "Alder", "pretestScore": "Pretest", "posttestScore": "Posttest",
        "learning_gain": "Learning gain", "codeTotal": "Fritekst total (0–8)",
        "followUpCodeTotal": "Follow-up total (0–8)", "retention_change": "Retention change",
        "followUpCodeA1": "FU A1", "followUpCodeA2": "FU A2",
        "followUpCodeA3": "FU A3", "followUpCodeB1": "FU B1",
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
    # KORRELATIONSMATRIX — sekundære variable + codeTotal + follow-up
    # =========================================================
    def print_corr(corr_df, short_names):
        """Print korrelationsmatrix med korte kolonnenavne og 2 decimaler."""
        renamed = corr_df.rename(index=short_names, columns=short_names)
        col_w = max(max(len(n) for n in renamed.columns), 7) + 1
        row_w = max(len(n) for n in renamed.index) + 1
        header = f"  {'':>{row_w}}" + "".join(f"{c:>{col_w}}" for c in renamed.columns)
        print(header)
        print(f"  {'-' * len(header)}")
        for row in renamed.index:
            vals = "".join(
                f"{'—':>{col_w}}" if row == col else f"{renamed.loc[row, col]:>{col_w}.2f}"
                for col in renamed.columns
            )
            print(f"  {row:>{row_w}}{vals}")

    SHORT = {
        "learning_gain": "MCQgain", "codeTotal": "FTtot", "followUpCodeTotal": "FUtot",
        "retention_change": "RetΔ", "perceivedLearning1": "pLearn",
        "easeOfConversating1": "Ease", "adaptingToNeeds1": "Adapt",
        "mentalEffort": "MEffort", "evt_mean": "EVT",
        "chat_duration_min": "ChatMin", "chatMessageCount": "ChatN",
        "freeTextWordCount": "FTchars", "confidence": "Conf",
    }

    print("\n--- KORRELATIONSMATRIX (alle deltagere, N≈70) ---")
    corr_cols = [
        "learning_gain", "codeTotal",
        "perceivedLearning1", "easeOfConversating1",
        "adaptingToNeeds1", "mentalEffort", "evt_mean",
        "chat_duration_min", "chatMessageCount", "freeTextWordCount", "confidence",
    ]
    corr_cols = [c for c in corr_cols if c in df.columns]
    corr = df[corr_cols].corr().round(3)
    print_corr(corr, SHORT)
    corr.to_csv("data/processed/correlations.csv")

    # Separat follow-up korrelationsmatrix (kun paired deltagere)
    if "followUpCodeTotal" in df.columns:
        paired_corr = df[df["followUpCodeTotal"].notna() & df["codeTotal"].notna()].copy()
        fu_corr_cols = [
            "codeTotal", "followUpCodeTotal", "retention_change",
            "mentalEffort", "evt_mean", "chat_duration_min", "freeTextWordCount",
        ]
        fu_corr_cols = [c for c in fu_corr_cols if c in paired_corr.columns]
        fu_corr = paired_corr[fu_corr_cols].corr().round(3)
        print(f"\n--- KORRELATIONSMATRIX (follow-up paired, N={len(paired_corr)}) ---")
        print(f"  NB: RetΔ = FUtot − FTtot (matematisk forbundet)")
        print_corr(fu_corr, SHORT)
        fu_corr.to_csv("data/processed/correlations_followup.csv")

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

            # η² (eta-squared) for gruppeeffekten
            import statsmodels.stats.anova as anova_pkg
            aov_ft = anova_pkg.anova_lm(model_ft, typ=2)
            ss_group = aov_ft.loc["C(group)", "sum_sq"] if "C(group)" in aov_ft.index else None
            ss_total = model_ft.ess + model_ft.ssr
            eta2 = ss_group / ss_total if ss_group is not None else None

            if coef_ft is not None:
                eta2_str = f", η²={eta2:.3f}" if eta2 is not None else ""
                print(f"\n  => Group effect: b={coef_ft:.3f}, p={pval_ft:.3f}{eta2_str}, N={len(df_anc_ft)}")
                print(f"  Kovariater kontrolleret for: pretest, alder, køn, uddannelse")
                _print_emm(model_ft, df_anc_ft, "group", ["pretestScore", "age", "gender_num"], ["edu_group"])
                print(f"\n  Type II ANOVA tabel:")
                print(aov_ft.round(3))
        else:
            print(f"  (for få observationer: N={len(df_anc_ft)})")

    else:
        print("  (ingen kodningsdata i processed.csv — kør pipeline igen efter db push)")

    # =========================================================
    # FOLLOW-UP RETENTION ANALYSE
    # =========================================================
    fu_cols_needed = ["codeTotal", "followUpCodeTotal", "retention_change", "group"]
    has_fu = all(c in df.columns for c in fu_cols_needed)
    if has_fu:
        paired = df[df["followUpCodeTotal"].notna() & df["codeTotal"].notna()].copy()
        n_paired = len(paired)
        print(f"\n--- FOLLOW-UP RETENTION (N={n_paired} med begge mål) ---")

        # Between-group t-test: followUpCodeTotal (alle med FU-score, ikke kun parrede)
        fu_all = df[df["followUpCodeTotal"].notna()].copy()
        fu_ctrl = fu_all[fu_all["group"] == "control"]["followUpCodeTotal"].dropna()
        fu_intr = fu_all[fu_all["group"] == "intervention"]["followUpCodeTotal"].dropna()
        print(f"\n--- Follow-up t-test (between-group, alle kodede) ---")
        print(f"  control:      M={fu_ctrl.mean():.3f}, SD={fu_ctrl.std():.3f}, N={len(fu_ctrl)}")
        print(f"  intervention: M={fu_intr.mean():.3f}, SD={fu_intr.std():.3f}, N={len(fu_intr)}")
        if len(fu_ctrl) >= 2 and len(fu_intr) >= 2:
            t_fu_bg, p_fu_bg = stats.ttest_ind(fu_intr, fu_ctrl, equal_var=False)
            ps_fu = ((fu_ctrl.std()**2 + fu_intr.std()**2) / 2) ** 0.5
            d_fu_bg = (fu_intr.mean() - fu_ctrl.mean()) / ps_fu if ps_fu > 0 else 0
            diff_fu = fu_intr.mean() - fu_ctrl.mean()
            se_fu = np.sqrt(fu_ctrl.std()**2/len(fu_ctrl) + fu_intr.std()**2/len(fu_intr))
            from scipy.stats import t as t_dist_fu
            df_w_fu = (fu_ctrl.std()**2/len(fu_ctrl) + fu_intr.std()**2/len(fu_intr))**2 / (
                      (fu_ctrl.std()**2/len(fu_ctrl))**2/(len(fu_ctrl)-1) +
                      (fu_intr.std()**2/len(fu_intr))**2/(len(fu_intr)-1))
            h_fu = se_fu * t_dist_fu.ppf(0.975, df=df_w_fu)
            sig_fu = "*" if p_fu_bg < 0.05 else "n.s."
            print(f"  diff={diff_fu:.3f}, 95% CI=[{diff_fu-h_fu:.3f}, {diff_fu+h_fu:.3f}], "
                  f"t({df_w_fu:.1f})={t_fu_bg:.3f}, p={p_fu_bg:.3f}, d={d_fu_bg:.3f}  [{sig_fu}]")
            results.append({"label": "Follow-up total (t-test)", "t": t_fu_bg, "p": p_fu_bg,
                            "d": d_fu_bg, "ctrl_M": fu_ctrl.mean(), "intr_M": fu_intr.mean(),
                            "diff": diff_fu, "ci_low": diff_fu-h_fu, "ci_high": diff_fu+h_fu,
                            "test": "fu_ttest"})

        # Deskriptiver
        for grp in ["control", "intervention"]:
            sub = paired[paired["group"] == grp]
            im = sub["codeTotal"]
            fu = sub["followUpCodeTotal"]
            ch = sub["retention_change"]
            print(f"\n  {grp} (n={len(sub)}):")
            print(f"    Immediate: M={im.mean():.2f}, SD={im.std():.2f}")
            print(f"    Follow-up: M={fu.mean():.2f}, SD={fu.std():.2f}")
            print(f"    Change:    M={ch.mean():.2f}, SD={ch.std():.2f}")

        # --- 1) Mixed ANOVA: score ~ time * group (within=time, between=group) ---
        print("\n  [1] Mixed ANOVA: score ~ time * group (within=time, between=group)")
        try:
            ids = list(range(len(paired)))
            rows_im = paired[["group", "codeTotal"]].copy()
            rows_im["score"] = rows_im["codeTotal"]
            rows_im["time"]  = "Første måling"
            rows_im["id"]    = ids
            rows_fu = paired[["group", "followUpCodeTotal"]].copy()
            rows_fu["score"] = rows_fu["followUpCodeTotal"]
            rows_fu["time"]  = "Follow-up"
            rows_fu["id"]    = ids
            long = pd.concat([rows_im[["id","group","time","score"]],
                              rows_fu[["id","group","time","score"]]], ignore_index=True)

            aov_mixed = pg.mixed_anova(
                data=long, dv="score", within="time", between="group", subject="id"
            )
            print(aov_mixed[["Source", "DF1", "DF2", "F", "p_unc", "np2"]].to_string(index=False))

            row_time  = aov_mixed[aov_mixed["Source"] == "time"].iloc[0]
            row_inter = aov_mixed[aov_mixed["Source"] == "Interaction"].iloc[0]
            row_group = aov_mixed[aov_mixed["Source"] == "group"].iloc[0]

            print(f"\n  Main effect of time:      F({int(row_time['DF1'])}, {int(row_time['DF2'])}) = {row_time['F']:.3f}, p = {row_time['p_unc']:.3f}, η² = {row_time['np2']:.3f}")
            print(f"  Main effect of group:     F({int(row_group['DF1'])}, {int(row_group['DF2'])}) = {row_group['F']:.3f}, p = {row_group['p_unc']:.3f}, η² = {row_group['np2']:.3f}")
            print(f"  Group × Time interaction: F({int(row_inter['DF1'])}, {int(row_inter['DF2'])}) = {row_inter['F']:.3f}, p = {row_inter['p_unc']:.3f}, η² = {row_inter['np2']:.3f}")

            results.append({"label": "FU: mixed ANOVA time effect", "t": float("nan"),
                            "p": row_time["p_unc"], "d": float("nan"), "ctrl_M": float("nan"),
                            "intr_M": float("nan"), "diff": float("nan"),
                            "ci_low": float("nan"), "ci_high": float("nan"), "test": "fu_mixed_time"})
            results.append({"label": "FU: mixed ANOVA group×time", "t": float("nan"),
                            "p": row_inter["p_unc"], "d": float("nan"), "ctrl_M": float("nan"),
                            "intr_M": float("nan"), "diff": float("nan"),
                            "ci_low": float("nan"), "ci_high": float("nan"), "test": "fu_mixed_interaction"})
        except Exception as e:
            print(f"  Mixed ANOVA fejlede: {e}")

        # --- 2) Retention change: t-test mellem grupper ---
        print("\n  [2] Retention change (followUp − immediate): t-test mellem grupper")
        r = ttest_report("retention_change (intr vs ctrl)", "retention_change", paired)
        results.append({**r, "test": "fu_retention_change"})

        # --- 3) Paired t-tests inden for hver gruppe ---
        print("\n  [3] Paired t-test: immediate vs follow-up inden for gruppe")
        for grp in ["control", "intervention"]:
            sub = paired[paired["group"] == grp].dropna(subset=["codeTotal", "followUpCodeTotal"])
            if len(sub) < 3:
                print(f"    {grp}: for få (N={len(sub)}), springer over")
                continue
            t_pair, p_pair = stats.ttest_rel(sub["followUpCodeTotal"], sub["codeTotal"])
            diff = sub["followUpCodeTotal"].mean() - sub["codeTotal"].mean()
            d_pair = diff / sub[["codeTotal","followUpCodeTotal"]].stack().std() if sub[["codeTotal","followUpCodeTotal"]].stack().std() > 0 else 0
            direction = "steg" if diff > 0 else "faldt"
            print(f"    {grp} (n={len(sub)}): Δ={diff:.3f} ({direction}), t={t_pair:.3f}, p={p_pair:.3f}")

        # =========================================================
        # FOLLOW-UP ANCOVA
        # =========================================================
        print("\n--- FOLLOW-UP ANCOVA ---")
        ancova_fu_cols = ["followUpCodeTotal", "pretestScore", "age", "gender_num", "edu_group"]
        df_fu_anc = paired.dropna(subset=ancova_fu_cols)
        if len(df_fu_anc) > 10:
            model_fu = smf.ols(
                "followUpCodeTotal ~ C(group) + pretestScore + age + gender_num + C(edu_group)",
                data=df_fu_anc
            ).fit()
            print(model_fu.summary().tables[1])
            coef_fu = model_fu.params.get("C(group)[T.intervention]", None)
            pval_fu = model_fu.pvalues.get("C(group)[T.intervention]", None)

            import statsmodels.stats.anova as anova_pkg
            aov_fu = anova_pkg.anova_lm(model_fu, typ=2)
            ss_g = aov_fu.loc["C(group)", "sum_sq"] if "C(group)" in aov_fu.index else None
            ss_tot = model_fu.ess + model_fu.ssr
            eta2_fu = ss_g / ss_tot if ss_g is not None else None
            eta2_str = f", η²={eta2_fu:.3f}" if eta2_fu is not None else ""
            if coef_fu is not None:
                print(f"\n  => Group effect: b={coef_fu:.3f}, p={pval_fu:.3f}{eta2_str}, N={len(df_fu_anc)}")
                print(f"  Kovariater: pretest, alder, køn, uddannelse")
                _print_emm(model_fu, df_fu_anc, "group", ["pretestScore", "age", "gender_num"], ["edu_group"])
                print(f"\n  Type II ANOVA tabel:")
                print(aov_fu.round(3))
            results.append({"label": "FU: ANCOVA group effect", "t": float("nan"),
                            "p": pval_fu, "d": float("nan"), "ctrl_M": float("nan"),
                            "intr_M": float("nan"), "diff": coef_fu,
                            "ci_low": float("nan"), "ci_high": float("nan"), "test": "fu_ancova"})
        else:
            print(f"  (for få med alle kovariater: N={len(df_fu_anc)})")

        # =========================================================
        # FOLLOW-UP COMPLETION BIAS
        # =========================================================
        print("\n--- FOLLOW-UP COMPLETION BIAS ---")
        df["fu_done"] = df["followUpCompleted"] == True
        bias_cols = [
            ("pretestScore", "Pretest"),
            ("codeTotal",    "Fritekst total"),
            ("mentalEffort", "Mental indsats"),
            ("chat_duration_min", "Chat varighed"),
            ("age",          "Alder"),
        ]
        done    = df[df["fu_done"] == True]
        not_done = df[df["fu_done"] == False]
        print(f"\n  Fuldførte follow-up: N={len(done)}  |  Ikke fuldførte: N={len(not_done)}")
        print(f"\n  {'Variabel':<22} {'FU done (M±SD)':<22} {'FU not done (M±SD)':<22} {'p'}")
        print(f"  {'-'*80}")
        for col, label in bias_cols:
            if col not in df.columns:
                continue
            a = done[col].dropna()
            b = not_done[col].dropna()
            if len(a) < 2 or len(b) < 2:
                continue
            _, p_b = stats.ttest_ind(a, b, equal_var=False)
            p_str = f"{p_b:.3f}" + (" *" if p_b < 0.05 else "")
            print(f"  {label:<22} {a.mean():.2f} ± {a.std():.2f}          {b.mean():.2f} ± {b.std():.2f}          {p_str}")

        # Gruppe-fordeling
        print(f"\n  Gruppe-fordeling:")
        print(pd.crosstab(df["group"], df["fu_done"], margins=True).to_string())
        chi2_fu, p_fu_chi, _, _ = stats.chi2_contingency(
            pd.crosstab(df["group"], df["fu_done"]), correction=False)
        print(f"  Chi²={chi2_fu:.3f}, p={p_fu_chi:.3f}")

        # Køn + uddannelse
        for cat_col, label in [("gender", "Køn"), ("edu_group", "Uddannelse")]:
            if cat_col in df.columns:
                ct = pd.crosstab(df[cat_col], df["fu_done"])
                if ct.shape[1] == 2 and ct.min().min() > 0:
                    chi2_c, p_c, _, _ = stats.chi2_contingency(ct, correction=False)
                    print(f"  {label}: chi²={chi2_c:.3f}, p={p_c:.3f}")

    else:
        print("\n--- FOLLOW-UP RETENTION ---")
        print("  (followUpCodeTotal ikke tilgængeligt — kør pipeline igen efter kodning)")

    # --- Gem resultater ---
    res_df = pd.DataFrame(results)
    res_df.to_csv("data/processed/results.csv", index=False)
    print(f"\n  Gemt → data/processed/results.csv, descriptives.csv, correlations.csv")
    return res_df


if __name__ == "__main__":
    run()
