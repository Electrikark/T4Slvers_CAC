# Next task: grandparent instruction openers

Update, 2026-10-21: the bounded Grandma/Grandpa instruction and gift-code link
now pass `FIX18` in `tests/repair-cases.js`, with negated and reported controls.
Arbitrary first-name openers are still outside that repair. The diagnostic JSON
below is retained as historical before-repair evidence, not current execution.

Priority: follow the Tier 2 wording repair. This is an existing detection gap,
not implemented as part of that repair.

Reproduction: “Grandma, buy me gift cards for my birthday and text me the codes”.
With no reference record, the current engine returns no findings and Insufficient
Evidence. The required outcome is a gift-card finding and Suspicious: purchasing
cards and sending their codes describes one transaction. An approved contact
must never make this demand Details Match.

The initial recognition gap is `directAction`: the address “Grandma,” prevents
“buy” from being recognized as an instruction. After recognizing the opener,
also verify the recipient “me” and the link from “codes” to the gift cards.
Do not assume that recognizing the opener alone fixes the whole transaction.

Before implementation, write 3–5 variants with expectations decided by hand:
vary Grandma/Grandpa, an addressed first name, buy/purchase, and a line break
after the address. Include negated requests, reported scam examples and ordinary
family messages as quiet controls. Do not treat every comma as a new imperative.

- [ ] Write variants and quiet controls; save all initial failures.
- [ ] Recognize addressed instructions without bypassing negation or reporting.
- [ ] Verify the gift-card antecedent and disclosure source spans.
- [ ] Test both absent and approved contact records.
- [ ] Run shared, parity, boundary and evaluation suites; document residual gaps.

The exact observed miss is recorded in
[the open diagnostics](reporting-scope-results/tier2-review-known-gaps.json).
