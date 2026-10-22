# Evaluation setup and failure analysis

1. Check `git check-ignore -v eval/data/dev_messages.csv` and `git ls-files -- eval/data/dev_messages.csv`. The first must show an ignore rule; the second must print nothing. Never force-add private datasets or derived outputs.

2. Use the revised header order: `id,group_id,split,label,expected_findings,category,channel,source,text`. Label from known origin. Remove private details. Use `sms`, `email`, or `unknown`; `volunteer_shared`, `public_example`, or `synthetic` for source. Synthetic rows are practice cases. They do not establish field accuracy.

3. Write expected codes before any app run. Fraud needs one or more space-separated Tier 1 codes. Legit uses `none`. Use only `T1-GIFT`, `T1-CODE`, `T1-WIRE`, `T1-REMOTE`, `T1-CALLBACK`, `T1-DOMAIN`, and `T1-POLICY`. A code needs the facts that define it; a fraud label alone does not justify inventing a reason.

4. Group related campaign or template variants together before splitting. On the full dataset, sort by category then group. Assign groups dev, dev, test, repeating within each category. Do not recount after exporting dev-only rows. A group must stay in one category and split. Reject blank splits, duplicate IDs, duplicate normalized texts, invalid fields, and missing expectations.

5. Pivot group against split using row counts. No group may appear in both columns. Check at least five fraud and five legit test rows. Lock the full dataset before tuning, save its hash, and preserve test rows. The existing lock uses the earlier eleven-column format and remains unchanged. Keep an independent real holdout unread until October 19, 2026. The synthetic scenarios authored here cannot serve as that blind holdout.

6. Run `npm run eval -- --split dev`. The reader chooses `dev_messages.csv` when present, maps `sms` to the engine's `text`, and treats `none` as no expected finding. It filters before analysis. Do not use `sh npm run eval`.

7. Match results to source by unique ID. In the revised messages sheet, expected codes are column 5 and group is column 2. Use exact VLOOKUP: `=VLOOKUP(A2,messages!$A$2:$I$33,5,FALSE)` and `=VLOOKUP(A2,messages!$A$2:$I$33,2,FALSE)`. The earlier column-9 formula belongs to the old layout.

8. Apply A–E in order. For C, test every expected code. Give each failure one root tag and one sentence. Keep IDs and descriptions in the analysis file, with no message text. Fix the most frequent cause, add positive and negative controls, rerun dev, and log gains plus unresolved failures. Preserve the original baseline and locked test file.
