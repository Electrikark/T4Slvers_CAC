// Schema v3: assert canonical assessment; contact strength remains evidence, not a verdict.
/* Regression checks against the real reference list in data/store.js. */
window.TFS_REAL_CASES = [
  {
    "id": "R01",
    "text": "FasTrak: You have an unpaid toll of $4.15. Pay within 24 hours to avoid a fine: https://fastrak-ca-tolls.com/pay",
    "expect": {
      "assessment": "insufficient_evidence" /* spec v1.2: legacy contact conflict is Tier 2; only established Tier 1 wins. */,
      "contactStrength": "strong",
      "codes": [
        "brand_in_foreign_domain"
      ],
      "riskAtLeast": "elevated"
    },
    "guards": "Toll text with a lookalike site"
  },
  {
    "id": "R02",
    "text": "USPS: Your package could not be delivered. Update your address: https://usps.com-redelivery.top/track",
    "expect": {
      "assessment": "insufficient_evidence" /* spec v1.2: legacy contact conflict is Tier 2; only established Tier 1 wins. */,
      "contactStrength": "strong",
      "codes": [
        "official_domain_as_subdomain"
      ]
    },
    "guards": "Official name glued to a fake site with a hyphen"
  },
  {
    "id": "R03",
    "text": "PayPal: confirm your identity at https://paypa1.com/login",
    "expect": {
      "assessment": "insufficient_evidence" /* spec v1.2: legacy contact conflict is Tier 2; only established Tier 1 wins. */,
      "contactStrength": "strong",
      "codes": [
        "homoglyph"
      ]
    },
    "guards": "Digit 1 in place of letter l"
  },
  {
    "id": "R04",
    "text": "DMV: Final notice. Your license will be suspended. Pay fines at https://dmv.ca.gov-xyz.top",
    "expect": {
      "assessment": "insufficient_evidence" /* spec v1.2: legacy contact conflict is Tier 2; only established Tier 1 wins. */,
      "contactStrength": "strong",
      "codes": [
        "official_domain_as_subdomain"
      ],
      "flags": [
        "pay_fee"
      ]
    },
    "guards": "State agency domain under ca.gov"
  },
  {
    "id": "R05",
    "text": "Visit https://www.dmv.ca.gov/portal/ to renew",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "domain_official"
      ],
      "risk": "none"
    },
    "guards": "Official state agency link with no named sender"
  },
  {
    "id": "R06",
    "text": "Wells Fargo alert: https://wellsfargo.secure-account.help/verify",
    "expect": {
      "assessment": "insufficient_evidence" /* spec v1.2: legacy contact conflict is Tier 2; only established Tier 1 wins. */,
      "contactStrength": "strong",
      "codes": [
        "brand_in_foreign_domain"
      ]
    },
    "guards": "Brand used as a subdomain of another site"
  },
  {
    "id": "R07",
    "text": "From chase.alerts@gmail.com: your account is locked",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "free_email_address"
      ],
      "riskAtLeast": "elevated"
    },
    "guards": "A free email account never counts as a match"
  },
  {
    "id": "R08",
    "text": "From support@chase.com: your statement is ready",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "domain_official"
      ]
    },
    "guards": "Email address on an official domain"
  },
  {
    "id": "R09",
    "text": "IRS FINAL NOTICE: You owe back taxes. Pay with gift cards or a warrant will be issued. Call 888-555-0100",
    "expect": {
      "assessment": "suspicious",
      "codes": [
        "phone_not_on_file"
      ],
      "risk": "high",
      "flags": [
        "gift_card_payment",
        "arrest_threat"
      ]
    },
    "guards": "Classic government impersonation script"
  },
  {
    "id": "R10",
    "text": "Hi Grandma, it's me. I'm in trouble and need $2,000. Please send it by Zelle and don't tell Mom.",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "nothing_to_check"
      ],
      "risk": "high",
      "flags": [
        "secrecy",
        "family_emergency",
        "peer_payment"
      ]
    },
    "guards": "Grandparent scam; Zelle is a payment method here, not the sender"
  },
  {
    "id": "R11",
    "text": "Check out these apple pie recipes at allrecipes.com",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "no_claimed_identity"
      ],
      "risk": "none"
    },
    "guards": "Lowercase apple is fruit, not a claim"
  },
  {
    "id": "R12",
    "text": "Meeting notes: purchase order at purchase.com, see you at 6. e.g. 3.5 report.pdf",
    "expect": {
      "assessment": "insufficient_evidence",
      "notCodes": [
        "brand_in_foreign_domain",
        "typosquat"
      ],
      "risk": "none"
    },
    "guards": "chase inside purchase must not fire; e.g., 3.5 and report.pdf are not links"
  },
  {
    "id": "R13",
    "text": "Chase: We noticed a new sign-in. Review it at https://www.chase.com/personal/security. A team member will call you; read them the code we text you.",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "domain_official"
      ],
      "risk": "high",
      "flags": [
        "share_code"
      ]
    },
    "guards": "Real link, dangerous request"
  },
  {
    "id": "R14",
    "text": "hxxps://chase[.]com is the real site",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "domain_official"
      ]
    },
    "guards": "Defanged links are read correctly"
  },
  {
    "id": "R15",
    "text": "Google Docs: Your file is shared. Open https://docs.google.com/document/d/abc",
    "expect": {
      "assessment": "insufficient_evidence",
      "codes": [
        "user_content_platform"
      ]
    },
    "guards": "Anyone can publish on docs.google.com"
  },
  {
    "id": "R16",
    "text": "Amazon: verify your account at https://amaz0n-secure.com/login within 24 hours",
    "expect": {"assessment": "insufficient_evidence" /* spec v1.2: legacy contact conflict is Tier 2; only established Tier 1 wins. */, "contactStrength": "strong", "codes": ["brand_in_foreign_domain"], "flags": ["credential_request", "urgency"]},
    "guards": "A digit zero inside a brand name with extra words"
  }
];
