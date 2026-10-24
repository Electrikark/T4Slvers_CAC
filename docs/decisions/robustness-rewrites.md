# Decision: testing the rules against meaning-preserving rewrites

Status: **draft, written with the first results in hand.** Prepared Oct 23, 2026. The settings in
`adversarial/freeze.json` are proposals until Naman fills in `confirmed_by` and `confirmed_on` there.

## The question

The reporting-scope repair fixed one case where a true demand went unseen: a cue word near a real
demand silenced it. That repair was found by hand. This asks the general version of the same
question by machine, so the next case is found before a judge or a senior finds it.

Take a message the rules already catch. Reword it so a person reading both would say they are the
same message. The verdict must not change. If it does, the rules were matching wording and not the
request.

The method is the invariance test from Ribeiro et al., *Beyond Accuracy: Behavioral Testing of NLP
Models with CheckList* (ACL 2020). Their argument is that a single accuracy figure hides which
behaviors a system has, and that stating a property and generating many cases against it finds
failures no fixed test set reaches. It applies to rules exactly as it does to models: 810 passing
fixtures say the rules do what their author expected, not that they hold under rewording the author
did not think of.

## What is checked

| Property | On what | Must hold |
| --- | --- | --- |
| **Safety** | every rewrite of every fraud seed | never reaches Details Match |
| Evasion | fraud seeds the rules catch | stays Suspicious under every rewrite |
| Fragility | legitimate seeds the rules leave alone | stays not-Suspicious under rewrites that are safe on legitimate text |

Safety is the only one that is a release blocker, and it is the one that matters to a person: the
app telling someone a scam looks fine. `src/assessment.js` already makes it structurally impossible,
because any established finding sets `RISK_SIGNAL` and blocks Details Match. It is tested anyway. A
claim nobody tests is a claim nobody should believe, and this is the claim the whole app rests on.

## Why meaning-preservation is the entire argument

The test is valid only if the rewrite really does mean the same thing. So every transform in
`adversarial/transforms.cjs` declares:

- `preserves`: `'all'` (safe on any message) or `'fraud'` (safe only where a demand already exists;
  adding "Act today" to a pharmacy reminder would change what that reminder is, so those never run
  on legitimate controls).
- `why`: the one-line argument that meaning survives, printed in the report so a reader checks the
  claim instead of trusting it.

Turning a demand into a **reported** demand ("Fraudsters may ask you to pay with gift cards") is
deliberately excluded. That changes who is asking, so the verdict *should* change. It stays in
`tests/reporting-scope`, with hand-written expectations.

When a failure rests on a transform that does not really preserve meaning, **the transform is the
bug**. Three were found and fixed this way during the first run: a synonym pair that produced
nonsense, and two that left a stray capital or lowercased an acronym. Each had inflated the escape
rate before it was fixed.

## What is reported, and what is not

Reported: counts, the spread across seed messages, and the number of seeds with at least one escape.

**Not reported: a confidence interval over rewrites.** Rewrites share seed messages and overlapping
chains, so they are not independent draws; an interval over them would claim a precision this design
does not have. The seed message is the independent unit, so intervals are given over seeds only.
This differs from `eval/metrics.cjs`, where each message is its own draw and Wilson applies.

The escape rate is **not** asserted in CI. It moves whenever a rule is widened, which is the point
of widening a rule, and a test that failed on improvement would be deleted within a week. The gate
asserts safety and the per-seed baseline; the rate is read from `npm run robustness` and recorded in
`RELEASE.md` beside the engine version.

## The freeze

`adversarial/freeze.json` pins the gate's seed, depth and budget, and fingerprints
`transforms.cjs`, `seeds.cjs` and `run.cjs`. A rate only means something if what produced it is
pinned. `npm run robustness:freeze` rewrites it; doing that to silence a failing gate, without an
entry in this file saying why, defeats the point of having one.

`knownBaselineGaps` lists seeds whose rule does not fire on the plain text. They are listed rather
than removed, and the gate fails if one starts passing, so the list cannot go quietly stale.

## First results (engine 0.4.1, reference list 2026-10-18-five-org-draft)

- Safety: **0** breaks in 4,000 rewrites. The gate's fixed subset re-checks 480 on every `npm test`.
- One root cause behind most escapes: a prefix check that admits `"please"` and no other adverb.
  `Please send the payment by wire transfer` fires T1-WIRE; `Kindly send` and `Just send` do not.
  The same shape appears inside the asking form (`needs you to please download` fires,
  `needs you to just download` does not), and clauses joined with `", and "` lose the finding
  because the splitter cuts on `but|however|instead` but not `and`.
- Asymmetry in lookalike folding: a Cyrillic letter in `delivery сode` turns a safe USPS message
  Suspicious, so folding protects the scam path but not the exemption path.
- Two seeds never fired at all and are listed as known gaps: a one-time-passcode request and
  "convert the balance to bitcoin".

## Limits

- The rewrites come from a fixed hand-written list. They cover what that list thought of, nothing else.
- They are generated, so they are not evidence about what real senders write.
- Rates are not comparable across engine versions. Always quote the engine version and generator seed.
- A low escape rate says the rules hold under these rewrites. It does not say the rules cover the
  scams people receive. That is what the held-out message evaluation is for, and the two numbers
  must never be presented as the same kind of claim.

## Update: engine 0.4.2 (Oct 23, 2026)

The courtesy-word defect is fixed ([polite-wording.md](polite-wording.md)). At the same settings,
escapes fell from 669 to 469 of 4,000, with no new escape and the same 12 false alarms. Every
remaining failure is listed in `adversarial/known-failures.json`, and
`tests/adversarial-known-node.cjs` fails on any new or vanished one.
