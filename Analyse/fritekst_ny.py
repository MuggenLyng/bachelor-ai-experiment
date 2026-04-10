"""
fritekst_ny.py — Analyse af opdaterede GPT-scoringer (0–2 skala, 5 parametre).
Inkluderer posttest + follow-up rækker. N er nu større med nye deltagere.
"""

import pandas as pd
import numpy as np
from scipy import stats
from io import StringIO

RAW = """ID,A1,A2,A3,B1,B2,Total
47e8e70c-8048-411a-b9ee-569250879a17,1,1,0,1,0,3
(followup) 47e8e70c-8048-411a-b9ee-569250879a17,1,2,2,1,1,7
b1e2ecfd-57e7-4909-a064-be9432186272,2,0,0,0,0,2
4f0101b1-c1e8-40f1-ac5b-17b4a067b71a,0,1,0,0,0,1
9dfb4037-63f6-4317-a85b-d00aee4bfe31,2,2,1,0,0,5
c3d88702-28e3-4076-976f-320086107639,1,2,2,0,0,5
(followup) c3d88702-28e3-4076-976f-320086107639,1,2,1,0,0,4
f10630c4-7386-459c-b6af-bb6fecba9178,0,2,2,2,1,7
(followup) f10630c4-7386-459c-b6af-bb6fecba9178,1,2,2,2,2,9
1aa78112-6b72-4c1d-974b-8639a78529b0,1,0,2,0,0,3
14c6375d-73c2-4164-81f9-e52df12ca18f,2,0,0,2,0,4
90024121-078e-4d48-8858-5fdc80d47355,0,2,1,1,0,4
(followup) 90024121-078e-4d48-8858-5fdc80d47355,1,2,1,2,2,8
b4e5ac23-6903-47bd-afa9-5e228f048970,0,2,1,2,1,6
0b9fe50b-9538-4a87-bf0a-894544b74994,0,0,0,0,0,0
97c2f522-dba8-4a7a-887e-c10c23be4e42,1,2,2,2,2,9
9c97035b-2dee-4dd9-b4c9-fb48a47d8f43,1,1,2,2,1,7
f9ad8823-5a44-49bd-a9f4-a9e8ac92c510,1,2,2,2,1,8
6a3f5f0b-640d-4755-b3e9-82310fb48c2f,2,0,1,2,1,6
13a9c2dc-5db0-45f4-9f85-f92af4a997a6,1,2,2,2,2,9
5c05000c-3168-4b27-9e5b-23bbf97fcba7,0,2,1,2,1,6
64d0b888-9194-48ad-8769-79f9391482c0,0,2,2,2,1,7
d05ca7fe-c222-4357-9425-c973c7e0f262,0,2,2,0,0,4
faf9ef5a-4f56-432e-8e0b-941e6a77c934,0,1,0,2,2,5
99ea2c3d-d249-4b3f-9ad6-32ba61ca5c51,2,2,1,2,2,9
f218b040-ee23-4538-825f-ce9cca2b186f,0,2,1,2,2,7
11c20b09-dba5-4dd9-b778-4ea060863531,2,2,2,2,2,10
4c279909-68f6-44d0-95b4-e36966918fff,0,1,0,2,0,3
05841b1c-e405-4ad4-b74f-c9f0ced6d735,2,0,0,2,2,6
e457e097-a7c3-4cd1-83e7-984dde7b1623,0,1,0,0,0,1
8ca34bf2-a828-467d-8a50-def9b20f612b,1,0,0,0,0,1
86b9be15-f95a-4c51-b752-321fe2ac965a,1,2,0,0,0,3
4e690746-6cd5-41a0-9bed-c33780cfab54,1,0,1,1,1,4
2c8ac762-3034-4132-91fc-fee030f30a92,2,0,0,2,1,5
a9ba4f8c-aa4f-4f71-8b1b-d910b6876c3b,2,2,1,0,0,5
caa46723-f353-4adc-b96b-4a3b485ef818,1,2,1,2,1,7
21d83799-273a-419f-85f0-019a86c931fa,0,2,1,0,0,3
acee0b9a-c465-4338-af83-cb910049fb9f,2,2,0,1,0,5
71e5a00b-3a93-4186-800e-aaecdcd20c42,2,1,1,0,0,4
6207019b-47da-4824-93db-796a9d06533c,0,0,2,0,0,2
456f868d-bd9b-4d40-bdb0-ec814bfc70a0,1,1,1,0,0,3
0faa2d4e-7340-4eca-942c-a57b50cb9ddf,2,0,0,2,1,5
d23591d9-bf7d-4c55-a3ed-f24988638671,2,2,1,2,1,8
15090299-b3ec-4d5d-8587-7c404d19279e,0,2,2,0,0,4
8debf8a1-34db-4eca-bfa7-1038133ee32a,0,2,1,2,1,6
a8a13449-c260-4690-9a31-389e43197ad8,0,2,1,2,1,6
fbe64aff-517b-4aa3-a286-6d5a4e75e2e8,0,0,0,1,0,1"""

# ── Parse: separer posttest og follow-up ──────────────────────────────────────
rows_post, rows_fu = [], []
for line in RAW.strip().splitlines()[1:]:  # spring header over
    if line.startswith("(followup)"):
        clean = line.replace("(followup) ", "")
        rows_fu.append(clean)
    else:
        rows_post.append(line)

header = "participantId,A1,A2,A3,B1,B2,Total"
post = pd.read_csv(StringIO(header + "\n" + "\n".join(rows_post)))
fu   = pd.read_csv(StringIO(header + "\n" + "\n".join(rows_fu)))

param_cols = ["A1", "A2", "A3", "B1", "B2"]
post["total"] = post[param_cols].sum(axis=1)
fu["total"]   = fu[param_cols].sum(axis=1)

# ── Gruppe-match ──────────────────────────────────────────────────────────────
raw = pd.read_csv("data/raw/latest.csv")
grp = raw[["participantId", "group"]].drop_duplicates()
post = post.merge(grp, on="participantId", how="left")
fu   = fu.merge(grp, on="participantId", how="left")

print(f"Posttest:  {len(post)} deltagere, {post['group'].notna().sum()} matchet med gruppe")
print(f"Follow-up: {len(fu)} deltagere, {fu['group'].notna().sum()} matchet med gruppe")

# ── Ekskludering ──────────────────────────────────────────────────────────────
# Utilstrækkelige svar: ekskluderet fra t-test (bevares i deskriptiv)
EXCLUDE = {
    "e457e097-a7c3-4cd1-83e7-984dde7b1623",  # for kort svar
    "1aa78112-6b72-4c1d-974b-8639a78529b0",  # for kort svar
    "0b9fe50b-9538-4a87-bf0a-894544b74994",  # 0/10, intet indhold
    "fbe64aff-517b-4aa3-a286-6d5a4e75e2e8",  # 1/10, minimal
    "8ca34bf2-a828-467d-8a50-def9b20f612b",  # 1/10, minimal
    "4f0101b1-c1e8-40f1-ac5b-17b4a067b71a",  # 1/10, minimal
}
post_test = post[~post["participantId"].isin(EXCLUDE)]
fu_test   = fu[~fu["participantId"].isin(EXCLUDE)]

# ── Deskriptiv (alle) ─────────────────────────────────────────────────────────
print(f"\n=== POSTTEST DESKRIPTIV (alle N={len(post)}) ===")
print(f"  Total M={post['total'].mean():.2f} ± {post['total'].std():.2f}  (0–10)")
print(f"  Median={post['total'].median():.1f}  Min={post['total'].min()}  Max={post['total'].max()}")
print(f"\n  Gennemsnit per parameter (0–2):")
for c in param_cols:
    print(f"    {c}: M={post[c].mean():.2f}  ({(post[c]==2).mean()*100:.0f}% fuld score)")

print(f"\n=== FOLLOW-UP DESKRIPTIV (N={len(fu)}) ===")
print(f"  Total M={fu['total'].mean():.2f} ± {fu['total'].std():.2f}  (0–10)")
for c in param_cols:
    print(f"    {c}: M={fu[c].mean():.2f}")

# ── T-test posttest: intervention vs control ──────────────────────────────────
ctrl = post_test[post_test["group"] == "control"]["total"].dropna()
intr = post_test[post_test["group"] == "intervention"]["total"].dropna()

print(f"\n=== POSTTEST T-TEST (ekskl. utilstrækkelige, N={len(post_test)}) ===")
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
    ci = post_test[post_test["group"] == "control"][c].dropna()
    ii = post_test[post_test["group"] == "intervention"][c].dropna()
    if len(ci) >= 2 and len(ii) >= 2:
        _, pp = stats.ttest_ind(ii, ci, equal_var=False)
        d_c = (ii.mean() - ci.mean()) / (((ci.std()**2 + ii.std()**2) / 2)**0.5) if ci.std() + ii.std() > 0 else 0
        print(f"    {c}: ctrl={ci.mean():.2f}  intr={ii.mean():.2f}  diff={ii.mean()-ci.mean():+.2f}  p={pp:.3f}  d={d_c:.2f}{'  *' if pp < 0.05 else ''}")

# ── Follow-up t-test ──────────────────────────────────────────────────────────
if len(fu_test) >= 4:
    ctrl_fu = fu_test[fu_test["group"] == "control"]["total"].dropna()
    intr_fu = fu_test[fu_test["group"] == "intervention"]["total"].dropna()
    print(f"\n=== FOLLOW-UP T-TEST (N={len(fu_test)}) ===")
    print(f"  control:      N={len(ctrl_fu)}, M={ctrl_fu.mean():.2f}, SD={ctrl_fu.std():.2f}")
    print(f"  intervention: N={len(intr_fu)}, M={intr_fu.mean():.2f}, SD={intr_fu.std():.2f}")
    if len(ctrl_fu) >= 2 and len(intr_fu) >= 2:
        t2, p2 = stats.ttest_ind(intr_fu, ctrl_fu, equal_var=False)
        ps2 = ((ctrl_fu.std()**2 + intr_fu.std()**2) / 2)**0.5
        d2 = (intr_fu.mean() - ctrl_fu.mean()) / ps2 if ps2 > 0 else 0
        diff2 = intr_fu.mean() - ctrl_fu.mean()
        print(f"  diff={diff2:+.2f}, t={t2:.3f}, p={p2:.3f}, d={d2:.2f}")
        print(f"  {'SIGNIFIKANT *' if p2 < 0.05 else 'Ikke signifikant'} (α=.05)")
    else:
        print("  (for få per gruppe til t-test)")

# ── Posttest → follow-up retention (parret, samme deltagere) ─────────────────
paired = post[["participantId", "total", "group"]].merge(
    fu[["participantId", "total"]].rename(columns={"total": "total_fu"}),
    on="participantId"
)
paired = paired[~paired["participantId"].isin(EXCLUDE)]

print(f"\n=== RETENTION: posttest → follow-up (N={len(paired)}, parret) ===")
for _, row in paired.iterrows():
    delta = row["total_fu"] - row["total"]
    print(f"  {row['participantId'][:8]}  [{row['group']:12s}]  post={row['total']:.0f}  fu={row['total_fu']:.0f}  Δ={delta:+.0f}")

if len(paired) >= 2:
    t_ret, p_ret = stats.ttest_rel(paired["total_fu"], paired["total"])
    mean_delta = (paired["total_fu"] - paired["total"]).mean()
    print(f"\n  Gennemsnitlig Δ={mean_delta:+.2f}  (parret t={t_ret:.3f}, p={p_ret:.3f})")
    print(f"  {'SIGNIFIKANT *' if p_ret < 0.05 else 'Ikke signifikant'} (α=.05)")

# ── Gruppe × posttest: deskriptiv per gruppe (uekskluderet) ──────────────────
print(f"\n=== GRUPPE-FORDELING (alle, inkl. ekskluderede) ===")
for g in ["control", "intervention"]:
    sub = post[post["group"] == g]
    print(f"  {g}: N={len(sub)}, M={sub['total'].mean():.2f}, SD={sub['total'].std():.2f}")
