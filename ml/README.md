# ML experiment (offline)

Does a small text model add useful caution on top of the rules? This folder measures that without
touching the app. The rules make the verdict; the model can only add caution
(see [the decision](../docs/decisions/ml-layer.md)). Nothing here changes `js/` or `data/`.

## One-time setup (Mac)

```sh
cd <your repo folder>
python3 -m venv .venv-ml
source .venv-ml/bin/activate
pip install -r ml/requirements.txt
```

Download `Dataset_5971.zip` from the dataset page
(<https://data.mendeley.com/datasets/f45bkkt8pr/1>) and put it in `ml/data/`.
`ml/data/` and `ml/results/` are never uploaded.

## Before training

1. Read `docs/decisions/ml-layer.md` and the numbers in `ml/config.json`.
2. Change any number you disagree with **now**, then fill in `confirmed_by` and `confirmed_on`.
3. Make sure this branch has your reviewed records (`git merge records-reviewed`), so the rules can
   give Details Match where they should.

## Run (in this order)

```sh
source .venv-ml/bin/activate
python ml/prepare.py                                  # groups and splits
node ml/rules_verdicts.cjs --today 2026-10-21          # the rules' verdict for each message
python ml/train.py --workshop eval/results/after-reviews/results.csv
python ml/compare.py choose                            # threshold, on public dev
python ml/compare.py report --set public --split dev
python ml/compare.py report --set workshop --rules eval/results/after-reviews/results.csv
```

Read the dev and workshop reports in `ml/results/`. Only when you will not change anything else:

```sh
python ml/compare.py report --set public --split test   # runs once; a second run is refused
```

## What each file does

| File | Job |
| --- | --- |
| `prepare.py` | Maps labels (smishing → fraud, ham → legit, spam dropped), removes exact repeats, groups near-copies, splits whole groups into train / dev / test |
| `rules_verdicts.cjs` | Runs every public message through the app's own engine, list and policies (via `eval/engine.cjs`), without adding them to the eval's dev log |
| `train.py` | TF-IDF + logistic regression fitted on train only; picks C on dev; scores every message |
| `compare.py` | Applies the decision table, picks the threshold on dev, reports the four numbers with Wilson intervals, and allows one test run |
| `config.json` | The budget and benefit criteria, fixed before training |

## Things that would make the numbers wrong

- Changing `config.json`, the model or the threshold after looking at test results.
- Training or choosing anything on workshop messages: they are exploratory only.
- Rerunning `rules_verdicts.cjs` on a different engine or list version without rerunning the rest.
  `ml/results/rules_public.json` records which versions were used.
