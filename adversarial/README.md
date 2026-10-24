# Robustness run: meaning-preserving rewrites

Does a rule keep its verdict when the same message is worded differently?

The reporting-scope repair fixed one case where a true demand went unseen. This folder asks the
general version of that question, by machine, so the next case is found before a judge or a senior
finds it.

## The idea

Take a message the rules already catch. Reword it so that a person reading both would say they are
the same message. The verdict must not change. If it does, the rules were matching the wording, not
the request.

This is the invariance test from Ribeiro et al., *Beyond Accuracy: Behavioral Testing of NLP Models
with CheckList* (ACL 2020). Their point is that a single accuracy figure hides which behaviors a
system actually has, and that stating a property and generating many cases against it finds failures
a test set never reaches. The same argument holds for rules: 810 passing fixtures say the rules do
what their author expected, not that the rules hold under rewording the author did not think of.

## The three properties

| Name | On what | The rule must |
| --- | --- | --- |
| **Evasion** | fraud seeds the rules catch | stay Suspicious under every rewrite |
| **Fragility** | legitimate seeds the rules leave alone | stay not-Suspicious under every rewrite that is safe on legitimate text |
| **Safety** | every fraud rewrite | never reach Details Match |

Safety is the one that matters to a person. The gate already makes it structurally impossible, since
any established finding blocks Details Match (`src/assessment.js`, `RISK_SIGNAL`). It is checked
anyway: a claim nobody tests is a claim nobody should believe. A non-zero count here is a release
blocker, and the run exits non-zero.

## Why meaning-preservation is the whole argument

The test is only valid if the rewrite really does mean the same thing. So every transform in
`transforms.cjs` declares two fields:

- `preserves`: `'all'` (safe on any message) or `'fraud'` (safe only on a message that already makes
  a demand — adding "Act today" to a pharmacy reminder would change what that reminder is, so those
  transforms never run on legitimate controls).
- `why`: the one-line argument that meaning survives. It is printed in the report so a reader can
  check the claim instead of taking it on trust.

Turning a demand into a **reported** demand ("Fraudsters may ask you to pay with gift cards") is
deliberately not here. That changes who is asking, so the verdict *should* change. It belongs in
`tests/reporting-scope`, which checks it with hand-written expectations.

When a failure turns out to rest on a transform that does not really preserve meaning, the transform
is the bug. Fix `transforms.cjs`, not the rules.

## Running it

```sh
node adversarial/run.cjs                       # defaults: seed 20261023, depth 2, 400 rewrites/seed
node adversarial/run.cjs --budget 800 --depth 3 --fixture
```

| Flag | Meaning |
| --- | --- |
| `--seed` | generator seed; the same seed gives the same rewrites on any machine |
| `--depth` | at most this many transforms stacked on one message |
| `--budget` | at most this many distinct rewrites per seed |
| `--today` | reference date passed to the engine |
| `--out` | output folder (default `adversarial/results`) |
| `--fixture` | also write `evasions.json`, ready to turn into failing tests |

Output: `report.md` (read this), `results.json` (every row, plus the run's settings and a digest).

## What it does not touch

- It never reads `eval/data`, so the held-out split stays untouched and unexposed.
- It never records dev exposure.
- It changes no engine file and no reference record.
- Its seed messages are written for this test and are not real collected messages.

## Reading a failure

1. Read the rewrite as a person would. Different meaning → the transform is wrong.
2. Same meaning → a rule gap. Add it to the matrix as a **failing** case, then widen the rule, then
   rerun everything.
3. Shortest chains first. A one-transform escape is a plain gap; a three-transform escape may only
   be reachable by stacking changes no real sender would stack.

## What the number is not

- Not accuracy, and not a detection rate.
- Not evidence about real senders. These rewrites are generated from a fixed list, so they cover what
  that list thought of and nothing else.
- Not comparable across engine versions. Always report the escape rate beside the engine version and
  the generator seed, both of which the report prints.
- A low escape rate says the rules hold under these rewrites. It does not say the rules cover the
  scams people receive.
