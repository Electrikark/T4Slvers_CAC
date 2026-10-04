# Tech for Silvers

A web app that helps seniors take a second look at a suspicious message before they act on it.

Pasted messages now run through a real engine on the device. It compares the links, email addresses and phone numbers in a message with official addresses for 46 organizations, and separately lists what the message asks for (gift cards, codes, secrecy and so on). Nothing is sent anywhere. The screenshot example is still scripted, because the app does not read images yet.

## Run

Open `index.html` in a browser, or run `python3 -m http.server 8000` here and visit http://localhost:8000. Open `tests/run.html` to run the tests. Today it shows 20 of 20 spec cases, 16 of 16 real-list checks and 9 of 9 invariants passing.

## Files added or changed

| File | What it does |
| --- | --- |
| `js/engine/normalize.js` | Cleans text: Unicode normalization, invisible characters, defanged links, 20,000-character cap |
| `js/engine/extract.js` | Finds links, email addresses and US phone numbers; finds who the message claims to be |
| `js/engine/domain.js` | The link rule table: shorteners, the @ trick, official domains, lookalikes (homoglyphs, typos, brand names inside other sites) |
| `js/engine/risk.js` | Request signals: 15 patterns such as gift cards, sharing a code, remote access, secrecy |
| `js/engine/aggregate.js` | Turns checks into one state and exposes `window.TfsEngine.analyze(text, store)` |
| `js/engine/copy.js` | Every sentence the engine shows, in plain language |
| `data/store.js` | The reference list: 46 organizations, 61 official domains, with how each one was checked |
| `tests/real-store-cases.js` | 16 checks against the real list, including false-alarm guards |
| `js/app.js`, `js/mockData.js`, `index.html`, `css/styles.css` | App wired to the engine; 8 workshop examples; honest wording; a "What this message asks for" section |

## What needs your review

1. **Five domains** refused the automated check (pnc.com, golden1.com, bestbuy.com, geeksquad.com, dhl.com). They are well-known addresses, but open each one yourself and update its `check` field in `data/store.js`.
2. **Phone numbers are empty on purpose.** A number should only go in after a person copies it from the organization's own contact page. Until then, phone checks return "not on our list", which never produces a mismatch.
3. **The organization list.** I picked banks, payment apps, delivery companies, government offices, tolls and local utilities (SMUD, PG&E, Golden 1, FasTrak, California DMV and EDD) that seniors in Northern California are likely to see. Ask your workshop participants which names show up in their messages and adjust.

## Where this version differs from spec v1

- `officialDomains` match by host ending, so a state agency like `dmv.ca.gov` works without trusting all of `ca.gov`.
- `strictAliases` only count when capitalized, so "apple pie" is not a claim from Apple and "contact us" is not U.S. Bank.
- A name only counts as the sender near the start of a message, as a label ("Chase:", "Chase alert"), or after "from" or "this is". Without that rule, "send it by Zelle" made Zelle the sender.
- Added rules and codes: `same_label_other_tld` (chase.net), `free_email_address` (anyone@gmail.com never counts as a match), lookalike digits inside brand names (amaz0n-secure.com).
- Added request signals: `device_alarm` and `family_emergency` (the grandparent scam).

## Known limits

- The list only knows 46 organizations. Most real messages from anyone else will come back "not enough evidence", which is honest but not very helpful. Measuring how often that happens is the next job (see the evaluation plan in the spec).
- Short links (bit.ly and others) cannot be followed without opening them, so they always come back unknown.
- Endings like `.co.uk` use a trimmed list, not the full Public Suffix List.
- Request signals are English patterns. They quote the words they reacted to, but they will miss scams that use other phrasing, and they sometimes fire on honest alerts that also say "account locked".
