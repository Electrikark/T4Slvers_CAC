# Session safety repairs, 2026-10-21

Version 0.4.1 repairs bounded defects from the two source reviews. It does not
enable real contact reviews, organization policies, OCR, remote services or AI.
The existing page-copy edits and OCR preparation files were present before this
work and were preserved.

## Assessment and scope

| Review item | Decision and result |
| --- | --- |
| N01 Code exceptions | Fixed. An incidental driver or checkout cannot clear a request for a bank password or gift-card codes. Benign delivery, promo and household code handling is shared with the fallback warning. |
| N02 Pressure and callbacks | Fixed for the reviewed pairs. A deadline in the demand's clause survives neutral event words. A trusted-number exception must describe the number being called. |
| N03 False wording warnings | Fixed for the reviewed pairs. Negated credential advice and normal delivery-code handover stay quiet; new independent requests still warn. |
| N04 Policy uncertainty | Fixed. Applicable detected actions with missing context block a match and appear as an unresolved check. Unsupported actions are rejected. Irrelevant policies do not demand answers. |
| N05 Prior-contact exceptions | Fixed at the engine boundary. An exception requires a separately supplied boolean answer. Message text cannot establish user history. No context-question UI was added. |
| N06 Family advice | Fixed. A bank-like address inferred from a link cannot replace family verification. Explicit organization claims can still receive separate advice. |
| N07 Reference eligibility | Narrowed. Shared-platform paths are excluded as unsupported. Eligible explicit contact reviews supersede legacy pending notes. No tenant verification feature was added. |
| N08 CSV display handling | Hardened. Formula-like cells receive a display-only apostrophe. Exact analyzed text is retained in JSON. Actual spreadsheet-program interpretation remains unverified. |

Earlier-review repairs also account for attached email labels and unresolved
email-like tokens, retain distinct URL destinations through matching and
annotations, and enforce path-segment boundaries. A directory scope ending in
`/` does not authorize the slashless path. Family vocatives such as Grandma
and Grandpa now permit the reviewed gift-code instruction; arbitrary first-name
openers still need a separate design. Input-control borders were darkened.

## Policy context contract

Predicates use `{ name, mandatory, value }`, with boolean values. Exceptions use
`{ quote, answer: { name, value } }`; old text `cues` may be retained as notes
but are never treated as facts. `options.answers` supplies separate boolean
context. A missing or non-boolean answer remains unknown.

Known unrelated sender, service or channel stays out of scope. No detected
action stays quiet. An otherwise applicable action with unknown channel,
predicate or exception produces `policy.uncertainty`, which reaches the gate
and a visible `policy_unresolved` check. It cannot establish Suspicious alone.
The page does not yet collect these answers, so applicable unanswered policies
remain unresolved. The one real policy stays a draft.

The existing policy fixture now supplies `customer_called: false` for a known
violation and `true` for a known exception. Its expected violation did not change;
the fixture no longer treats the sender's statement as proof of prior contact.

## Evaluation and validation

Evaluation defaults to development rows and selects a split before analysis.
Empty selections are rejected; final test selections require both labels.
Related families, exposure history and a frozen evaluation date still require
a separate dataset protocol. No real corpus or unseen test set was evaluated.

Before engine changes, the 18 new regression groups passed 2/18; 16 failed.
After repair, all 18 pass alongside all earlier groups. Each group contains
explicit expected outcomes and paired controls. These are authored regressions,
not independently sampled messages or an accuracy estimate.

The full local suite passes on Node 26.11.1: 1,183 shared checks, 36 source-gate
parity checks, 2 source boundaries, 15 evaluation checks, and the app-element
contract covering 47 IDs. The browser suite also passes 1,183/1,183 in the
in-app browser. The real page was exercised with a gift-code request and a
family emergency containing a bank-like link: Suspicious, original-text marks,
heading focus and family-specific advice appeared. Back retained the input.

No physical-phone, screen-reader, real-message accuracy or spreadsheet-application
test was performed. Existing CI's Node 22/24 jobs still need their normal run.

## Remaining scope

Full original-text contact grounding and per-record provenance display remain
open. So do broad first-name instruction recognition, the wire-deposit notice
false warning, gift-card retailer-payment context, and educational messages
containing unsafe example URLs. Human reference review, dataset family isolation,
field usability evidence, release freeze and OCR readiness remain separate work.
