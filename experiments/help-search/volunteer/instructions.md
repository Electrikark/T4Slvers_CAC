# Volunteer descriptions (for the help-search test)

**For each volunteer.** Please don't look at the app's help topics first.

Imagine you are helping an older relative who has just been scammed, or nearly scammed. Write
10 to 15 short descriptions of **what they might type** to get help, in their own words. One line each.

Mix these in:
- things they did (shared a code, paid, let someone onto the computer, gave personal details)
- more than one thing at once ("they got on my computer and I sent money")
- things that did *not* happen ("they asked for my PIN but I hung up")
- vague ones ("I did what the text said")
- a few that have nothing to do with scams ("how do I make the letters bigger")

Write them in `descriptions.csv` with columns `id,volunteer,text` (ids like `v1-01`, `v1-02`).
Spelling mistakes are fine; keep them.

# Labeling (a different person)

The labeler sees only `descriptions.csv`, never the search results. For each id, fill `labels.csv`:
`id,accept,all`

- `accept`: every acceptable card id, separated by spaces, or `none` if no card fits.
  Card ids: `code`, `remote`, `giftcard`, `money`, `money-bank`, `money-app`, `money-wire`,
  `money-credit`, `money-crypto`, `money-cash`, `identity`, `other`.
  Use `other` when nothing was actually handed over, or the person is unsure.
- `all`: `yes` if the description has two or more incidents and every listed card is needed.

# Running the test (once)

```sh
node experiments/help-search/evaluate.cjs test --descriptions experiments/help-search/volunteer/descriptions.csv --labels experiments/help-search/volunteer/labels.csv
```
It refuses to run if the search or the cards' titles and examples changed since the freeze, and
it runs only once. The result says which search ships.
