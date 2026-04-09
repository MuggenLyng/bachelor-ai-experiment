"""
fritekst_gpt.py — Analyse af ChatGPT's kodning + sammenligning med min kodning.
"""

import pandas as pd
import numpy as np
from scipy import stats
from io import StringIO

RAW = """ID,A1,A2,A3,A4,B1,B2,Total
47e8e70c-8048-411a-b9ee-569250879a17,0,1,1,1,1,0,4
b1e2ecfd-57e7-4909-a064-be9432186272,1,0,0,1,0,0,2
4f0101b1-c1e8-40f1-ac5b-17b4a067b71a,0,1,0,0,0,0,1
9dfb4037-63f6-4317-a85b-d00aee4bfe31,1,1,0,1,0,0,3
c3d88702-28e3-4076-976f-320086107639,0,1,1,0,0,0,2
f10630c4-7386-459c-b6af-bb6fecba9178,0,1,1,1,1,0,4
1aa78112-6b72-4c1d-974b-8639a78529b0,1,0,1,1,0,0,3
14c6375d-73c2-4164-81f9-e52df12ca18f,1,0,0,1,1,1,4
90024121-078e-4d48-8858-5fdc80d47355,0,1,0,1,1,1,4
b4e5ac23-6903-47bd-afa9-5e228f048970,0,1,0,1,1,1,4
0b9fe50b-9538-4a87-bf0a-894544b74994,0,1,1,1,0,0,3
97c2f522-dba8-4a7a-887e-c10c23be4e42,0,1,1,1,1,1,5
9c97035b-2dee-4dd9-b4c9-fb48a47d8f43,1,1,1,1,1,1,6
f9ad8823-5a44-49bd-a9f4-a9e8ac92c510,1,1,1,1,1,1,6
6a3f5f0b-640d-4755-b3e9-82310fb48c2f,1,0,0,1,1,1,4
13a9c2dc-5db0-45f4-9f85-f92af4a997a6,1,1,1,1,1,1,6
5c05000c-3168-4b27-9e5b-23bbf97fcba7,0,1,0,1,1,0,3
64d0b888-9194-48ad-8769-79f9391482c0,0,1,1,1,1,1,5
d05ca7fe-c222-4357-9425-c973c7e0f262,0,1,1,1,0,0,3
faf9ef5a-4f56-432e-8e0b-941e6a77c934,0,1,0,1,1,1,4
99ea2c3d-d249-4b3f-9ad6-32ba61ca5c51,1,1,0,1,1,1,5
f218b040-ee23-4538-825f-ce9cca2b186f,0,1,0,1,1,1,4
11c20b09-dba5-4dd9-b778-4ea060863531,1,1,1,1,1,1,6
4c279909-68f6-44d0-95b4-e36966918fff,0,1,0,1,1,0,3
05841b1c-e405-4ad4-b74f-c9f0ced6d735,1,0,0,1,1,1,4
e457e097-a7c3-4cd1-83e7-984dde7b1623,0,1,0,1,0,0,2
ba5f4289-e2af-4e7c-a02f-2f5aba673d7d,0,0,0,0,0,0,0"""

gpt = pd.read_csv(StringIO(RAW)).rename(columns={"ID": "participantId"})
gpt = gpt.drop(columns=["Total"])  # genberegner selv

param_cols = ["A1", "A2", "A3", "A4", "B1", "B2"]
gpt["total_gpt"] = gpt[param_cols].sum(axis=1)

# Gruppe-match
raw = pd.read_csv("data/raw/latest.csv")
grp = raw[["participantId", "group"]].drop_duplicates()
gpt = gpt.merge(grp, on="participantId", how="left")
print(f"Matchede {gpt['group'].notna().sum()} af {len(gpt)} med gruppe")

# ── Ekskludering (samme logik som fritekst_kode.py) ──────────────────────────
EXCLUDE = {
    "ba5f4289-e2af-4e7c-a02f-2f5aba673d7d",
    "e457e097-a7c3-4cd1-83e7-984dde7b1623",
    "1aa78112-6b72-4c1d-974b-8639a78529b0",
    "90024121-078e-4d48-8858-5fdc80d47355",
    "faf9ef5a-4f56-432e-8e0b-941e6a77c934",
    "0b9fe50b-9538-4a87-bf0a-894544b74994",
    "9dfb4037-63f6-4317-a85b-d00aee4bfe31",
}
gpt_test = gpt[~gpt["participantId"].isin(EXCLUDE)]

# ── Deskriptiv ────────────────────────────────────────────────────────────────
print("\n=== GPT DESKRIPTIV (alle N=27) ===")
print(f"  Total M={gpt['total_gpt'].mean():.2f} ± {gpt['total_gpt'].std():.2f}  (0–6)")
print(f"\n  Andel 1 per parameter:")
for c in param_cols:
    print(f"    {c}: {gpt[c].mean()*100:.0f}%")

# ── T-test (ekskluderet) ──────────────────────────────────────────────────────
ctrl = gpt_test[gpt_test["group"] == "control"]["total_gpt"].dropna()
intr = gpt_test[gpt_test["group"] == "intervention"]["total_gpt"].dropna()

print(f"\n=== GPT T-TEST (ekskl. utilstrækkelige, N={len(gpt_test)}) ===")
print(f"  control:      N={len(ctrl)}, M={ctrl.mean():.2f}, SD={ctrl.std():.2f}")
print(f"  intervention: N={len(intr)}, M={intr.mean():.2f}, SD={intr.std():.2f}")
t, p = stats.ttest_ind(intr, ctrl, equal_var=False)
pooled_sd = ((ctrl.std()**2 + intr.std()**2) / 2) ** 0.5
d = (intr.mean() - ctrl.mean()) / pooled_sd if pooled_sd > 0 else 0
diff = intr.mean() - ctrl.mean()
print(f"  diff={diff:+.2f}, t={t:.3f}, p={p:.3f}, d={d:.2f}  [{'intervention > control' if diff>0 else 'control > intervention'}]")
print(f"  {'SIGNIFIKANT *' if p < 0.05 else 'Ikke signifikant'} (α=.05)")

print(f"\n  Per parameter:")
for c in param_cols:
    ci = gpt_test[gpt_test["group"] == "control"][c].dropna()
    ii = gpt_test[gpt_test["group"] == "intervention"][c].dropna()
    if len(ci) >= 2 and len(ii) >= 2:
        _, pp = stats.ttest_ind(ii, ci, equal_var=False)
        print(f"    {c}: ctrl={ci.mean():.2f}  intr={ii.mean():.2f}  p={pp:.3f}{'  *' if pp < 0.05 else ''}")

# ── Inter-rater reliabilitet (min kodning vs GPT) ─────────────────────────────
my = pd.read_csv("data/processed/fritekst_coded.csv")[
    ["participantId", "A1_energibalance", "A2_kompensation", "A3_konsekvens_tee",
     "A4_kim_kobling", "B1_loesning_ei", "B2_loesning_model", "total"]
].rename(columns={
    "A1_energibalance": "A1_my", "A2_kompensation": "A2_my",
    "A3_konsekvens_tee": "A3_my", "A4_kim_kobling": "A4_my",
    "B1_loesning_ei": "B1_my", "B2_loesning_model": "B2_my",
    "total": "total_my"
})

merged = gpt.merge(my, on="participantId")

print(f"\n=== INTER-RATER RELIABILITET (N={len(merged)}) ===")
print(f"  Total score korrelation (Pearson r): ", end="")
r, p_r = stats.pearsonr(merged["total_my"], merged["total_gpt"])
print(f"r={r:.3f}, p={p_r:.3f}")

print(f"\n  Procentvis enighed per parameter:")
agree_total = 0
for my_col, gpt_col, label in [
    ("A1_my","A1","A1"), ("A2_my","A2","A2"), ("A3_my","A3","A3"),
    ("A4_my","A4","A4"), ("B1_my","B1","B1"), ("B2_my","B2","B2"),
]:
    agree = (merged[my_col] == merged[gpt_col]).mean() * 100
    agree_total += agree
    diff_rows = merged[merged[my_col] != merged[gpt_col]][["participantId", my_col, gpt_col]]
    n_diff = len(diff_rows)
    print(f"    {label}: {agree:.0f}% enighed  ({n_diff} uenigheder)")

print(f"\n  Gennemsnitlig enighed: {agree_total/6:.0f}%")
print(f"  Absolut forskel i total score: MAE={( merged['total_my'] - merged['total_gpt']).abs().mean():.2f}")
