# Decision: "I already did something" help, and whether search uses ML

Status: **draft, written before any test result was seen.** Prepared Oct 22, 2026.

## The feature

A person who already acted on a scam (read out a code, bought gift cards, sent money, let someone
onto their computer) gets the official recovery steps for that situation. Content is in
`data/help-cards.js`: 6 topics, with "I sent money or paid" split into 6 payment methods because the
FTC's steps differ by method. Every step cites its official page, or is marked as Tech for Silvers
advice when no official page says it directly. The cards show a draft notice until a person has
checked every step against its source (`approvedBy`).

**The menu is the feature.** Every topic is always one tap away, with no download. Search only
suggests topics; it never opens one by itself, and a weak match suggests nothing.

## Three ways to find a card

| | What it reads | Download |
| --- | --- | --- |
| Menu | The topic titles | none |
| Keyword search | Each card's title and example descriptions, plus a fixed synonym list | none |
| ML search (hybrid) | The same titles and examples, as all-MiniLM-L6-v2 sentence embeddings, plus the keyword score | about 49 MB when the search box is first selected; it is not saved in the browser, so it downloads again on each visit. Until it has loaded, the page answers with keyword search |

Both searches read the same content, so the comparison tests the method, not the content.

## Development and test are kept apart

- **Development:** the example descriptions in `data/help-cards.js` and the challenge set in
  `experiments/help-search/dev-challenge.json` (negations, two incidents in one description,
  ambiguous wording, situations no card covers). Thresholds and synonyms are tuned on these only.
- **Freeze:** after tuning, these are frozen, with fingerprints in `experiments/help-search/freeze.json`:
  `js/help-search.js` (settings, synonyms, the "nothing handed over" rule), the scorer and ship rule
  (`experiments/help-search/evaluate.cjs`), this document, every model and runtime file in
  `vendor/minilm/`, and what search reads from the cards (ids, titles and examples). Step wording is
  not part of the freeze, so the cards can still be approved or corrected.
- **Tuning result (development only):** the ML candidate is a hybrid. The embedding similarity decides
  whether a card matches at all (at least 0.45), and matching cards are ranked by 0.6 x similarity +
  0.4 x the keyword score (scaled to the best card). Keyword search needs a score of at least 2. Both
  methods put "Something else, or I am not sure" first only when the description says nothing was
  handed over ("they asked for my code but I did not give it"). If anything was handed over anywhere in
  the sentence ("I gave them my password but did not send money"), suggestions are left alone.
  Development results are in `experiments/help-search/out/dev-report.md` (rerun after the Oct 22
  fixes). The keyword synonym list was written while looking at the same examples, so development
  favors keyword; only the volunteer test counts.
- **Test:** volunteers who have not seen the cards each write 10–15 descriptions of something a
  senior might have done after a scam. The test refuses to run unless at least 5 descriptions have no
  fitting card and at least 5 describe two or more incidents, so neither condition passes by default. A separate person, who sees neither search's results, marks
  the acceptable card or cards for each description (more than one for a two-incident description;
  "none" when no card fits). The test runs once; the script refuses a second run.

## What is measured

On the volunteer descriptions, for keyword and ML search:

1. **First suggestion correct**: the first suggestion is an acceptable card. The "I sent money or
   paid" topic and its payment-method cards count for each other, because they are one tap apart.
2. **All relevant topics in the 3 suggestions**: for two-incident descriptions.
3. **No-fit handled**: for descriptions marked "none", no confident wrong suggestion.
4. **Paired counts**: descriptions where ML was right and keyword wrong, and the reverse.

Also: model load time, first and later search time, and that the menu works while the model loads or
if it fails.

## Decision rule (fixed now)

ML search ships as the page's search only if, on the volunteer test:

- it gets the first suggestion right on **at least 5 more descriptions** than keyword search (paired
  count: ML-only wins minus keyword-only wins ≥ 5), **and**
- it does not give a confident wrong suggestion on more "none" descriptions than keyword search, **and**
- on descriptions with two or more incidents, it covers every incident in its 3 suggestions at least as
  often as keyword search.

The page's search method is the `SEARCH` constant in `js/help-ui.js`, `'keyword'` until then.

Otherwise keyword search ships (or no search, if neither beats the menu on the usability check).
Either way the result is reported with counts.

## Usability check (separate)

Two or three volunteers, ideally seniors from the workshops, each try 3 short tasks ("You read a code
to a caller. Find what to do.") with the menu only, then with search. Note the time taken and whether
they reached the right card. This is a small prototype check, not an accessibility study.

## Limits

- Volunteer descriptions are an independent challenge set, not evidence of senior usability.
- The search can be wrong; the person always chooses the topic, and the menu is always available.
- A description like "I gave them the number" is genuinely ambiguous. The search may suggest more
  than one topic; it cannot know which number was meant.
