# Reviewed-only website advice

## Bug and rule

Contact matching used `ctx.trusted`, but next-step advice selected
`org.officialDomains[0]` from the raw store. That could recommend an unreviewed,
rejected, expired or conflicting website, or print `undefined` when none existed.

**Next steps only use reviewed, unexpired, non-conflicting records.**
`trustedDomain(ctx, org)` selects a domain record for the claimed or implicit
organization from the existing trusted view. That view also excludes incomplete
reviews and ambiguous scopes. Advice never falls back to raw domain entries.
Exact-host records retain their exact host. A record restricted to a particular
path is skipped: typing its bare domain would exceed the reviewed scope.

If no eligible website exists, the website line is:

> If you need their website, type a website address you already know, or use their official app.

The existing “card, bill or statement” line is unchanged. The choice of reviewed
website is independent of the verdict: a scam can copy a real address, so its
Suspicious verdict remains while independently reviewed contact advice is shown.

## Implementation

```js
function trustedDomain(ctx, org) {
  const record = ctx.trusted && ctx.trusted.trusted.find(r =>
    r.orgId === org.id && r.kind === 'domain' && typeof r.value === 'string' && r.value.trim() &&
    (!r.scope.pathPrefix || r.scope.pathPrefix === '/'));
  return record ? record.value : null;
}
```

Inside `nextSteps()`, after the unchanged trusted-number line:

```js
const domain = trustedDomain(ctx, org);
steps.push(domain
  ? `If you need their website, type ${domain} yourself instead of tapping a link.`
  : 'If you need their website, type a website address you already know, or use their official app.');
```

## Tests and expectation changes

[The complete NS1–NS8 suite](../../tests/next-steps-cases.js) runs in both the
Node and browser runners, with a frozen evaluation date of **2026-10-12**.
Expectations were written before the fix. The initial run passed 1/8 (NS7);
NS1–6 and NS8 failed. The final run passes 8/8.

| Case | Expected advice and additional controls |
| --- | --- |
| NS1 | Fallback for absent, draft or incomplete records, even when the raw store names chase.com. |
| NS2 | Type chase.com for an approved record; ignore raw-list order, other organizations and phone records; preserve exact-host scope. |
| NS3 | Fallback for a rejected record. |
| NS4 | Fallback for an expired record; a record due today is still usable. |
| NS5 | Fallback when domains are absent/empty, only a phone is reviewed, or a review covers only a path. |
| NS6 | Fallback when two reviewed organizations claim the same site. |
| NS7 | Type the reviewed chase.com even when a gift-card demand remains Suspicious. |
| NS8 | No `undefined` or `null` in advice across record states, missing sites, unknown/implicit senders and the real store. |

**Modified legacy tests: none.** All existing expectations already passed with
the real store marked as awaiting human review. No record was marked reviewed
to preserve an old result. New real-store assertions prohibit specific website
recommendations until the records pass human review.

Validation: 1,138/1,138 shared checks on Node 22, Node 24 and Chromium; 36/36
source-gate parity checks, 2/2 boundaries and 12/12 evaluation checks. This branch
starts at release-v1 `24ec488`; the separate Tier 2 warning branch is not included
in this count. No existing detection or verdict expectations changed.

## Remaining gaps

The real contact list still needs human reviewers. Path-specific route advice
is not implemented, so those records use the fallback. Where several eligible
websites exist, advice uses the first in trusted-record order; it does not rank
routes by service. The checker does not inspect live pages or redirects, and a
reviewed contact never proves the sender's identity.

## Execution checklist

- [x] Write NS1–NS8 and register the file in both runners.
- [x] Confirm the failures before changing advice generation.
- [x] Select domains only from the trusted view; preserve the trusted-number line.
- [x] Verify missing values never reach next-step text.
- [x] Check existing expectations; document that none needed modification.
- [x] Pass the full Node and browser suites.
