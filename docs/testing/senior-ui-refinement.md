# Local senior UI refinement

This pass builds on the existing simplified pages and tutorial drawings. It is local only.

- All six pages keep Check and Get help visible. Menu expands secondary destinations in the page flow, works without scripts, and supports keyboard use.
- Home names the task before its supporting copy. The main action precedes privacy and limitation notes.
- Check has a shorter introduction, a single reading column, full-size essential instructions, and the existing text/screenshot guide disclosure. Input IDs, source tracking, screenshot comparison and engine order remain intact.
- Warning results lead with a supported protective action. The sender-verification and missed-scam warning stays visible. Further verification gaps are in a labelled disclosure that resets for each check. All protective action groups remain available.
- Forest, paper and text colors return to the requested identity. Pale panels from the local palette pass remain. Serif is limited to display headings; task labels are upright. Root text uses relative sizing.
- Draft-review labels remain accurate. This UI pass does not verify contact records or establish readiness for real-world reliance.
- No Netlify badge code or configuration was found in the repo. No hosting settings were changed.

## Measured local layout

Chromium, 390 × 844 CSS pixels, default text size, menu and guide closed:

| Item | Position or size |
| --- | --- |
| Header height | 133px |
| Home main action top | 408px |
| Message field top | 460px |
| Submit button top | 1002px |

These are current measurements, not a reproduction of the older captures. Full-page screenshots and a layout report are in `test-results/ui-pass/task-first-*`. The six pages were captured at 320, 390, 768 and 1280px and checked with 18px and 36px root text. No horizontal overflow was found. This is not a complete browser zoom or assistive-technology audit.

## Color and access checks

Rendered selected-control text and border: 10.46:1 against its fill; message-field border: 3.66:1 against white; primary-button text: 11.62:1. Browser tests cover representative body text, action labels, and amber warnings against their rendered backgrounds. Tests also cover menu keyboard use, no-script navigation, early task access and 48px standalone controls.

Reference: [W3C WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/). The 48px design target is intentional, not a claim about the AA minimum or full conformance.

The how-to review pictures were regenerated through the real screenshot reader. No held-out evaluation was run. Engine and reference-store files were not edited.

Validation completed: `npm test`, `npm run check:ocr-assets` (21 assets), and all 64 browser tests passed. Changes remain local; no branch push, PR update or deployment was performed.

## Family-review pass

The action panel and adjacent three-step guide restore visual grouping on Home; they stack on phones. Free use is emphasized. The supplied Tech4Silvers workshop URL is linked from each footer, without copying photos or attributing the brother's work to Naman.

Warning-sign results now have an explicit presentation flag, amber styling and a warning symbol even with an insufficient-evidence assessment. A visible first step says not to click, reply or call a number in the message. Specific supported actions and reasons remain visible. Sender identity is still explicitly unverified; the separate limitations explain missed scams. Detection and evidence rules are unchanged.

Government impersonation is first in the scam guide, and the existing Medicare practice example now precedes the family example. Examples and their safety claims were not changed. Visible text on the six default pages is at least 16px with default settings; relative sizing and enlargement remain supported. Local SVG symbols label the hero, warning signs and recovery choices. Tutorial review images open at full size in a new tab; a visible link provides the same action.

Final default-size 390px measurements supersede the table above: header 133px; Home action top 435px; message field top 529px. The upload button triggers the browser file-chooser event in the added test. This does not establish behavior on a physical iPhone or Android. Print tests exercise the print hooks; physical-device printing and all human-review records remain unverified. No photos, remote assets, deployment changes or branch pushes were added.

Family-pass validation: app tests and OCR assets passed; the full browser suite passed 67 tests. The four Learn tests passed again after the final practice reorder. The local Home returned HTTP 200. All changes remain local for review.

## Linked message highlights

Results now lead with the warning and protective action, followed by the original message with exact matched phrases highlighted. Selecting a phrase opens its linked explanation and focuses its heading; a return button restores focus to the phrase. Overlapping reasons open together. Unmarked text is not presented as proof of safety. Contact-list matches and unverified contact gaps are not painted as warning phrases. The existing annotation model supplies spans and fixed explanations; engine rules are unchanged.

Validation: npm test and OCR asset verification passed; all 69 browser tests passed. After a reset-event guard, npm test and all nine result-view tests passed again. Tests cover exact text preservation, markup remaining inert, linked keyboard navigation, reset behavior, and enlarged text at 320/390/1280px. The final transparent section styling was visually reviewed in the local browser. No physical-phone test, held-out evaluation, push or deployment was performed.
