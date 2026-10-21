# Field evaluation

The unit tests check that each rule does what it was written to do. They cannot say how often the app catches **real** fraud or how often it raises a **false alarm** on real, honest messages. This folder measures that.

## 1. Collect messages

Copy the template and fill it in (Google Sheets or Excel work; export as CSV):

```sh
cp eval/messages.template.csv eval/data/messages.csv
```

| Column | Required | What goes in it |
| --- | --- | --- |
| `id` | yes | Any unique name, e.g. `ftc-toll-03`, `mom-bank-2026-09` |
| `label` | yes | `fraud` or `legit` — what the message **really** is, from its source, never from the app's answer |
| `channel` | yes | `text`, `email` or `unknown` |
| `source` | yes | Where it came from: a page URL, or e.g. "my grandmother's phone, shared with permission" |
| `category` | no | e.g. `gift_card`, `toll`, `bank_login`, `delivery`, `tech_support`, `family`, `code`, `appointment` |
| `collected` | no | Date you collected it |
| `split` | no | `dev` or `test`. Leave empty and about 30% go to `test` automatically, based on the id |
| `notes` | no | Anything useful |
| `text` | yes | The message exactly as received. Put it in quotes if it has commas or line breaks |

Rows whose `source` starts with "FICTIONAL" are skipped, so the template's examples never count.

**Aim for at least 100 fraud and 100 legitimate messages**, spread across categories. Fewer still works, but the 95% ranges in the report will be wide.

### Where to find them

- **Fraud:** example texts and emails published by the FTC (consumer.ftc.gov), USPS, the IRS, banks' own "recognize fraud" pages, state attorneys general and AARP's Fraud Watch Network; real fraud messages your family received.
- **Legitimate:** your family's real bank alerts, delivery updates, one-time-code texts, appointment reminders, pharmacy notices and account emails. These matter as much as fraud: without them you cannot measure false alarms.

### Rules that keep the result honest

1. **Label from the source, not from the app.** If you are unsure whether a message is real, leave it out.
2. **Redact private details** (names, account numbers, addresses) but keep the sender's links, email addresses and phone numbers, because the app checks those. Replace a name with another name, not with `XXX`, so sentences still read normally.
3. **Do not change rules while looking at `test` results.** Tune on `dev`, then run `test` once and report that number. Looking at test results while changing rules makes the number meaningless.
4. **Keep every message**, including the ones the app gets wrong. Removing hard cases inflates the score.

## 2. Run it

```sh
npm run eval
npm run eval -- --split test        # only the test split
npm run eval -- --strict            # exit 1 if any fraud message gets Details Match
```

It writes `eval/results/report.md` and `eval/results/results.csv` (one row per message with its result).

## 3. Read the report

- **Fraud given Details Match** is false reassurance, the worst possible outcome. It must be 0.
- **Fraud labeled Suspicious** is the catch rate. **Fraud that at least said "pause"** also counts Insufficient Evidence, which still tells the person to stop and check.
- **Legitimate labeled Suspicious** is the false alarm rate.
- **Legitimate labeled Suspicious or shown a strong warning** also counts honest messages that got the page's "Warning signs in what it asks" line without the Suspicious label. That line still alarms the reader, so report it next to the false alarm rate. The report lists each of these messages.
- **"At least said pause"** counts Insufficient Evidence, which every message gets until records are reviewed, so it is close to 100% by design. Don't present it as a catch rate.
- **Legitimate reaching Details Match** stays at 0% until records in `data/store.js` are human-reviewed; the report says so.
- Each rate has a **95% range**. With 100 messages, a measured 90% can really be anywhere from about 83% to 94%. Quote the range, not only the percentage.

## Privacy

`eval/data/` and `eval/results/` are ignored by git, so real messages are not uploaded by accident. If you build a dataset only from **public** sources and want to publish it, add it deliberately with `git add -f`.
