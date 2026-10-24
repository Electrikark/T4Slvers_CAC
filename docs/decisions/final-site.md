# Decision: the `final-site` integration

Status: **branch pushed for review as a draft pull request. Not merged into `main` and not deployed.**
Prepared Oct 23, 2026.

## Starting revision and sources

| Role | Branch | Commit |
| --- | --- | --- |
| **Start (base)** | `codex/tech4all-branding`: the Codex five-page site (home, check, recover, learn, about) | `522dfbc3dc84128faeaf940354811b3801a91f00` |
| Release work | `why-explanations` (contains `release-final` 7a4a8dd, `help-fixes` 87a989f, `ocr-robustness` 60eb4df with the line-wrap fix 22e18a2, `ml-experiment` 9915bab) | `a575ec5` |
| Deployment files | `main` | `3a7a013` |
| Rewrite robustness tool | recovered from the Oct 23 `adversarial-robustness.patch` (never pushed), committed on its base `ceb3194` | `a3dc171` |

`main` and the release branches hold the same work under rewritten histories. The merge of `main`
keeps `final-site`'s files and takes the only two things `main` adds, unchanged:
`.github/workflows/deploy-pages.yml` and the `test.yml` push trigger. Deployment works exactly as
before: Pages deploys only on a push to `main`. Pushing this branch deploys nothing.

### The rewrite tool was recovered, not rebuilt

The tool was never on GitHub. It was sent as a patch file from another chat. That chat's own record
of every file it wrote and edited was replayed in order on the patch's base commit. The result
matches the original in size (10 files, 1,128 lines) and reproduces every number that chat
published: 669/4000 fraud rewrites escaped (per seed 0.0–35.8%, median 22.0%, 7/8 seeds), 12/3477
legitimate false alarms, 0 reached Details Match, and a gate of 480 rewrites. The same numbers
reproduce on `final-site` before the courtesy-word fix, because the verdict-path code there differs
only in the reference list and the app name.

## Checkpoints

1. **Detection** ([polite-wording.md](polite-wording.md)). Engine 0.4.2. Courtesy words in front of
   an instruction now read as "please". Rewrite escapes fell from 669 to 469 of 4,000 with no new
   escape and the same 12 false alarms. Every remaining failure is listed and tracked, and messages
   used here are barred from the held-out test.
2. **User journey.** "Why this is a warning sign" sits directly under the Check result. Each reason
   quotes the words it is about, links to the numbered mark, and keeps the official quote and link.
   It is cleared on reset. The recovery page's topics are generated from `data/help-cards.js`
   ([script](../../scripts/build-recover.cjs)) and checked against it in `npm test`. They work
   without JavaScript, several can stay open, printing opens all of them, and the hand-written
   urgent box, hotline, printable plan and recovery-offer warning are kept. The name is
   Safety4Seniors throughout.
3. **Semantic search** ([help-search.md](help-search.md)) stays a separate experiment. The page uses
   keyword search (`SEARCH = 'keyword'`). Its freeze still holds (14 files and the card content
   unchanged), and the development scores reproduce on this branch: keyword 55/81 and 23/28, ML 59/81
   and 24/28. Nothing on the page depends on the model. It is offered as an opt-in "Try smarter
   search" button that downloads it only when pressed ([help-search-opt-in.md](help-search-opt-in.md)).

## Validation on this branch (local)

| Check | Result |
| --- | --- |
| `npm test` (page scripts, source gate, app elements, engine suite, evaluation harness, five-org review, OCR, help search, why, recovery page, rewrite gate, known rewrite failures) | pass |
| `npm run check:ocr-assets` | 21 files verified |
| Generated content: `build-assessment --check`, `build-recover --check` | match |
| Browser tests (Playwright, Chromium): keyboard skip link, 320/390/1280 px widths on all five pages, enlarged text, no JavaScript, search failure and a model that never loads, a newer search not replaced, reset, print | 32/32 |
| OCR benchmark rerun from scratch (`experiments/ocr-robustness`) | 5/500 screenshots lose Suspicious, all JPEG; 0 reach Details Match. Same as published |
| Rewrite run at the published settings | 469/4000 escapes, 12/3477 false alarms, 0 Details Match |

Local checks, remote CI and deployment are separate states. This table is the local state only.
The pull request's CI run is reported on the pull request. Nothing here is deployed.

## What these checks do not show

- A page-matches-data test shows that the page says what the data says. It does not show the
  advice is right. The help cards and the "why" quotes are still drafts (`approvedBy: null`) until
  a person checks each one against its source.
- Automated checks do not show that seniors can use the pages. That needs people using them.
- Rewrite rates are counts over generated rewordings of 8 seed messages. They are not accuracy and
  not a detection rate.
