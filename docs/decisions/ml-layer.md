# Decision: an optional ML caution check (offline experiment first)

Status: **draft, written before any training**. The numbers in `ml/config.json` are proposals until
Naman fills in `confirmed_by` and `confirmed_on` there. Prepared Oct 21, 2026; development cutoff
Oct 21, 2026, evening (Pacific).

## What the ML is allowed to do

The rules decide the verdict. The ML can only add caution, never remove it:

| Rules' verdict | ML flags the message | Final result |
| --- | --- | --- |
| Suspicious | either | Suspicious, with the rules' evidence |
| Details Match | yes | Insufficient Evidence |
| Details Match | no | Details Match, subject to every existing requirement |
| Insufficient Evidence | yes | Insufficient Evidence, plus one extra caution line |
| Insufficient Evidence | no | Insufficient Evidence |

- A low score is not evidence that a message is safe. It never clears a rules warning.
- The ML never produces Suspicious by itself, because every Suspicious result must show the person a
  reason they can read. This is this app's evidence policy, not a limit of classifiers in general.
- Word weights explain a score. They are not proof of fraud and are not shown as evidence.

## Advisory, not required

If the model fails to load or errors, the app shows the rules-only verdict and a short note that the
extra check is unavailable. That is exactly the frozen, tested rules-only build, so a failure never
leaves the person worse off than v1. (A required check would cap Details Match at Insufficient
Evidence whenever the model is missing; not chosen, because it would silently remove every Details
Match on a phone that cannot load the model.)

## Criteria, fixed before training (`ml/config.json`)

- **False-warning budget:** at most 10% of legitimate messages newly cautioned. (Proposed.)
- **Minimum worthwhile benefit:** the ML adds caution to at least 20% of the scams the rules left at
  Insufficient Evidence, with the 95% Wilson lower bound at least 10%. (Proposed.)
- **Threshold:** the lowest score cutoff that stays within the budget on the public **dev** split.
- **Model choice:** C from {0.1, 1, 10} by average precision on public dev. Nothing else is tuned.
- **One test run:** the public test split is scored once, after all of the above is fixed.
  `ml/compare.py` refuses a second run.

If any value changes after dev results are seen, the reason goes in this file, with the date.

## Data

- **Training and public evaluation:** Mishra & Soni (2022), *SMS Phishing Dataset for Machine Learning
  and Pattern Recognition*, Mendeley Data f45bkkt8pr, version 1, CC BY 4.0 (credit required; the
  dataset itself is not added to this repository). Labels: smishing → fraud, ham → legit.
  **Spam is dropped**: it mixes ads and scams, so it is neither label without reading every row.
- **Splits:** near-copies are grouped (same text after links → `<url>` and digits → `0`, or very similar
  wording), and whole groups go to train / dev / test, about 72 / 14 / 14, balanced by label, seed 42.
- **Workshop messages:** every one of them was already seen while fixing rules, so their results are
  **exploratory**, never an untouched test. They are reported separately from the public data.

### Known limits of the data

- Much of the legitimate data is older, informal UK texting. A model can learn "casual wording = safe,"
  which says little about a 2026 bank or pharmacy text. Results on the public data may not carry over.
- Smishing is a narrower target than all scams: no emails, no phone-call scripts.
- Grouping catches repeats and close rewordings, not every campaign that changes its wording.

## What gets reported

Each as count / total with a 95% Wilson interval, for public dev, workshop (exploratory) and public test:

1. Extra caution on scams the rules left at Insufficient Evidence
2. Wrong Details Match blocked (scams the rules gave Details Match)
3. Legitimate messages newly cautioned
4. Legitimate Details Match lost

An extra caution line is a measured output. It is **not** a measured safety gain: the Insufficient
Evidence screen already tells the person to check using details they had before the message.
Showing a behavior change would need its own usability test.

## Shipping rule

- **Criteria not met, or too little evidence:** the app stays rules-only. The experiment and its numbers
  go in the written answers.
- **Criteria met on the single test run:** port the model to JavaScript on this branch, with a test that
  Python and JavaScript give the same score and the same flag on the same messages, including messages
  right at the threshold. Label the build `v1.1-ml`. Claim only that **message checking runs in your
  browser**, and only after checking that no message text leaves the page.
