"""
02_clean.py — Rens data og filtrer dropouts.
"""

import pandas as pd
from config import MIN_FREETEXT_CHARS

def run():
    print("=== 02 CLEAN ===")
    df = pd.read_csv("data/raw/latest.csv")

    print(f"  Rå rækker: {len(df)}")

    # --- Dropouts ---
    completed = df[df["completed"] == True].copy()
    dropouts  = df[df["completed"] != True].copy()
    print(f"  Fuldførte: {len(completed)}")
    print(f"  Dropouts:  {len(dropouts)}")
    if len(dropouts) > 0:
        print(f"  Dropout per step:\n{dropouts['dropoutStep'].value_counts().to_string()}")

    df = completed.copy()

    # --- Standardisering ---
    df["group"] = df["group"].str.strip().str.lower()
    df["gender"] = df["gender"].str.strip()
    df["education"] = df["education"].str.strip()
    df["deviceType"] = df["deviceType"].str.strip().str.lower()

    # Uddannelse → grupper
    gym = ["Gymnasiel (STX, HF, HHX, HTX eller lign.)", "Grundskole"]
    vgo = ["Professionsbachelor", "Bachelor", "Kandidat", "Ph.d. eller højere"]
    df["edu_group"] = df["education"].apply(
        lambda x: "gymnasiel" if x in gym else ("videregående" if x in vgo else "andet")
    )

    # --- Missing values: kun complete cases til primær analyse ---
    required = ["group", "pretestScore", "posttestScore", "age", "gender", "education"]
    before = len(df)
    df_complete = df.dropna(subset=required)
    print(f"  Complete cases (primær analyse): {len(df_complete)} (droppede {before - len(df_complete)} pga. missing)")

    # --- Gem ---
    df.to_csv("data/clean/clean_all.csv", index=False)
    df_complete.to_csv("data/clean/clean_complete.csv", index=False)
    dropouts.to_csv("data/clean/dropouts.csv", index=False)

    print(f"  Gemt → data/clean/")
    return df_complete, df, dropouts

if __name__ == "__main__":
    run()
