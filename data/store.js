/* Local prototype reference data, carried forward from the existing store.
   Source notes record earlier automated reachability checks; these are not proof
   of ownership, sender identity, or human review. Review is still pending.
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
   "checkedOn", "reviewDue", "reviewedBy" }]. No record below has either yet, so every record
   is excluded as not_reviewed and none can support a match. */
window.TFS_STORE = {
  "version": "2026-10-03",
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
      "id": "chase",
      "displayName": "Chase",
      "category": "bank",
      "aliases": ["chase bank", "jpmorgan chase", "jp morgan chase"],
      "strictAliases": ["chase"],
      "officialDomains": ["chase.com"],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "chase.com",
          "url": "https://www.chase.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "bankofamerica",
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
      "displayName": "Wells Fargo",
      "category": "bank",
      "aliases": ["wells fargo"],
      "officialDomains": ["wellsfargo.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "wellsfargo.com",
          "url": "https://www.wellsfargo.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "citi",
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
      "displayName": "Amazon",
      "category": "retail",
      "aliases": ["amazon", "amazon prime"],
      "officialDomains": ["amazon.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "amazon.com",
          "url": "https://www.amazon.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "apple",
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
      "displayName": "USPS",
      "category": "delivery",
      "aliases": ["usps", "postal service", "u.s. postal service", "us postal service"],
      "officialDomains": ["usps.com"],
      "strictAliases": [],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "usps.com",
          "url": "https://www.usps.com/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads and stays on this domain"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "ups",
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
      "displayName": "Social Security Administration",
      "category": "government",
      "aliases": ["social security", "social security administration"],
      "strictAliases": ["ssa"],
      "officialDomains": ["ssa.gov"],
      "userContentHosts": [],
      "officialPhones": [],
      "sources": [
        {
          "domain": "ssa.gov",
          "url": "https://www.ssa.gov/",
          "retrieved": "2026-10-03",
          "check": "automated: HTTPS page loads (retried by hand)"
        }
      ],
      "verifiedBy": "automated check by Claude; awaiting human review"
    },
    {
      "id": "medicare",
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
