"""Transfer probe: does the public-data model read modern U.S. messages sensibly?

These 16 messages were written by hand to resemble 2026 U.S. texts. They are NOT evaluation
data and were not used for any choice. They exist to show one thing quickly: whether a model
trained on the 2022 public dataset carries over to the messages seniors actually receive.

Run after train.py:  python ml/probe.py [--threshold 0.062]
"""
import argparse
from pathlib import Path

import joblib

MESSAGES = [
    ("legit", "Chase: Your one-time code is 482913. Don't share it with anyone. We'll never call to ask for it."),
    ("legit", "USPS: Your package 9400111899223 is out for delivery today. Track at https://tools.usps.com"),
    ("legit", "Kaiser Permanente: Reminder of your appointment on Oct 24 at 9:30 AM. Reply C to confirm."),
    ("legit", "Wells Fargo: A purchase of $52.10 at SAFEWAY was approved on card ending 1234. Questions? Call the number on your card."),
    ("legit", "CVS Pharmacy: Your prescription is ready for pickup at 123 Main St."),
    ("legit", "Your Uber is arriving now. Look for a gray Toyota Camry."),
    ("legit", "Hi Grandma, see you Sunday for lunch! Love you"),
    ("legit", "Amazon: Your order of 'Reading glasses' has shipped and will arrive Thursday."),
    ("fraud", "USPS: Your package is held due to an incomplete address. Update within 12 hours: https://usps-redelivery-help.top"),
    ("fraud", "FasTrak: You have an unpaid toll of $6.99. Pay now to avoid a $50 late fee: https://fastrak-tolls-ca.com"),
    ("fraud", "Grandma it's me, I'm in jail and need bail money. Please don't tell mom. Buy Apple gift cards and send me the codes."),
    ("fraud", "Wells Fargo Alert: Did you attempt a $1,499 Zelle payment? Reply YES or NO. If no, call 1-866-555-0199 immediately."),
    ("fraud", "Hi Mom, I dropped my phone, this is my new number. Can you help me pay a bill today? I'll pay you back."),
    ("fraud", "Microsoft: Your computer is infected with a virus. Call 1-888-555-0142 now to avoid data loss."),
    ("fraud", "Amazon: Your account is locked due to suspicious activity. Verify your identity at http://amazon-secure-verify.net"),
    ("fraud", "IRS: You owe $2,340 in back taxes. A warrant will be issued unless you pay today with gift cards."),
]

ap = argparse.ArgumentParser()
ap.add_argument("--threshold", type=float, default=None)
args = ap.parse_args()
model = joblib.load(Path(__file__).resolve().parent / "results" / "model.joblib")
for label, text in MESSAGES:
    score = model.predict_proba([text])[0, 1]
    flag = "" if args.threshold is None else ("  FLAG" if score >= args.threshold else "")
    print(f"{label:5s} {score:.3f}{flag}  {text[:72]}")
