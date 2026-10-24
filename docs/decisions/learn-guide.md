# Decision: a scam guide and a practice round on Learn the signs

Status: **done, Oct 24, 2026. Chosen by Naman.** Waiting for a person
to check every step against its source (`approvedBy: null` in `data/scam-guide.js`).

## Who it is for

One older adult, reading alone, often with no one nearby to ask. Not a group or a workshop,
and not mainly a family helper. That shapes every choice below:

- **One thing at a time.** The practice shows one message, two large choices, then what to
  notice. The guide is a list of closed sections; the reader opens only the one they need.
- **No score, no "wrong".** Calling a scam ordinary gets "This one is easy to miss. That is what it
  is made for." Pausing on an ordinary message gets "Pausing is never wrong." The reader can also
  open the answer without choosing.
- **Nothing saved.** The page says so, and `js/learn.js` uses no storage and sends nothing
  (checked by `tests/learn-node.cjs` and the browser test).
- **No one to ask.** Several warning signs say "ask someone you trust". A note at the end gives
  the National Elder Fraud Hotline for someone who has no one to ask, with the same number,
  hours and wording as the recovery page.
- **Kind wording.** "Scammers are skilled at this. Being fooled says nothing about you." The
  romance scam is described as a friendship that turns into a request for money, because a
  lonely reader is the one it is aimed at.

This is the "three short practice lessons" row of the plan in
[senior-site.md](senior-site.md), widened to six practice messages and nine scams.

## What changed

- **Practice: "Would you pause for this one?"** Six made-up messages: four scams (grandchild,
  fake Amazon charge, Medicare, a friend met online) and two ordinary ones (a doctor's reminder,
  a daughter running late). After a choice: the reader's feedback, whether it is a scam, the
  words to notice (highlighted in the message only once the answer is open), and one thing to do.
- **Scam guide: "Common scams, one at a time."** Nine scams: a relative in trouble, gift cards,
  "read me the code", computer help you did not ask for, "your account is locked", an unpaid
  toll or fee, a call from "the government", "you won, just pay a fee", and a new friend online
  who needs money. Each has a made-up example, why it works, the warning signs it uses (linked to
  the four signs), what to do with sources, **Try this message in the checker**, and **If this
  already happened to you** (the matching topic on the recovery page).
- **One data file, generated page.** `data/scam-guide.js` holds the guide and the practice.
  `scripts/build-learn.cjs` writes them into `learn.html` between marker comments, the same way
  `build-recover.cjs` writes the recovery topics; `npm test` fails if the page and the data
  differ. Everything is plain HTML, so all of it reads without JavaScript; `js/learn.js` only
  hides the other messages and adds the choices.
- **Checker links.** `check.html?example=<id>` now loads any guide example, not only the
  grandchild one. Only these fixed messages can be loaded, so no message text travels in a URL,
  and loading one still neither chooses the channel nor runs the check. The old
  `?example=family` link loads the same message as before.
- The old single practice panel and the "Helping a friend or family member?" note are replaced.
- New source: [FTC: What To Know About Romance Scams](https://consumer.ftc.gov/articles/what-know-about-romance-scams).
  The others were already used by the why explanations and the recovery page.

## Checks tied to the checker

- Every guide example gets a warning from the checker on the channel it names (all nine are
  Suspicious today). A guide that says "this is a scam" must not send the reader to a checker that
  says nothing.
- An ordinary practice message must get no warning from the checker either.
- The scam practice messages are not required to be caught by the checker, because practice
  teaches the reader's own judgment. Two of them are not caught today, which is a detection gap to
  look at separately, not something this page changes:
  - "Reply with your Medicare number and date of birth" (no warning).
  - "Please buy $500 in Apple gift cards and send me the codes" is caught, but the softer
    "Could you send $500 in Apple gift cards?" is not.

## What this does not change

No detection rules, reference records or result wording. No accounts, storage, analytics or new
dependencies. The advice is the project's wording based on the cited pages; it is a draft until a
person checks it, and the page says so.

## Validation

- `npm test`, including `scripts/build-learn.cjs --check` and `tests/learn-node.cjs`.
- `npm run test:ocr-browser`, including `tests/ocr-browser/learn.spec.cjs`: one message at a time,
  feedback and focus, starting again, no storage or outside requests, a guide example loading into
  the checker and getting Suspicious, every guide link target, and the page without JavaScript.

Not established here: whether an older adult reading alone finds this easier or remembers the
safer action. Try it with one before claiming that.
