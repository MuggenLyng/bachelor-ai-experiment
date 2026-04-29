# Power analysis for the bachelor experiment.
# Alpha = .05, Power = .80

import numpy as np
from statsmodels.stats.power import TTestIndPower, FTestAnovaPower
from scipy.optimize import brentq
from scipy import stats
import pandas as pd

alpha = 0.05
target_power = 0.80
effect_sizes = [0.3, 0.45, 0.5]

# ── 1) T-test power (a priori) ───────────────────────────────────────────────
print("=" * 55)
print("A PRIORI POWER-ANALYSE — Welch t-test (to uafhængige grupper)")
print("=" * 55)
analysis_t = TTestIndPower()
for d in effect_sizes:
    n = analysis_t.solve_power(effect_size=d, alpha=alpha, power=target_power,
                               ratio=1.0, alternative="two-sided")
    print(f"  d={d:.2f}  =>  N per gruppe={n:.1f}  (total N={n*2:.1f})")

# ── 2) ANCOVA power ───────────────────────────────────────────────────────────
print()
print("=" * 55)
print("A PRIORI POWER-ANALYSE — ANCOVA (én kovariat: pretest)")
print("=" * 55)

# Indlæs data for at estimere r(pretest, outcome)
try:
    df = pd.read_csv("data/processed/processed.csv")
    df_clean = df.dropna(subset=["pretestScore", "posttestScore"])
    r_prepost, _ = stats.pearsonr(df_clean["pretestScore"], df_clean["posttestScore"])
    print(f"  r(pretest, posttest) fra data = {r_prepost:.3f}")
except Exception:
    r_prepost = 0.40  # konservativt estimat
    print(f"  r(pretest, posttest) = {r_prepost:.3f} (estimat — kør efter pipeline)")

print(f"  Formel: f² = (d²/4) × 1/(1−r²)")
print()

pwr_ancova = FTestAnovaPower()
for d in effect_sizes:
    f2 = (d**2 / 4) * (1 / (1 - r_prepost**2))
    f  = np.sqrt(f2)
    def pw_diff(n):
        return pwr_ancova.solve_power(effect_size=f, nobs=n, alpha=alpha, k_groups=2) - target_power
    n80 = brentq(pw_diff, 6, 2000)
    print(f"  d={d:.2f}, f²={f2:.3f}  =>  total N={n80:.0f}  (N per gruppe={n80/2:.0f})")

# ── 3) Post-hoc power ved faktisk N ──────────────────────────────────────────
print()
print("=" * 55)
print("POST-HOC POWER ved faktisk N (t-test + ANCOVA)")
print("=" * 55)
try:
    n_total = df["group"].notna().sum()
    d_obs = 0.42  # observeret Cohen d
    f2_obs = (d_obs**2 / 4) * (1 / (1 - r_prepost**2))
    f_obs  = np.sqrt(f2_obs)

    power_t    = TTestIndPower().solve_power(effect_size=d_obs, nobs1=n_total/2,
                                              alpha=alpha, ratio=1.0, alternative="two-sided")
    power_anc  = pwr_ancova.solve_power(effect_size=f_obs, nobs=n_total, alpha=alpha, k_groups=2)
    print(f"  N={n_total}, d={d_obs}")
    print(f"  t-test power:  {power_t:.3f}")
    print(f"  ANCOVA power:  {power_anc:.3f}")
except Exception as e:
    print(f"  (kunne ikke beregne post-hoc: {e})")
