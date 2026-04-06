"""
run_all.py — Kør hele analysepipelinen.

Brug: python run_all.py
"""

import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import importlib

steps = [
    ("01_extract",  "Henter data fra Supabase"),
    ("02_clean",    "Renser og filtrerer"),
    ("03_derive",   "Udleder nye variable"),
    ("04_analysis", "Kører statistiske tests"),
    ("05_plots",    "Genererer plots"),
]

for module_name, description in steps:
    print(f"\n{'='*50}")
    print(f"  {description}...")
    print(f"{'='*50}")
    mod = importlib.import_module(module_name)
    mod.run()

print("\n✓ Pipeline færdig. Se data/ og plots/")
