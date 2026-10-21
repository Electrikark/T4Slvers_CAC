"""Step 4 of the ML experiment: rules alone (B) vs rules + ML (C).

The ML is advisory and can only do two things (docs/decisions/ml-layer.md):
  Details Match         + ML flag -> Insufficient Evidence
  Insufficient Evidence + ML flag -> Insufficient Evidence with an extra caution line
  Suspicious                      -> unchanged
So "ML flag" matters only where the rules did not already say Suspicious.

Run, in this order:
  python ml/compare.py choose                       pick the threshold on PUBLIC DEV (needs config confirmed)
  python ml/compare.py report --set public --split dev
  python ml/compare.py report --set workshop --rules eval/results/after-reviews/results.csv
  python ml/compare.py report --set public --split test     ONCE, after everything above is fixed

Each report gives the four numbers as count / total with a 95% Wilson interval.
"""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from math import sqrt
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / "results"
FLAGGABLE = {"insufficient_evidence", "details_match"}


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 1.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    m = z * sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - m), min(1.0, c + m))


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def fmt(k, n):
    lo, hi = wilson(k, n)
    rate = f"{k / n:.1%}" if n else "n/a"
    return f"{k} / {n} ({rate}; 95% interval {lo:.1%}–{hi:.1%})"


def load_public(split):
    scores = pd.read_csv(RESULTS / "scores_public.csv", dtype={"id": str})
    rules = pd.read_csv(RESULTS / "rules_public.csv", dtype=str, keep_default_na=False)
    df = scores.merge(rules[["id", "assessment"]], on="id", how="inner", validate="one_to_one")
    if len(df) != len(scores):
        raise SystemExit("Scores and rules verdicts do not cover the same messages. Rerun steps 2 and 3.")
    return df[df.ml_split == split].copy()


def load_workshop(rules_path):
    scores = pd.read_csv(RESULTS / "scores_workshop.csv", dtype={"id": str})
    rules = pd.read_csv(rules_path, dtype=str, keep_default_na=False)
    df = scores.merge(rules[["id", "assessment"]], on="id", how="inner", validate="one_to_one")
    if len(df) != len(scores):
        raise SystemExit("Workshop scores and rules file do not match. Score the same file with train.py --workshop.")
    return df


def legit_new(df, t):
    legit = df[df.label == "legit"]
    return int(((legit.score >= t) & legit.assessment.isin(FLAGGABLE)).sum()), len(legit)


def choose(args):
    config = json.loads((ROOT / "config.json").read_text())
    if not config.get("confirmed_by") or not config.get("confirmed_on"):
        raise SystemExit("Fill in confirmed_by and confirmed_on in ml/config.json first: the budget must be "
                         "fixed before you see where the threshold lands.")
    out = RESULTS / "threshold.json"
    if out.exists() and not args.again:
        raise SystemExit("A threshold was already chosen. Use --again only if you record why in the decision doc.")
    dev = load_public("dev")
    budget = config["false_warning_budget"]
    # The lowest cutoff that keeps newly cautioned legit messages within the budget.
    chosen = None
    for t in sorted(dev.score.unique()):
        k, n = legit_new(dev, t)
        if n and k / n <= budget:
            chosen = float(t)
            break
    if chosen is None:
        raise SystemExit("No threshold meets the budget on dev.")
    k, n = legit_new(dev, chosen)
    record = {
        "threshold": chosen,
        "chosen_on": "public dev",
        "budget": budget,
        "legit_newly_cautioned_on_dev": f"{k} / {n}",
        "config_sha256": sha(ROOT / "config.json"),
        "scores_sha256": sha(RESULTS / "scores_public.csv"),
        "rules_sha256": sha(RESULTS / "rules_public.csv"),
        "when": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    out.write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record, indent=2))


def report(args):
    config = json.loads((ROOT / "config.json").read_text())
    tfile = RESULTS / "threshold.json"
    if not tfile.exists():
        raise SystemExit("Run `python ml/compare.py choose` first.")
    th = json.loads(tfile.read_text())
    t = th["threshold"]

    if args.set == "public":
        if args.split not in ("dev", "test"):
            raise SystemExit("--split must be dev or test")
        if args.split == "test":
            guard = RESULTS / "test-run.json"
            if guard.exists():
                raise SystemExit(f"The public test split was already run ({json.loads(guard.read_text())['when']}). "
                                 "It counts only once.")
            if th["scores_sha256"] != sha(RESULTS / "scores_public.csv") or th["config_sha256"] != sha(ROOT / "config.json"):
                raise SystemExit("Scores or config changed after the threshold was chosen. Choose again on dev first.")
            guard.write_text(json.dumps({"when": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                                         "threshold": t, "scores_sha256": th["scores_sha256"]}, indent=2) + "\n")
        df = load_public(args.split)
        title = f"public {args.split}"
    else:
        if not args.rules:
            raise SystemExit("Give --rules, the eval results.csv you scored with train.py --workshop.")
        df = load_workshop(args.rules)
        title = "workshop messages (exploratory: already seen while fixing rules)"

    flag = df.score >= t
    fraud, legit = df[df.label == "fraud"], df[df.label == "legit"]
    f_flag, l_flag = flag[df.label == "fraud"], flag[df.label == "legit"]

    scam_ie = fraud.assessment == "insufficient_evidence"
    scam_dm = fraud.assessment == "details_match"
    legit_dm = legit.assessment == "details_match"
    legit_flaggable = legit.assessment.isin(FLAGGABLE)

    extra = (int((scam_ie & f_flag).sum()), int(scam_ie.sum()))
    blocked = (int((scam_dm & f_flag).sum()), int(scam_dm.sum()))
    new_legit = (int((legit_flaggable & l_flag).sum()), len(legit))
    lost = (int((legit_dm & l_flag).sum()), int(legit_dm.sum()))

    lines = [
        f"# Rules (B) vs rules + ML (C): {title}",
        "",
        f"Threshold {t:.4f} (chosen on {th['chosen_on']}, budget {th['budget']:.0%}). "
        f"Messages: {len(fraud)} scams, {len(legit)} legit.",
        "",
        "Rules alone: "
        f"scams Suspicious {int((fraud.assessment == 'suspicious').sum())}, "
        f"Insufficient Evidence {int(scam_ie.sum())}, Details Match {int(scam_dm.sum())}; "
        f"legit Suspicious {int((legit.assessment == 'suspicious').sum())}, "
        f"Insufficient Evidence {int((legit.assessment == 'insufficient_evidence').sum())}, "
        f"Details Match {int(legit_dm.sum())}.",
        "",
        "| What C changes | Count |",
        "| --- | --- |",
        f"| Extra caution on a scam the rules left at Insufficient Evidence | {fmt(*extra)} |",
        f"| Wrong Details Match blocked (scams) | {fmt(*blocked)} |",
        f"| Legit messages newly cautioned (of all legit) | {fmt(*new_legit)} |",
        f"| Legit Details Match lost | {fmt(*lost)} |",
        "",
    ]
    rate = extra[0] / extra[1] if extra[1] else 0.0
    lo = wilson(*extra)[0]
    within = new_legit[1] > 0 and new_legit[0] / new_legit[1] <= config["false_warning_budget"]
    benefit = rate >= config["min_extra_caution_rate"] and lo >= config["min_extra_caution_lower_bound"]
    lines += [
        "Against the criteria fixed in ml/config.json:",
        f"- Legit newly cautioned within {config['false_warning_budget']:.0%}: {'yes' if within else 'no'}",
        f"- Extra caution rate at least {config['min_extra_caution_rate']:.0%} with lower bound at least "
        f"{config['min_extra_caution_lower_bound']:.0%}: {'yes' if benefit else 'no'}",
        "",
        "Extra caution is a measured output, not a measured safety gain. Scores are not probabilities of fraud.",
    ]
    text = "\n".join(lines) + "\n"
    name = f"compare_{args.set}_{args.split or 'all'}.md"
    (RESULTS / name).write_text(text)
    print(text)
    print(f"Wrote ml/results/{name}")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("choose")
    c.add_argument("--again", action="store_true")
    r = sub.add_parser("report")
    r.add_argument("--set", choices=["public", "workshop"], required=True)
    r.add_argument("--split")
    r.add_argument("--rules")
    args = ap.parse_args()
    choose(args) if args.cmd == "choose" else report(args)


if __name__ == "__main__":
    main()
