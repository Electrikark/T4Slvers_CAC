/* "Why this is a warning sign": one plain explanation per rule, with an official statement that
   backs it. "why" is Tech for Silvers wording based on the cited page; "official" is quoted
   word for word from that page, so anyone can check it. A rule without a page that says it
   directly has official: null and shows as Tech for Silvers advice.
   approvedBy stays null until a person has checked every quote against its page; the page
   shows a draft notice until then. */
window.TFS_WHY = {
  version: '2026-10-22-draft',
  approvedBy: 'Naman Raichura',
  approvedOn: '2026-10-23',
  sources: {
    ftcGift: { title: 'FTC: Avoiding and Reporting Gift Card Scams', url: 'https://consumer.ftc.gov/articles/avoiding-and-reporting-gift-card-scams' },
    ftcCrypto: { title: 'FTC: What To Know About Cryptocurrency and Scams', url: 'https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams' },
    ftcWire: { title: 'FTC: Wire Transfer Scams', url: 'https://consumer.ftc.gov/all-scams/wire-transfer-scams' },
    ftcTech: { title: 'FTC: How To Spot, Avoid, and Report Tech Support Scams', url: 'https://consumer.ftc.gov/articles/how-spot-avoid-and-report-tech-support-scams' },
    ftcCode: { title: 'FTC (MilitaryConsumer.gov): What’s a verification code and why would someone ask me for it?', url: 'https://www.militaryconsumer.gov/blog/whats-verification-code-why-would-someone-ask-me-it' },
    ftcFamily: { title: 'FTC: Grandkid and family emergency scams (tear sheet)', url: 'https://www.bulkorder.ftc.gov/sites/bulkorder.ftc.gov/files/publications/934a-pio-grandkidfamilyscams-tearsheet-aug_2023-508.pdf' },
    ftcAvoid: { title: 'FTC: How To Avoid a Scam', url: 'https://consumer.ftc.gov/articles/how-avoid-scam' },
    ftcPhishing: { title: 'FTC: How To Recognize and Avoid Phishing Scams', url: 'https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams' },
    ftcToll: { title: 'FTC consumer alert: Got a text about unpaid tolls? It’s probably a scam', url: 'https://www.consumer.ftc.gov/consumer-alerts/2025/01/got-text-about-unpaid-tolls-its-probably-scam' }
  },

  // Tier 1 rules: the reasons a message is marked Suspicious.
  rules: {
    'T1-GIFT': {
      why: 'Once someone has a gift card’s number and PIN, they can take the money on it, even while you still hold the card. That is why scammers ask for gift cards.',
      official: { quote: 'No real business or government agency will ever tell you to buy a gift card to pay them.', source: 'ftcGift' }
    },
    'T1-WIRE': {
      why: 'Money sent by wire transfer or cryptocurrency is very hard to get back. That is why scammers ask for it.',
      official: { quote: 'Only scammers demand payment in cryptocurrency.', source: 'ftcCrypto' },
      also: { quote: 'Wiring money with services like MoneyGram, Ria, and Western Union is like sending cash', source: 'ftcWire' }
    },
    'T1-REMOTE': {
      why: 'Scammers ask to control your computer or phone so they can pretend to find a problem and charge you to fix it.',
      official: { quote: 'Legitimate tech companies won’t contact you by phone, email, or text message to tell you there’s a problem', source: 'ftcTech' }
    },
    'T1-CODE': {
      why: 'A code sent to your phone is the second key to your account. With it, someone else can get in as you.',
      official: { quote: 'Anyone who asks you for your account verification code is a scammer.', source: 'ftcCode' }
    },
    'T1-CALLBACK': {
      why: 'Scammers send a scary alert with their own phone number, so when you call, you reach them instead of the real company.',
      official: { quote: 'Real security pop-up warnings and messages will never ask you to call a phone number.', source: 'ftcTech' }
    },
    'T1-DOMAIN': {
      why: 'This web address is made to look like a real company’s, but it is not theirs. A page there can look real and still steal what you type.',
      official: { quote: 'legitimate companies won’t email or text with a link to update your payment information.', source: 'ftcPhishing' }
    },
    'T1-COMBO': {
      why: 'Scammers pose as a relative in trouble and ask you to keep it secret, so you won’t check with the family first.',
      official: { quote: 'Look up your family member’s phone number yourself and call another family member to check out the story.', source: 'ftcFamily' }
    },
    'T1-POLICY': {
      why: 'The organization named in this message says it does not send messages that ask for this.',
      official: null
    }
  },

  // Wording warnings, used when no Tier 1 rule applies or to add one more reason.
  flags: {
    urgency: {
      why: 'Scammers rush you so you don’t have time to stop and check.',
      official: { quote: 'Scammers want you to act before you have time to think.', source: 'ftcAvoid' }
    },
    arrest_threat: {
      why: 'Threats of arrest or legal action are meant to frighten you into paying quickly.',
      official: { quote: 'They might threaten to arrest you, sue you, take away your driver’s or business license, or deport you.', source: 'ftcAvoid' }
    },
    secrecy: {
      why: 'Being told to keep it secret stops you from asking someone you trust.',
      official: { quote: 'tells you to keep it a secret', source: 'ftcFamily' }
    },
    family_emergency: {
      why: 'Scammers pretend to be a relative in trouble because you will want to help right away.',
      official: { quote: 'Look up your family member’s phone number yourself and call another family member to check out the story.', source: 'ftcFamily' }
    },
    new_number: {
      why: 'A “new number” lets a scammer pretend to be someone you know. The number you already have reaches the real person.',
      official: { quote: 'Look up your family member’s phone number yourself and call another family member to check out the story.', source: 'ftcFamily' }
    },
    secret_emergency_money: {
      why: 'An emergency plus a request for secrecy is how family emergency scams work.',
      official: { quote: 'tells you to keep it a secret', source: 'ftcFamily' }
    },
    pay_fee: {
      why: 'A surprise fee, fine or toll with a link to pay is a common way to get your card details.',
      official: { quote: 'a link that takes you to a page to enter your bank or credit card info', source: 'ftcToll' }
    },
    prize_refund: {
      why: 'A prize or refund you did not expect is bait. Real prizes do not cost money to collect.',
      official: { quote: 'Others will lie and say you won money in a lottery or sweepstakes but have to pay a fee to get it.', source: 'ftcAvoid' }
    },
    account_locked: {
      why: 'A message about a locked account is meant to worry you into acting fast.',
      official: { quote: 'claim there’s a problem with your account or your payment information — there isn’t', source: 'ftcPhishing' }
    },
    credential_request: {
      why: 'Real companies do not ask you to confirm passwords, card numbers or your Social Security number by message.',
      official: { quote: 'say you need to confirm some personal or financial information — you don’t', source: 'ftcPhishing' }
    },
    login_request: {
      why: 'A sign-in link in a message can lead to a copy of a real page that keeps your password.',
      official: { quote: 'say they’ve noticed some suspicious activity or log-in attempts — they haven’t', source: 'ftcPhishing' }
    },
    callback_now: {
      why: 'The number in the message may reach the scammer, not the company.',
      official: { quote: 'a phone number or website you know is real', source: 'ftcToll' }
    },
    peer_payment: {
      why: 'Payments by app usually can’t be undone, so scammers ask for them.',
      official: { quote: 'Scammers tell you to pay in a specific way.', source: 'ftcAvoid' }
    },
    share_code: {
      why: 'A code sent to your phone is the second key to your account.',
      official: { quote: 'Never give your verification code to someone else.', source: 'ftcCode' }
    },
    remote_access: {
      why: 'Someone controlling your device can see and change what is on it.',
      official: { quote: 'Legitimate tech companies won’t contact you by phone, email, or text message to tell you there’s a problem', source: 'ftcTech' }
    },
    device_alarm: {
      why: 'Fake virus warnings are used to get you to call a scammer.',
      official: { quote: 'Real security pop-up warnings and messages will never ask you to call a phone number.', source: 'ftcTech' }
    },
    tech_support_call: {
      why: 'Fake virus warnings are used to get you to call a scammer.',
      official: { quote: 'Real security pop-up warnings and messages will never ask you to call a phone number.', source: 'ftcTech' }
    },
    financial_callback: {
      why: 'An alarming payment alert with a number to call can lead you to a scammer.',
      official: { quote: 'say they’ve noticed some suspicious activity or log-in attempts — they haven’t', source: 'ftcPhishing' }
    },
    gift_card_payment: {
      why: 'Scammers ask for gift cards because the money can be taken as soon as they have the numbers.',
      official: { quote: 'No real business or government agency will ever tell you to buy a gift card to pay them.', source: 'ftcGift' }
    },
    gift_card_disclosure: {
      why: 'Whoever has a gift card’s numbers can take the money on it.',
      official: { quote: 'No real business or government agency will ever tell you to buy a gift card to pay them.', source: 'ftcGift' }
    },
    gift_card_purchase: {
      why: 'Being asked to buy gift cards for someone else is a common scam, even when the person seems familiar.',
      official: { quote: 'Only scammers will tell you to buy a gift card', source: 'ftcGift' }
    },
    crypto_or_wire: {
      why: 'Wire transfers and cryptocurrency are very hard to get back.',
      official: { quote: 'Only scammers demand payment in cryptocurrency.', source: 'ftcCrypto' }
    }
  }
};
