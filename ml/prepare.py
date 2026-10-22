"""Step 1 of the ML experiment: turn the public dataset into one clean file with groups and splits.

Input:  ml/data/Dataset_5971.zip (Mishra & Soni 2022, Mendeley Data f45bkkt8pr v1, CC BY 4.0)
Output: ml/data/public_splits.csv   id, group, ml_split, label, text
        ml/results/split-manifest.json   counts and a fingerprint of the split file

Labels: smishing -> fraud, ham -> legit, spam -> dropped (spam mixes ads and scams).
Groups keep near-copies together, so one scam never sits in two splits:
  1. a simple key (lowercase, links -> <url>, digits -> 0, spaces collapsed);
  2. messages whose keys are very similar (cosine >= 0.85 on word counts) join one group.
Groups, not messages, are split about 72 / 14 / 14 into train / dev / test, balanced by label
(StratifiedGroupKFold with 7 folds: one fold is test, one is dev), with a fixed seed.

Run:  python ml/prepare.py            (or --input path/to/file.zip or .csv)
"""
import argparse
import hashlib
import io
import json
import re
import zipfile
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import StratifiedGroupKFold

ROOT = Path(__file__).resolve().parent
SEED = 42
SIMILAR = 0.85
SOURCE = "Mishra & Soni 2022, SMS Phishing Dataset, Mendeley Data f45bkkt8pr v1 (CC BY 4.0)"
LABELS = {"smishing": "fraud", "ham": "legit"}


def read_raw(path):
    """Reads the dataset's CSV, from a zip or directly, trying UTF-8 first."""
    path = Path(path)
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as z:
            names = [n for n in z.namelist() if n.lower().endswith(".csv") and not n.startswith("__MACOSX")]
            if len(names) != 1:
                raise SystemExit(f"Expected one CSV inside {path.name}, found: {names}")
            data = z.read(names[0])
    else:
        data = path.read_bytes()
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            return pd.read_csv(io.BytesIO(data), encoding=encoding, dtype=str, keep_default_na=False)
        except UnicodeDecodeError:
            continue
    raise SystemExit("Could not read the CSV as UTF-8 or Latin-1.")


def column(frame, name):
    for c in frame.columns:
        if c.strip().lower() == name:
            return c
    raise SystemExit(f"No '{name}' column. Columns found: {list(frame.columns)}")


def group_key(text):
    t = text.lower()
    t = re.sub(r"https?://\S+|www\.\S+", "<url>", t)
    t = re.sub(r"\d", "0", t)
    return re.sub(r"\s+", " ", t).strip()


def similar_groups(keys):
    """Joins messages whose keys are nearly the same text (union-find over similar pairs)."""
    parent = list(range(len(keys)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    # Grouping uses no labels and decides nothing about the model; it only keeps copies together.
    x = TfidfVectorizer(ngram_range=(1, 2), min_df=1).fit_transform(keys)
    sims = (x @ x.T).tocoo()
    for i, j, v in zip(sims.row, sims.col, sims.data):
        if i < j and v >= SIMILAR:
            a, b = find(i), find(j)
            if a != b:
                parent[b] = a
    return [find(i) for i in range(len(keys))]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(ROOT / "data" / "Dataset_5971.zip"))
    args = ap.parse_args()

    raw = read_raw(args.input)
    label_col, text_col = column(raw, "label"), column(raw, "text")
    df = pd.DataFrame({"raw_label": raw[label_col].str.strip().str.lower(), "text": raw[text_col].str.strip()})
    print("Raw labels:", df["raw_label"].value_counts().to_dict())

    df["label"] = df["raw_label"].map(LABELS)
    dropped_spam = int((df["raw_label"] == "spam").sum())
    df = df[df["label"].notna() & (df["text"] != "")].copy()
    df["id"] = [f"pub-{i:05d}" for i in df.index]

    # Exact repeats: keep one copy; if copies disagree on the label, drop them all.
    labels_per_text = df.groupby("text")["label"].nunique()
    conflicting = set(labels_per_text[labels_per_text > 1].index)
    before = len(df)
    df = df[~df["text"].isin(conflicting)].drop_duplicates("text", keep="first").reset_index(drop=True)
    print(f"Dropped {dropped_spam} spam rows, {before - len(df)} exact repeats "
          f"({len(conflicting)} texts had conflicting labels).")

    keys = [group_key(t) for t in df["text"]]
    roots = similar_groups(keys)
    order = {r: k for k, r in enumerate(dict.fromkeys(roots))}
    df["group"] = [f"g{order[r]:05d}" for r in roots]

    # Groups, not rows, go to one split each. Seven label-balanced folds: fold 0 is test, fold 1 is dev.
    folds = StratifiedGroupKFold(n_splits=7, shuffle=True, random_state=SEED)
    y = (df["label"] == "fraud").astype(int)
    df["ml_split"] = "train"
    for k, (_, held) in enumerate(folds.split(df["text"], y, groups=df["group"])):
        if k == 0:
            df.loc[held, "ml_split"] = "test"
        elif k == 1:
            df.loc[held, "ml_split"] = "dev"

    # Check: no group appears in two splits.
    spread = df.groupby("group")["ml_split"].nunique()
    assert (spread == 1).all(), "a group spans splits"

    sizes = df.groupby("group").size()
    if sizes.max() > 0.02 * len(df):
        print(f"WARNING: the largest group has {sizes.max()} messages ({sizes.max() / len(df):.1%}). "
              "Look at it in public_splits.csv: very short texts can chain together.")
    per_split = df.groupby(["ml_split", "label"]).size().unstack(fill_value=0)
    for split in ("train", "dev", "test"):
        for label in ("fraud", "legit"):
            n = int(per_split.loc[split, label]) if split in per_split.index and label in per_split.columns else 0
            if n < 30:
                print(f"WARNING: only {n} {label} messages in {split}; its numbers will be very uncertain.")

    out = df[["id", "group", "ml_split", "label", "text"]]
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "results").mkdir(exist_ok=True)
    out_path = ROOT / "data" / "public_splits.csv"
    out.to_csv(out_path, index=False)

    counts = out.groupby(["ml_split", "label"]).size().unstack(fill_value=0)
    print(counts)
    multi = int((df.groupby("group").size() > 1).sum())
    manifest = {
        "source": SOURCE,
        "seed": SEED,
        "similarity_threshold": SIMILAR,
        "rows": len(out),
        "groups": int(df["group"].nunique()),
        "groups_with_more_than_one_message": multi,
        "counts": {s: counts.loc[s].to_dict() for s in counts.index},
        "public_splits_sha256": hashlib.sha256(out_path.read_bytes()).hexdigest(),
    }
    (ROOT / "results" / "split-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Wrote {out_path.relative_to(ROOT.parent)} and ml/results/split-manifest.json")


if __name__ == "__main__":
    main()
