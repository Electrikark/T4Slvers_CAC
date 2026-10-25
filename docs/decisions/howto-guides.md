# Decision: how-to guides for getting a message into the checker

Date: 2026-10-24. Status: built and tested in a desktop browser; phone steps not yet checked on a phone.

## The problem

A person can recognise a worrying message and still be unable to get it into the checker:
copying from Messages, pasting into a browser, taking and choosing a screenshot, and checking what
was read from a picture are separate skills. Whether this is the main barrier for our users has not
been measured. The pilot notes record that two of nine people asked for help, not what for.

## What was built

| Part | Where | What it does |
|---|---|---|
| Guide data | `data/how-to.js` | One source for every guide, step and picture |
| Generator | `scripts/build-howto.cjs` | Writes `help.html` and the help beside the box on `check.html`; `--check` runs in `npm test` |
| Full guides | `help.html` ("How to use" in the navigation) | Copy a text, copy an email, paste, take a screenshot, choose a screenshot, check the words read from a screenshot, practice |
| Help beside the box | `check.html`, `#help-paste` and `#help-screenshot` | The same steps, opened in place, so the message and the channel choice stay as they are |
| Pictures of our screens | `assets/how-to/review-*.png`, made by `scripts/capture-howto.cjs` | Taken from the real check page after the real reader reads the practice picture |
| Practice | `help.html#practice`, `js/howto.js` | Copy and paste into a practice box that says whether the whole message arrived; a practice screenshot to save and choose in the real checker; a link that loads a made-up example |
| Example loader | `js/app.js`, `#example-confirm` | Asks before an example replaces the person's own words |

## Rules the build enforces

1. **A phone guide says "Not yet checked on a phone" until a complete record exists.** A record
   needs who, when, which phone, which system version and which app. A missing field, a placeholder
   name, a future or impossible date, or a different app stops the build rather than showing the
   guide as checked. A record describes one phone; the page says so ("Checked on one …. Other phones
   and versions may look different.").
2. **Pictures of a phone's own screens appear only for a checked device.** A drawing or a picture
   from the web of a menu we have not seen would teach a menu that may not exist.
3. **Every button or label a guide quotes must be on `check.html`.** The generated help is removed
   before this comparison. The first version did not do this, and a sabotage test showed that the
   guide's own quoted text was vouching for a button that had been deleted.
4. **The screenshot guide agrees with the code.** A test reads `js/ocr-ui.js` and
   `js/engine/aggregate.js` to confirm what the guide promises: Check stays locked until the review
   box is ticked, editing unticks it, and screenshot text cannot reach Details Match.

## What changed in page code, and what was checked because of it

No engine file changed. Page code did change (`js/app.js`, `check.html`), and page code decides
what text reaches the engine, so a page-only change can still change a result. Checked in a real
browser:

- Opening and closing both help panels leaves the message, the channel choice and the full result
  text identical to the same check without them.
- Opening the screenshot help during review does not tick the review box or unlock Check.
- The practice picture goes through the real reader, the guide's instruction (delete the extra
  lines) is followed, and the result is the same warning as for the typed message.
- The example loader no longer replaces the person's words without asking. Breaking the guard on
  purpose makes the test fail.

## What practice does and does not show

The copy-and-paste practice copies from a web page, which is not the same action as copying from
Messages or Mail. It rehearses pressing, holding and pasting, and checking that the whole message
arrived. It does not show that someone can move between their messaging app and the browser, and the
page says this. "Open a made-up example in the checker" fills the box for the reader, so it shows a
result but is not copy practice; the page says that too.

## Not done

- No step in a phone's own app has been followed on a phone. 0 of 13 device guides are checked.
- No pictures of phone screens.
- Samsung Messages steps are not written.
- No test with older adults. A family phone check verifies the steps on that phone only.
