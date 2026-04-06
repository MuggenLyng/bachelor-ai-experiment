"""
01_extract.py — Hent data fra Supabase og gem som raw snapshot.
"""

import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime
import os
from config import DATABASE_URL, TABLE

def run():
    print("=== 01 EXTRACT ===")
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        df = pd.read_sql(text(f'SELECT * FROM "{TABLE}"'), conn)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = f"data/raw/raw_{timestamp}.csv"
    df.to_csv(out_path, index=False)

    # Gem også altid en "latest" fil som de andre scripts bruger
    df.to_csv("data/raw/latest.csv", index=False)

    print(f"  Hentet {len(df)} rækker → {out_path}")
    print(f"  Kolonner: {list(df.columns)}")
    return df

if __name__ == "__main__":
    run()
