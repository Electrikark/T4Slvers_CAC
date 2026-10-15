/* Organization policy records for T1-POLICY: an organization's own published statement of
   what it never does, as one atomic rule (one organization, one channel set, one forbidden action).
   Only records that two people have reviewed against the live page reach the engine, through
   TFS.buildPolicyView. A draft here is inert: it is listed with its exclusion reason and never fires.
   Field rules: quote is verbatim; every predicate is marked mandatory or not; every exception is
   recorded word for word; channels are only the ones the quote names. review_due is 90 days
   after checked_on. Plain script, so the app still opens directly from disk. */
window.TFS_POLICIES = {
  "version": "policies-2026-10-12.draft",
  "schemaVersion": 1,
  "records": [
    {
      "id": "USPS-TRACKING-NOLINK-001",
      "organization": "USPS",
      "orgId": "usps",
      "service_scope": "package tracking / delivery notifications",
      "service_label": "tracking texts and emails",
      "service_cues": ["package", "delivery", "tracking", "shipment"],
      "channels": ["sms", "email"],
      "forbidden_action": "link_present",
      "predicates": [],
      "exceptions": [],
      "quote": "USPS will not send customers text messages or e-mails without a customer first requesting the service, and it will NOT contain a link.",
      "quote_note": "Taken from the policy-sourcing guide (checked 2026-10-11). The 2026-10-11 sourcing report saw newer live wording that adds \"with a tracking number\". Re-copy the sentence from the live page before review.",
      "source_url": "https://www.uspis.gov/news/scam-article/smishing-package-tracking-text-scams",
      "snapshot": null,
      "archive_url": null,
      "checked_on": "2026-10-11",
      "review_due": "2027-01-09",
      "reviewed_by": null,
      "second_reviewer": null,
      "status": "draft"
    }
  ]
};
