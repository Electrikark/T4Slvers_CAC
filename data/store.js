/* Local prototype reference data, carried forward from the existing store.
   Source notes record earlier automated reachability checks; these are not proof
   of ownership, sender identity, or human review. Review evidence is pending.
   Entries marked 'needs review' cannot produce a positive address match.
   officialPhones stays empty until numbers have a reviewed primary source.
   Plain script supports opening the app directly from disk.
   Trusted view (js/engine/trusted.js): only reviewed, unexpired, complete, conflict-free
   records can support a contact. To mark an organization's listed domains and phones as
   reviewed, a person adds
     "humanReview": { "reviewer": "<name>", "date": "YYYY-MM-DD",
                      "reviewDue": "YYYY-MM-DD", "sourceUrl": "<primary source>" }
   (reviewDue is 90 days after the review). To review contacts one at a time instead, list
   them in "contacts": [{ "kind": "domain" | "phone", "value", "scope": { "type":
   "registrable" | "host", "pathPrefix"? }, "status": "reviewed" | "draft", "sourceUrl",
   "checkedOn", "reviewDue", "reviewedBy" }]. Five organizations have source-documented draft contacts. Human reviewer fields
   are blank pending review evidence. All contacts remain excluded as not_reviewed.
   humanReviewDraft records Naman Raichura's statement that he checked the original
   46 organizations. attestedOn is the date of that statement, not the check date.
   These drafts are not read as approval by the engine. Missing review dates and
   source pages stay null; existing research dates are not human check dates.
   An organization-level humanReview also reviews every contact still in draft (see
   recordsOf in js/engine/trusted.js and docs/reference-review-guide.md).
   securityNotes and publishedEmailSenderDomains document evidence only; they do not
   enable policy rules or authenticate a sender. */
window.TFS_STORE = {
  "version": "2026-10-18-five-org-draft",
  "schemaVersion": 1,
  "shorteners": [
    "bit.ly",
    "bitly.com",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "ow.ly",
    "is.gd",
    "buff.ly",
    "rb.gy",
    "cutt.ly",
    "shorturl.at",
    "tiny.cc",
    "rebrand.ly",
    "t.ly",
    "s.id",
    "lnkd.in",
    "qrco.de",
    "v.gd"
  ],
  "freeMailDomains": [
    "gmail.com",
    "googlemail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "yahoo.com",
    "ymail.com",
    "aol.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "comcast.net",
    "att.net",
    "sbcglobal.net",
    "verizon.net",
    "proton.me",
    "protonmail.com",
    "gmx.com",
    "mail.com",
    "zoho.com"
  ],
  "orgs": [
    {
      "id": "hsbc",
      "displayName": "HSBC",
      "aliases": [
        "hsbc"
      ],
      "strictAliases": [],
      "officialDomains": [
        "hsbc.com",
        "hsbc.co.uk"
      ],
      "officialPhones": [],
      "userContentHosts": [],
      "status": "draft",
      "contacts": [
        {
          "kind": "domain",
          "value": "hsbc.com",
          "scope": {
            "type": "registrable"
          },
          "status": "draft"
        },
        {
          "kind": "domain",
          "value": "hsbc.co.uk",
          "scope": {
            "type": "registrable"
          },
          "status": "draft"
        }
      ]
    },
    {
      "id": "royalmail",
      "displayName": "Royal Mail",
      "aliases": [
        "royal mail",
        "royalmail"
      ],
      "strictAliases": [],
      "officialDomains": [
        "royalmail.com"
      ],
      "officialPhones": [],
      "userContentHosts": [],
      "status": "draft",
      "contacts": [
        {
          "kind": "domain",
          "value": "royalmail.com",
          "scope": {
            "type": "registrable"
          },
          "status": "draft"
        }
      ]
    },
    {
      "id": "ezpass",
      "displayName": "E-ZPass",
      "aliases": [
        "e-zpass",
        "ezpass",
        "e zpass"
      ],
      "strictAliases": [],
      "officialDomains": [
        "e-zpassiag.com"
      ],
      "officialPhones": [],
      "userContentHosts": [],
      "status": "draft",
      "contacts": [
        {
          "kind": "domain",
          "value": "e-zpassiag.com",
          "scope": {
            "type": "registrable"
          },
          "status": "draft"
        }
      ]
    },

    {
      "id": "chase",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Chase",
      "category": "bank",
      "aliases": [
        "chase bank",
        "jpmorgan chase",
        "jp morgan chase"
      ],
      "strictAliases": [
        "chase"
      ],
      "officialDomains": [
        "chase.com"
      ],
      "userContentHosts": [],
      "officialPhones": [
        "1-800-935-9935"
      ],
      "sources": [
        {
          "domain": "chase.com",
          "url": "https://www.chase.com/digital/resources/privacy-security",
          "retrieved": "2026-10-18",
          "check": "Official-source values documented; human review pending"
        }
      ],
      "verifiedBy": "Human review pending",
      "contacts": [
        {
          "kind": "domain",
          "value": "chase.com",
          "scope": {
            "type": "registrable"
          },
          "status": "draft",
          "sourceUrl": "https://www.chase.com/digital/resources/privacy-security",
          "checkedOn": "2026-10-18",
          "reviewDue": "2027-01-16",
          "reviewedBy": null
        },
        {
          "kind": "phone",
          "value": "1-800-935-9935",
          "scope": {
            "type": "host"
          },
          "status": "draft",
          "sourceUrl": "https://www.chase.com/digital/customer-service",
          "checkedOn": "2026-10-18",
          "reviewDue": "2027-01-16",
          "reviewedBy": null,
          "purpose": "Personal Banking Customer Service:"
        }
      ],
      "sourceReview": {
        "status": "draft",
        "reviewer": null,
        "date": "2026-10-18",
        "reviewDue": "2027-01-16",
        "timezone": "America/Los_Angeles",
        "method": "Direct official URL retrieval and exact-text find with surrounding context. Interactive browser unavailable; manual Cmd+F is not claimed. Human reviewer and approval pending.",
        "notes": "Sender-domain field blank: no explicit legitimate sender-domain list found in checked pages. A phishing-report mailbox is not proof of a sending domain. Security quote concerns moving money to resolve fraud; it is not a general ban on bank transfers. Only the main domain and the listed US personal-banking number are included."
      },
      "securityNotes": {
        "quote": "Legitimate banks will never ask you to move money to resolve a fraud issue.",
        "sourceUrl": "https://www.chase.com/digital/resources/privacy-security/security/scam-stories",
        "status": "draft"
      },
      "contactInstruction": {
        "text": "call Chase using the phone number on the back of your card or on your account statement.",
        "sourceUrl": "https://www.chase.com/digital/resources/privacy-security/security/self-service-text-messages"
      }
    },
    {
      "id": "bankofamerica",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Bank of America",
      "category": "bank",
      "aliases": ["bank of america", "bofa"],
      "officialDomains": ["bankofamerica.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "bankofamerica.com",
          "url": "https://www.bankofamerica.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "wellsfargo",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Wells Fargo",
      "category": "bank",
      "aliases": [
        "wells fargo"
      ],
      "officialDomains": [
        "wellsfargo.com"
      ],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [
        "1-800-869-3557"
      ],
      "sources": [
        {
          "domain": "wellsfargo.com",
          "url": "https://www.wellsfargo.com/",
          "retrieved": "2026-10-18",
          "check": "Official-source values documented; human review pending"
        }
      ],
      "verifiedBy": "Human review pending",
      "contacts": [
        {
          "kind": "domain",
          "value": "wellsfargo.com",
          "scope": {
            "type": "registrable"
          },
          "status": "draft",
          "sourceUrl": "https://www.wellsfargo.com/",
          "checkedOn": "2026-10-18",
          "reviewDue": "2027-01-16",
          "reviewedBy": null
        },
        {
          "kind": "phone",
          "value": "1-800-869-3557",
          "scope": {
            "type": "host"
          },
          "status": "draft",
          "sourceUrl": "https://www.wellsfargo.com/privacy-security/fraud/report/",
          "checkedOn": "2026-10-18",
          "reviewDue": "2027-01-16",
          "reviewedBy": null,
          "purpose": "Checking or savings account, debit, or ATM card fraud"
        }
      ],
      "sourceReview": {
        "status": "draft",
        "reviewer": null,
        "date": "2026-10-18",
        "reviewDue": "2027-01-16",
        "timezone": "America/Los_Angeles",
        "method": "Direct official URL retrieval and exact-text find with surrounding context. Interactive browser unavailable; manual Cmd+F is not claimed. Human reviewer and approval pending.",
        "notes": "Email source explicitly identifies wellsfargo.com in legitimate email addresses; this does not authenticate an email, and a string containing that text is not sufficient. Security quote refers to screen-sharing/remote-access tools. Other business, wire-fraud and card-claim numbers are outside this narrow review. Card instruction applies when reporting suspected fraud or unauthorized transactions and filing a claim."
      },
      "securityNotes": {
        "quote": "Wells Fargo will never ask you to download this type of software or ask you to screen share with them.",
        "sourceUrl": "https://www.wellsfargo.com/privacy-security/fraud/bank-scams/bank-imposter/",
        "status": "draft"
      },
      "contactInstruction": {
        "text": "calling the number on the back of your credit or debit card.",
        "sourceUrl": "https://www.wellsfargo.com/privacy-security/fraud/report/"
      },
      "publishedEmailSenderDomains": [
        {
          "value": "wellsfargo.com",
          "sourceUrl": "https://www.wellsfargo.com/privacy-security/fraud/bank-scams/bank-imposter/",
          "status": "draft"
        }
      ]
    },
    {
      "id": "citi",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Citi",
      "category": "bank",
      "aliases": ["citibank"],
      "strictAliases": ["citi"],
      "officialDomains": ["citi.com", "citibank.com"],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "citi.com",
          "url": "https://www.citi.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        },
        {
          "domain": "citibank.com",
          "url": "https://www.citi.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "usbank",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "U.S. Bank",
      "category": "bank",
      "aliases": ["u.s. bank", "usbank"],
      "strictAliases": ["us bank"],
      "officialDomains": ["usbank.com"],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "usbank.com",
          "url": "https://www.usbank.com/index.html",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "capitalone",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Capital One",
      "category": "bank",
      "aliases": ["capital one", "capitalone"],
      "officialDomains": ["capitalone.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "capitalone.com",
          "url": "https://www.capitalone.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "pnc",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "PNC Bank",
      "category": "bank",
      "aliases": ["pnc bank"],
      "strictAliases": ["pnc"],
      "officialDomains": ["pnc.com"],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "pnc.com",
          "url": "https://pnc.com/",
          "retrieved": "2026-10-03",
          "check": "needs review: site refused the automated check"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "navyfederal",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Navy Federal Credit Union",
      "category": "bank",
      "aliases": ["navy federal"],
      "officialDomains": ["navyfederal.org"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "navyfederal.org",
          "url": "https://www.navyfederal.org/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "golden1",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Golden 1 Credit Union",
      "category": "bank",
      "aliases": ["golden 1", "golden one", "golden1"],
      "officialDomains": ["golden1.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "golden1.com",
          "url": "https://golden1.com/",
          "retrieved": "2026-10-03",
          "check": "needs review: site refused the automated check"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "amex",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "American Express",
      "category": "bank",
      "aliases": ["american express", "amex"],
      "officialDomains": ["americanexpress.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "americanexpress.com",
          "url": "https://www.americanexpress.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "paypal",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "PayPal",
      "category": "payments",
      "aliases": ["paypal"],
      "officialDomains": ["paypal.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "paypal.com",
          "url": "https://www.paypal.com/us/home",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "venmo",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Venmo",
      "category": "payments",
      "aliases": ["venmo"],
      "officialDomains": ["venmo.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "venmo.com",
          "url": "https://venmo.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "zelle",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Zelle",
      "category": "payments",
      "aliases": ["zelle"],
      "officialDomains": ["zellepay.com", "zelle.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "zellepay.com",
          "url": "https://www.zelle.com/",
          "retrieved": "2026-10-03",
          "check": "automated: redirects to another official domain of this organization"
        },
        {
          "domain": "zelle.com",
          "url": "https://www.zelle.com/",
          "retrieved": "2026-10-03",
          "check": "automated: zellepay.com redirects here"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "cashapp",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Cash App",
      "category": "payments",
      "aliases": ["cash app", "cashapp"],
      "officialDomains": ["cash.app"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "cash.app",
          "url": "https://cash.app/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "amazon",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Amazon",
      "category": "retail",
      "aliases": [
        "amazon",
        "amazon prime"
      ],
      "officialDomains": [
        "amazon.com"
      ],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "amazon.com",
          "url": "https://www.aboutamazon.com/news/retail/how-to-avoid-amazon-scams",
          "retrieved": "2026-10-18",
          "check": "Official-source values documented; human review pending"
        }
      ],
      "verifiedBy": "Human review pending",
      "contacts": [
        {
          "kind": "domain",
          "value": "amazon.com",
          "scope": {
            "type": "registrable"
          },
          "status": "draft",
          "sourceUrl": "https://www.aboutamazon.com/news/retail/how-to-avoid-amazon-scams",
          "checkedOn": "2026-10-18",
          "reviewDue": "2027-01-16",
          "reviewedBy": null
        }
      ],
      "sourceReview": {
        "status": "draft",
        "reviewer": null,
        "date": "2026-10-18",
        "reviewDue": "2027-01-16",
        "timezone": "America/Los_Angeles",
        "method": "Direct official URL retrieval and exact-text find with surrounding context. Interactive browser unavailable; manual Cmd+F is not claimed. Human reviewer and approval pending.",
        "notes": "Phone, purpose and phone source remain blank: no official customer-service number was verified. The earlier contact-flow attempt returned 503; this pass does not claim a new successful phone lookup. Use the Amazon app or type amazon.com yourself. Sender domain remains blank; a scam-report inbox is not evidence of outbound senders. The gift-card quote is an exact excerpt from Amazon’s own publication; it does not authorize another contact domain."
      },
      "securityNotes": {
        "quote": "We will never ask you to purchase a gift card",
        "sourceUrl": "https://www.aboutamazon.com/news/retail/how-to-avoid-amazon-scams",
        "status": "draft"
      }
    },
    {
      "id": "apple",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Apple",
      "category": "tech",
      "aliases": ["apple support", "apple id", "icloud"],
      "strictAliases": ["apple"],
      "officialDomains": ["apple.com", "icloud.com"],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "apple.com",
          "url": "https://www.apple.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        },
        {
          "domain": "icloud.com",
          "url": "https://www.icloud.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "microsoft",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Microsoft",
      "category": "tech",
      "aliases": ["microsoft", "windows defender", "microsoft support"],
      "officialDomains": ["microsoft.com", "microsoftonline.com", "live.com", "office.com", "cloud.microsoft"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "microsoft.com",
          "url": "https://www.microsoft.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        },
        {
          "domain": "microsoftonline.com",
          "url": "https://login.microsoftonline.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads (retried by hand)"
        },
        {
          "domain": "live.com",
          "url": "https://outlook.live.com/mail/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        },
        {
          "domain": "office.com",
          "url": "https://m365.cloud.microsoft/",
          "retrieved": "2026-10-03",
          "check": "automated: redirects to another official domain of this organization"
        },
        {
          "domain": "cloud.microsoft",
          "url": "https://m365.cloud.microsoft/",
          "retrieved": "2026-10-03",
          "check": "automated: office.com redirects here"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "google",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Google",
      "category": "tech",
      "aliases": ["google", "gmail", "google account"],
      "officialDomains": ["google.com", "forms.gle"],
      "userContentHosts": [
        "docs.google.com",
        "sites.google.com",
        "drive.google.com",
        "groups.google.com",
        "script.google.com",
        "forms.gle"
      ],
      "strictAliases": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "google.com",
          "url": "https://www.google.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        },
        {
          "domain": "forms.gle",
          "url": "https://forms.gle/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "meta",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Meta (Facebook, Instagram, WhatsApp)",
      "category": "tech",
      "aliases": ["facebook", "instagram", "whatsapp"],
      "strictAliases": ["meta"],
      "officialDomains": ["meta.com", "facebook.com", "instagram.com", "whatsapp.com"],
      "userContentHosts": ["facebook.com", "instagram.com"],
      "officialPhones": [],
      "sources": [
        {
          "domain": "meta.com",
          "url": "https://www.meta.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        },
        {
          "domain": "facebook.com",
          "url": "https://www.facebook.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        },
        {
          "domain": "instagram.com",
          "url": "https://www.instagram.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        },
        {
          "domain": "whatsapp.com",
          "url": "https://www.whatsapp.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "netflix",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Netflix",
      "category": "tech",
      "aliases": ["netflix"],
      "officialDomains": ["netflix.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "netflix.com",
          "url": "https://www.netflix.com/unsupportedbrowser",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "geeksquad",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Geek Squad (Best Buy)",
      "category": "tech",
      "aliases": ["geek squad", "geeksquad", "best buy"],
      "officialDomains": ["bestbuy.com", "geeksquad.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "bestbuy.com",
          "url": "https://bestbuy.com/",
          "retrieved": "2026-10-03",
          "check": "needs review: site refused the automated check"
        },
        {
          "domain": "geeksquad.com",
          "url": "https://geeksquad.com/",
          "retrieved": "2026-10-03",
          "check": "needs review: site refused the automated check"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "norton",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Norton",
      "category": "tech",
      "aliases": ["norton", "lifelock"],
      "officialDomains": ["norton.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "norton.com",
          "url": "https://us.norton.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "mcafee",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "McAfee",
      "category": "tech",
      "aliases": ["mcafee"],
      "officialDomains": ["mcafee.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "mcafee.com",
          "url": "https://www.mcafee.com:443/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "docusign",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "DocuSign",
      "category": "tech",
      "aliases": ["docusign"],
      "officialDomains": ["docusign.com", "docusign.net"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "docusign.com",
          "url": "https://www.docusign.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        },
        {
          "domain": "docusign.net",
          "url": "https://na2.docusign.net/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads (retried by hand)"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "walmart",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Walmart",
      "category": "retail",
      "aliases": ["walmart"],
      "officialDomains": ["walmart.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "walmart.com",
          "url": "https://www.walmart.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "costco",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Costco",
      "category": "retail",
      "aliases": ["costco"],
      "officialDomains": ["costco.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "costco.com",
          "url": "https://www.costco.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "att",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "AT&T",
      "category": "telecom",
      "aliases": ["at&t", "at & t"],
      "officialDomains": ["att.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "att.com",
          "url": "https://www.att.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "verizon",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Verizon",
      "category": "telecom",
      "aliases": ["verizon"],
      "officialDomains": ["verizon.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "verizon.com",
          "url": "https://www.verizon.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "tmobile",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "T-Mobile",
      "category": "telecom",
      "aliases": ["t-mobile", "tmobile"],
      "officialDomains": ["t-mobile.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "t-mobile.com",
          "url": "https://www.t-mobile.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "xfinity",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Xfinity (Comcast)",
      "category": "telecom",
      "aliases": ["xfinity", "comcast"],
      "officialDomains": ["xfinity.com", "comcast.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "xfinity.com",
          "url": "https://www.xfinity.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        },
        {
          "domain": "comcast.com",
          "url": "https://www.xfinity.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads (retried by hand)"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "pge",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "PG&E",
      "category": "utility",
      "aliases": ["pg&e", "pacific gas and electric"],
      "officialDomains": ["pge.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "pge.com",
          "url": "https://www.pge.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "smud",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "SMUD",
      "category": "utility",
      "aliases": ["smud", "sacramento municipal utility district"],
      "officialDomains": ["smud.org"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "smud.org",
          "url": "https://www.smud.org/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "usps",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "USPS",
      "category": "delivery",
      "aliases": [
        "usps",
        "postal service",
        "u.s. postal service",
        "us postal service"
      ],
      "officialDomains": [
        "usps.com"
      ],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [
        "1-800-275-8777"
      ],
      "sources": [
        {
          "domain": "usps.com",
          "url": "https://www.usps.com/",
          "retrieved": "2026-10-18",
          "check": "Official-source values documented; human review pending"
        }
      ],
      "verifiedBy": "Human review pending",
      "contacts": [
        {
          "kind": "domain",
          "value": "usps.com",
          "scope": {
            "type": "registrable"
          },
          "status": "draft",
          "sourceUrl": "https://www.usps.com/",
          "checkedOn": "2026-10-18",
          "reviewDue": "2027-01-16",
          "reviewedBy": null
        },
        {
          "kind": "phone",
          "value": "1-800-275-8777",
          "scope": {
            "type": "host"
          },
          "status": "draft",
          "sourceUrl": "https://www.usps.com/help/contact-us.htm",
          "checkedOn": "2026-10-18",
          "reviewDue": "2027-01-16",
          "reviewedBy": null,
          "purpose": "Customer Care Center"
        }
      ],
      "sourceReview": {
        "status": "draft",
        "reviewer": null,
        "date": "2026-10-18",
        "reviewDue": "2027-01-16",
        "timezone": "America/Los_Angeles",
        "method": "Direct official URL retrieval and exact-text find with surrounding context. Interactive browser unavailable; manual Cmd+F is not claimed. Human reviewer and approval pending.",
        "notes": "Scope: the paragraph describes tracking a specific package, registration online or an initiated text, and a customer request with a tracking number. The next sentence discusses an unrequested tracking text with a link. Preserve all those conditions. The excerpt is documentation only, not a broader rule about every USPS communication. USPS lists Postal Inspectors on its own contact page: https://www.usps.com/help/contact-us.htm . Sender domain remains blank. The tracking short code is not a callable phone record."
      },
      "securityNotes": {
        "quote": "and it will NOT contain a link.",
        "sourceUrl": "https://www.uspis.gov/news/scam-article/smishing-package-tracking-text-scams",
        "status": "draft",
        "scopeNote": "Package tracking requested by registering online or initiating a text, with a tracking number; the surrounding guidance also discusses an unsolicited tracking message containing a link."
      }
    },
    {
      "id": "ups",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "UPS",
      "category": "delivery",
      "aliases": [],
      "strictAliases": ["ups"],
      "officialDomains": ["ups.com"],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "ups.com",
          "url": "https://www.ups.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "fedex",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "FedEx",
      "category": "delivery",
      "aliases": ["fedex", "federal express"],
      "officialDomains": ["fedex.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "fedex.com",
          "url": "https://www.fedex.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "dhl",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "DHL",
      "category": "delivery",
      "aliases": ["dhl"],
      "officialDomains": ["dhl.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "dhl.com",
          "url": "https://dhl.com/",
          "retrieved": "2026-10-03",
          "check": "needs review: site refused the automated check"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "irs",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "IRS",
      "category": "government",
      "aliases": ["irs", "internal revenue service"],
      "officialDomains": ["irs.gov"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "irs.gov",
          "url": "https://www.irs.gov/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "ssa",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Social Security Administration",
      "category": "government",
      "aliases": [
        "social security",
        "social security administration"
      ],
      "strictAliases": [
        "ssa"
      ],
      "officialDomains": [
        "ssa.gov"
      ],
      "userContentHosts": [],
      "officialPhones": [
        "1-800-772-1213"
      ],
      "sources": [
        {
          "domain": "ssa.gov",
          "url": "https://www.ssa.gov/",
          "retrieved": "2026-10-18",
          "check": "Official-source values documented; human review pending"
        }
      ],
      "verifiedBy": "Human review pending",
      "contacts": [
        {
          "kind": "domain",
          "value": "ssa.gov",
          "scope": {
            "type": "registrable"
          },
          "status": "draft",
          "sourceUrl": "https://www.ssa.gov/",
          "checkedOn": "2026-10-18",
          "reviewDue": "2027-01-16",
          "reviewedBy": null
        },
        {
          "kind": "phone",
          "value": "1-800-772-1213",
          "scope": {
            "type": "host"
          },
          "status": "draft",
          "sourceUrl": "https://www.ssa.gov/agency/contact/phone.html",
          "checkedOn": "2026-10-18",
          "reviewDue": "2027-01-16",
          "reviewedBy": null,
          "purpose": "National 800 Number"
        }
      ],
      "sourceReview": {
        "status": "draft",
        "reviewer": null,
        "date": "2026-10-18",
        "reviewDue": "2027-01-16",
        "timezone": "America/Los_Angeles",
        "method": "Direct official URL retrieval and exact-text find with surrounding context. Interactive browser unavailable; manual Cmd+F is not claimed. Human reviewer and approval pending.",
        "notes": "Sender domain blank: no explicit outbound sender-domain statement found in checked pages. Card-style instruction is not applicable. National phone support is distinct from local offices; the quoted prohibition is scoped to social media, email and text, not every phone interaction."
      },
      "securityNotes": {
        "quote": "Social Security will never ask for sensitive or personal information through social media, email, or text message.",
        "sourceUrl": "https://www.ssa.gov/scam/",
        "status": "draft"
      }
    },
    {
      "id": "medicare",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Medicare",
      "category": "government",
      "aliases": ["medicare"],
      "officialDomains": ["medicare.gov", "cms.gov"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "medicare.gov",
          "url": "https://www.medicare.gov/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        },
        {
          "domain": "cms.gov",
          "url": "https://www.cms.gov/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "ftc",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Federal Trade Commission",
      "category": "government",
      "aliases": ["ftc"],
      "officialDomains": ["ftc.gov"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "ftc.gov",
          "url": "https://www.ftc.gov/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "cadmv",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "California DMV",
      "category": "government",
      "aliases": ["california dmv", "department of motor vehicles"],
      "strictAliases": ["dmv"],
      "officialDomains": ["dmv.ca.gov"],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "dmv.ca.gov",
          "url": "https://www.dmv.ca.gov/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "caedd",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "California EDD",
      "category": "government",
      "aliases": ["employment development department"],
      "strictAliases": ["edd"],
      "officialDomains": ["edd.ca.gov"],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "edd.ca.gov",
          "url": "https://edd.ca.gov/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "fastrak",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "FasTrak (Bay Area)",
      "category": "tolls",
      "aliases": ["fastrak", "fas trak", "bay area fastrak"],
      "officialDomains": ["bayareafastrak.org"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "bayareafastrak.org",
          "url": "https://www.bayareafastrak.org/en/home/index.shtml",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "tollroads",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "The Toll Roads (Orange County)",
      "category": "tolls",
      "aliases": ["the toll roads"],
      "officialDomains": ["thetollroads.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "thetollroads.com",
          "url": "https://thetollroads.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "aarp",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "AARP",
      "category": "nonprofit",
      "aliases": ["aarp"],
      "officialDomains": ["aarp.org"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "aarp.org",
          "url": "https://www.aarp.org/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "pch",
      "humanReviewDraft": {
        "reviewer": "Naman Raichura",
        "status": "evidence_pending",
        "attestedOn": "2026-10-22",
        "date": null,
        "reviewDue": null,
        "sourceUrl": null
      },
      "displayName": "Publishers Clearing House",
      "category": "sweepstakes",
      "aliases": ["publishers clearing house"],
      "strictAliases": ["pch"],
      "officialDomains": ["pch.com"],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "pch.com",
          "url": "https://www.pch.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    }
  ]
};
