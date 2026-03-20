# /Power analysis for the bachelor experiment.
# Independent t-test, two groups.
# Alpha = .05
# Power = .80

from statsmodels.stats.power import TTestIndPower

analysis = TTestIndPower()

alpha = 0.05
power = 0.80
effect_sizes = [0.3, 0.45, 0.7]

print("Power-analyse for to uafhængige grupper\n")

for d in effect_sizes:
    n_per_group = analysis.solve_power(
        effect_size=d,
        alpha=alpha,
        power=power,
        ratio=1.0,
        alternative="two-sided"
    )
    total_n = n_per_group * 2

    print(f"Effektstørrelse d = {d}")
    print(f"Nødvendigt antal per gruppe: {n_per_group:.2f}")
    print(f"Samlet N: {total_n:.2f}\n")