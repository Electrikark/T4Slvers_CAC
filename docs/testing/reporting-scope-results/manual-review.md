# Manual template review

Sample: 20 rows selected without replacement using Python `random.Random(20261012)`.

Initially reviewed the literal text before engine changes, then re-read the same 20 sampled rows after correcting template spacing. The initial review missed an ambiguity: adjacent words such as `today.Beware` and `warning.Fraudsters` were read as bare domains. Each template now supplies a space after `{B}`, while the wrap boundary remains exactly `B = "."`. Expected values did not change.

In the corrected rows, the named asker, family action and timing retain their meaning. Line wrapping occurs between the asking complement and its action; it does not create a new instruction. Reviewed the literal LF and CRLF escapes as well as ordinary punctuation. Repeated spaces after some boundaries do not change the reading.

| Row | Review |
| --- | --- |
| RD-GC-blank-none | Fraudsters remain the asking subject; timing is inside that report. |
| WF-GC-semi-none | The sender still makes the demand; the warning does not govern it. |
| WF-CD-dot-approved | The sender still makes the demand; the warning does not govern it. |
| WF-GC-dot-none | The sender still makes the demand; the warning does not govern it. |
| WF-GC-wrap-crlf-none | The sender still makes the demand; the warning does not govern it. |
| RD-RA-wrap-crlf-approved | Fraudsters remain the asking subject; timing is inside that report. |
| RD-RA-colon-approved | Fraudsters remain the asking subject; timing is inside that report. |
| TW-WT-colon-none | The sender still makes the demand; the warning does not govern it. |
| WF-CD-excl-approved | The sender still makes the demand; the warning does not govern it. |
| PC-GC-blank-approved | The sender still makes the demand; the warning does not govern it. |
| RD-GC-dash-approved | Fraudsters remain the asking subject; timing is inside that report. |
| WF-RA-lf-approved | The sender still makes the demand; the warning does not govern it. |
| PC-GC-wrap-lf-approved | The sender still makes the demand; the warning does not govern it. |
| RD-RA-wrap-lf-none | Fraudsters remain the asking subject; timing is inside that report. |
| RD-RA-wrap-crlf-none | Fraudsters remain the asking subject; timing is inside that report. |
| PC-GC-wrap-crlf-approved | The sender still makes the demand; the warning does not govern it. |
| WF-CD-lf-none | The sender still makes the demand; the warning does not govern it. |
| TW-GC-wrap-crlf-none | The sender still makes the demand; the warning does not govern it. |
| RD-RA-lf-approved | Fraudsters remain the asking subject; timing is inside that report. |
| TW-CD-wrap-crlf-approved | The sender still makes the demand; the warning does not govern it. |
