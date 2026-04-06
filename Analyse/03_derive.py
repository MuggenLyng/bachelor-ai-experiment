"""
03_derive.py — Udled nye variable fra de rå data.
"""

import pandas as pd

def run():
    print("=== 03 DERIVE ===")
    df = pd.read_csv("data/clean/clean_complete.csv")

    # --- Primary outcome ---
    df["learning_gain"] = df["posttestScore"] - df["pretestScore"]

    # --- EVT (Expectancy-Value Theory) ---
    df["evt_mean"] = df[["evt1", "evt2", "evt3"]].mean(axis=1)

    # --- Chat metrics ---
    df["chat_duration_min"] = df["chatDuration"] / 1000 / 60  # ms → minutter
    df["assistant_ratio"] = df["assistantMessageCount"] / df["chatMessageCount"].replace(0, pd.NA)

    # --- Fritekst ---
    df["has_freetext"] = df["freeTextResponse"].notna() & (df["freeTextWordCount"].fillna(0) > 0)

    # --- Follow-up ---
    df["has_followup"] = df["followUpCompleted"] == True

    # --- Køn numerisk (til regression) ---
    df["gender_num"] = df["gender"].map({"Mand": 0, "Kvinde": 1, "Andet": pd.NA})

    # --- Gem ---
    df.to_csv("data/processed/processed.csv", index=False)

    print(f"  Afledte variable:")
    print(f"    learning_gain:     {df['learning_gain'].describe().to_dict()}")
    print(f"    evt_mean:          mean={df['evt_mean'].mean():.2f}, sd={df['evt_mean'].std():.2f}")
    print(f"    chat_duration_min: mean={df['chat_duration_min'].mean():.1f} min")
    print(f"  Gemt → data/processed/processed.csv")
    return df

if __name__ == "__main__":
    run()
