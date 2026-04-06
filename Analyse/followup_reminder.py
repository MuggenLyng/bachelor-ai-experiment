"""
followup_reminder.py — Oversigt over hvem der skal kontaktes til follow-up.

Viser deltagere sorteret efter hvornår de skal kontaktes (1 uge efter eksperiment).
Kør dette script dagligt for at se hvem der er klar i dag.

Brug: python followup_reminder.py
"""

import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta, timezone
from config import DATABASE_URL, TABLE

FOLLOWUP_DELAY_DAYS = 7
FOLLOWUP_BASE_URL = "https://bachelor-ai-experiment.vercel.app/followup?token="

def run():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        df = pd.read_sql(text(f"""
            SELECT "participantId", "email", "followUpToken", "followUpCompleted",
                   "createdAt", "completed", "group"
            FROM "{TABLE}"
            WHERE "completed" = true
              AND "email" IS NOT NULL
              AND "followUpToken" IS NOT NULL
            ORDER BY "createdAt" ASC
        """), conn)

    if df.empty:
        print("Ingen deltagere med email endnu.")
        return

    df["createdAt"] = pd.to_datetime(df["createdAt"], utc=True)
    df["kontakt_dato"] = df["createdAt"] + timedelta(days=FOLLOWUP_DELAY_DAYS)
    df["link"] = FOLLOWUP_BASE_URL + df["followUpToken"]

    now = datetime.now(timezone.utc)
    today = now.date()

    ready      = df[df["kontakt_dato"].dt.date <= today]
    upcoming   = df[df["kontakt_dato"].dt.date > today]

    # ── KLAR I DAG / FORSINKET ──────────────────────────────────
    ready_not_done = ready[ready["followUpCompleted"] != True]
    ready_done     = ready[ready["followUpCompleted"] == True]

    print(f"\n{'='*60}")
    print(f"  FOLLOW-UP REMINDER  —  {today.strftime('%d. %b %Y')}")
    print(f"{'='*60}")
    print(f"  Totalt med email: {len(df)}  |  Afventer: {len(ready_not_done)}  |  "
          f"Gennemført: {len(ready_done)}  |  Ikke klar endnu: {len(upcoming)}")

    if not ready_not_done.empty:
        print(f"\n{'─'*60}")
        print(f"  ✉  KAN KONTAKTES NU ({len(ready_not_done)} stk.)")
        print(f"{'─'*60}")
        for _, row in ready_not_done.sort_values("kontakt_dato").iterrows():
            days_overdue = (today - row["kontakt_dato"].date()).days
            overdue_str = f"  ⚠ {days_overdue} dag(e) forsinket" if days_overdue > 0 else "  ← I DAG"
            print(f"\n  📧 {row['email']}{overdue_str}")
            print(f"     Gruppe:        {row['group']}")
            print(f"     Klar dato:     {row['kontakt_dato'].strftime('%d. %b %Y')}")
            print(f"     Follow-up link: {row['link']}")
    else:
        print("\n  Ingen at kontakte i dag.")

    if not ready_done.empty:
        print(f"\n{'─'*60}")
        print(f"  ✅ ALLEREDE GENNEMFØRT ({len(ready_done)} stk.)")
        print(f"{'─'*60}")
        for _, row in ready_done.sort_values("kontakt_dato").iterrows():
            print(f"  {row['email']}  (klar: {row['kontakt_dato'].strftime('%d. %b %Y')})")

    if not upcoming.empty:
        print(f"\n{'─'*60}")
        print(f"  🕐 KOMMENDE ({len(upcoming)} stk.)")
        print(f"{'─'*60}")
        for _, row in upcoming.sort_values("kontakt_dato").iterrows():
            days_left = (row["kontakt_dato"].date() - today).days
            print(f"  {row['email']}  →  klar om {days_left} dag(e)  "
                  f"({row['kontakt_dato'].strftime('%d. %b %Y')})")

    print(f"\n{'='*60}\n")

if __name__ == "__main__":
    run()
