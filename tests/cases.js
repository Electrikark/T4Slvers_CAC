// Schema v3: assert canonical assessment; contact strength remains evidence, not a verdict.
/* Tech for Silvers engine: the 20 must-pass cases and the fixture store they run against.
   A case asserts only the fields it lists. codes are matched against checks[].code.
   Plain script that sets window globals, because browsers block fetch() on file:// pages. */
window.TFS_FIXTURE_STORE = {
  "version": "test-fixture",
  "shorteners": [
    "bit.ly",
    "tinyurl.com",
    "t.co"
  ],
  "orgs": [
    {
      "id": "chase",
      "displayName": "Chase",
      "aliases": [
        "chase",
        "chase bank"
      ],
      "officialDomains": [
        "chase.com"
      ],
      "userContentHosts": [],
      "officialPhones": []
    },
    {
      "id": "paypal",
      "displayName": "PayPal",
      "aliases": [
        "paypal"
      ],
      "officialDomains": [
        "paypal.com"
      ],
      "userContentHosts": [],
      "officialPhones": []
    },
    {
      "id": "amazon",
      "displayName": "Amazon",
      "aliases": [
        "amazon"
      ],
      "officialDomains": [
        "amazon.com"
      ],
      "userContentHosts": [],
      "officialPhones": []
    },
    {
      "id": "usps",
      "displayName": "USPS",
      "aliases": [
        "usps",
        "postal service"
      ],
      "officialDomains": [
        "usps.com"
      ],
      "userContentHosts": [],
      "officialPhones": []
    },
    {
      "id": "ups",
      "displayName": "UPS",
      "aliases": [
        "ups"
      ],
      "officialDomains": [
        "ups.com"
      ],
      "userContentHosts": [],
      "officialPhones": []
    },
    {
      "id": "microsoft",
      "displayName": "Microsoft",
      "aliases": [
        "microsoft"
      ],
      "officialDomains": [
        "microsoft.com"
      ],
      "userContentHosts": [],
      "officialPhones": []
    },
    {
      "id": "google",
      "displayName": "Google",
      "aliases": [
        "google"
      ],
      "officialDomains": [
        "google.com"
      ],
      "userContentHosts": [
        "docs.google.com",
        "sites.google.com",
        "drive.google.com"
      ],
      "officialPhones": []
    },
    {
      "id": "examplebank",
      "displayName": "Example Bank (fictional)",
      "aliases": [
        "example bank"
      ],
      "officialDomains": [
        "examplebank.test"
      ],
      "userContentHosts": [],
      "officialPhones": [
        "+12025550123"
      ]
    }
  ]
};

window.TFS_CASES = [
  {
    "id": "T01",
    "text": "Chase: Your statement is ready. View it at https://www.chase.com/personal/online-banking",
    "expect": {
      "assessment": "details_match",
      "codes": [
        "domain_official"
      ],
      "risk": "none"
    },
    "guards": "Baseline: official link, claim agrees, no pressure"
  },
  {
    "id": "T02",
    "text": "Chase: Your account has been locked. Sign in at chase-secure-login.net to restore access.",
    "expect": {
      "assessment": "suspicious" /* T1-DOMAIN: brand name plus a sign-in lure word. */,
      "rules": [
        "T1-DOMAIN"
      ],
      "contactStrength": "strong",
      "codes": [
        "brand_in_foreign_domain"
      ],
      "risk": "elevated",
      "flags": [
        "account_locked"
      ]
    },
    "guards": "The prototype's own bank example, now computed"
  },
  {
    "id": "T03",
    "text": "Chase alert: verify your login at https://chase.com.account-verify.net/login",
    "expect": {
      "assessment": "suspicious" /* T1-DOMAIN: official domain glued to another site. */,
      "rules": [
        "T1-DOMAIN"
      ],
      "contactStrength": "strong",
      "codes": [
        "official_domain_as_subdomain"
      ]
    },
    "guards": "Official name used as a subdomain of another site"
  },
  {
    "id": "T04",
    "text": "PayPal: confirm your payment at https://paypal.com@pay-secure.example/confirm",
    "expect": {
      "assessment": "suspicious" /* T1-DOMAIN: text before @ hides the real site. */,
      "rules": [
        "T1-DOMAIN"
      ],
      "contactStrength": "strong",
      "codes": [
        "userinfo_trick"
      ]
    },
    "guards": "Real host hidden after an @ sign"
  },
  {
    "id": "T05",
    "text": "Chase: sign in at https://ch\u0430se.com",
    "expect": {
      "assessment": "suspicious" /* T1-DOMAIN: Cyrillic letter swapped in. */,
      "rules": [
        "T1-DOMAIN"
      ],
      "contactStrength": "strong",
      "codes": [
        "homoglyph"
      ]
    },
    "guards": "Letters that look identical but are not (second letter is Cyrillic, U+0430)"
  },
  {
    "id": "T06",
    "text": "Amazon: your order shipped. Track it at https://www.amazom.com/track",
    "expect": {
      "assessment": "insufficient_evidence" /* spec v1.2: legacy contact conflict is Tier 2; only established Tier 1 wins. */,
      "contactStrength": "strong",
      "codes": [
        "typosquat"
      ]
    },
    "guards": "One-letter typo"
  },
  {
    "id": "T07",
    "text": "UPS: Your package is arriving. Track it at https://www.groups.com/track",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "not_in_official_list"
      ],
      "notCodes": [
        "brand_in_foreign_domain",
        "typosquat"
      ]
    },
    "guards": "A short alias (ups) inside a longer word must not fire"
  },
  {
    "id": "T08",
    "text": "Amazon: Your order cannot ship. Update payment at https://order-help.example/pay",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "not_in_official_list"
      ]
    },
    "guards": "An unlisted site alone is not evidence of a conflict"
  },
  {
    "id": "T09",
    "text": "USPS: Your parcel is delayed. See https://www.ups.com/track",
    "expect": {
      "assessment": "insufficient_evidence" /* spec v1.2: legacy contact conflict is Tier 2; only established Tier 1 wins. */,
      "contactStrength": "moderate",
      "codes": [
        "domain_belongs_to_other_org"
      ],
      "notCodes": [
        "typosquat"
      ]
    },
    "guards": "ups.com is one edit from usps.com; an official domain is never a lookalike"
  },
  {
    "id": "T10",
    "text": "USPS: Your package is on hold. Reschedule at https://bit.ly/3xYz",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "shortener_unresolvable"
      ]
    },
    "guards": "Short links cannot be followed in the browser"
  },
  {
    "id": "T11",
    "text": "Chase: See https://www.chase.com/alerts or https://bit.ly/3xYz",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "domain_official",
        "shortener_unresolvable"
      ]
    },
    "guards": "One unverifiable link blocks a match"
  },
  {
    "id": "T12",
    "text": "Google: Your storage is full. Fix it at https://docs.google.com/forms/d/e/1FAIpQLSabc/viewform",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "user_content_platform"
      ]
    },
    "guards": "Official domain, but anyone can publish there"
  },
  {
    "id": "T13",
    "text": "Microsoft: Review your account activity at https://account.microsoft.com/security",
    "expect": {
      "assessment": "details_match",
      "codes": [
        "domain_official"
      ],
      "risk": "none"
    },
    "guards": "Subdomains of an official domain are accepted"
  },
  {
    "id": "T14",
    "text": "Example Bank: Questions about your card? Call (202) 555-0123.",
    "expect": {
      "assessment": "details_match",
      "codes": [
        "phone_official"
      ],
      "risk": "none"
    },
    "guards": "Phone number written in the text and on file"
  },
  {
    "id": "T15",
    "text": "Example Bank: Fraud alert. Call (202) 555-0148 now.",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "phone_not_on_file"
      ],
      "riskAtLeast": "elevated"
    },
    "guards": "A phone number alone never produces a mismatch"
  },
  {
    "id": "T16",
    "text": "Example Bank: Call (202) 555-0123 or visit https://examplebank-secure.example",
    "expect": {
      "assessment": "suspicious" /* T1-DOMAIN: brand name plus a security lure word. */,
      "rules": [
        "T1-DOMAIN"
      ],
      "contactStrength": "strong",
      "codes": [
        "brand_in_foreign_domain",
        "phone_official"
      ]
    },
    "guards": "A supporting phone cannot cancel a brand-plus-lure address (T1-DOMAIN)"
  },
  {
    "id": "T17",
    "text": "Example Bank: Your code is 482910. Never share this code with anyone.",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "nothing_to_check"
      ],
      "risk": "none"
    },
    "guards": "Negation guard: real code messages stay quiet"
  },
  {
    "id": "T18",
    "text": "Example Bank: Call us at (202) 555-0123 and read us the code we sent you. Do not tell anyone, including your family.",
    "expect": {
      "assessment": "suspicious" /* T1-CODE: reading a code to the caller. */,
      "rules": [
        "T1-CODE"
      ],
      "codes": [
        "phone_official"
      ],
      "risk": "high",
      "flags": [
        "share_code",
        "secrecy"
      ]
    },
    "guards": "The match that is still a scam: the warning must lead"
  },
  {
    "id": "T19",
    "text": "MICROSOFT SECURITY ALERT: Your device is locked! Call (202) 555-0199 now. Pay a support fee and grant remote access.",
    "expect": {
      "assessment": "suspicious" /* T1-CALLBACK: a device alarm with a number to call. */,
      "rules": [
        "T1-CALLBACK"
      ],
      "codes": [
        "phone_not_on_file"
      ],
      "risk": "high",
      "flags": [
        "remote_access",
        "pay_fee"
      ]
    },
    "guards": "Replaces prototype example 5: identity unknown, request signals high"
  },
  {
    "id": "T20",
    "text": "hello grandma, dinner at 6?",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "nothing_to_check"
      ],
      "risk": "none"
    },
    "guards": "Nothing to check"
  }
];
