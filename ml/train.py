"""Step 3 of the ML experiment: train one simple model and score every message.

Model: TF-IDF word counts (single words and word pairs, min_df=2) + logistic regression
(class_weight="balanced"). Everything is fitted on TRAIN rows only. C is chosen on DEV rows
by average precision. Test rows are scored but never used for any choice here.

Run:  python ml/train.py
      python ml/train.py --workshop eval/results/after-reviews/results.csv   (also score your own messages)
In:   ml/data/public_splits.csv, ml/config.json
Out:  ml/results/model.joblib, ml/results/model.json,
      ml/results/scores_public.csv  (id, ml_split, label, score)
      ml/results/scores_workshop.csv (id, label, score), if --workshop is given
"""
import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score
from sklearn.pipeline import make_pipeline

ROOT = Path(__file__).resolve().parent


def build(c):
    return make_pipeline(
        TfidfVectorizer(ngram_range=(1, 2), min_df=2),
        LogisticRegression(C=c, class_weight="balanced", max_iter=1000),
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workshop", help="an eval results.csv with id, label and text columns")
    args = ap.parse_args()

    config = json.loads((ROOT / "config.json").read_text())
    data = pd.read_csv(ROOT / "data" / "public_splits.csv", dtype=str, keep_default_na=False)
    train, dev = data[data.ml_split == "train"], data[data.ml_split == "dev"]
    y_train, y_dev = (train.label == "fraud").astype(int), (dev.label == "fraud").astype(int)

    results = {}
    for c in config["c_values"]:
        model = build(c).fit(train.text, y_train)
        results[c] = average_precision_score(y_dev, model.predict_proba(dev.text)[:, 1])
        print(f"C={c}: dev average precision {results[c]:.4f}")
    best = max(config["c_values"], key=lambda c: (round(results[c], 4), -c))  # a tie goes to the smaller C
    print(f"Chosen C={best}")

    model = build(best).fit(train.text, y_train)
    (ROOT / "results").mkdir(exist_ok=True)
    joblib.dump(model, ROOT / "results" / "model.joblib")
    info = {
        "sklearn": sklearn.__version__,
        "chosen_C": best,
        "dev_average_precision": {str(c): round(v, 4) for c, v in results.items()},
        "train_rows": len(train),
        "vocabulary_size": len(model[0].vocabulary_),
        "fitted_on": "train split only",
    }
    (ROOT / "results" / "model.json").write_text(json.dumps(info, indent=2) + "\n")

    scores = data[["id", "ml_split", "label"]].copy()
    scores["score"] = model.predict_proba(data.text)[:, 1]
    scores.to_csv(ROOT / "results" / "scores_public.csv", index=False)
    print("Wrote ml/results/scores_public.csv and model files")

    if args.workshop:
        own = pd.read_csv(args.workshop, dtype=str, keep_default_na=False)
        out = own[["id", "label"]].copy()
        out["score"] = model.predict_proba(own.text)[:, 1]
        out.to_csv(ROOT / "results" / "scores_workshop.csv", index=False)
        print(f"Wrote ml/results/scores_workshop.csv ({len(out)} messages)")


if __name__ == "__main__":
    main()
