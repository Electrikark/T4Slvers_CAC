/* "I already did something" help cards. Each step cites the official page it comes from, or is
   marked as Tech for Silvers advice (source: null) when no official page states it directly.
   approvedBy stays null until a person has checked every step against its source; the page
   shows a draft notice until then.

   examples: short descriptions used to build and tune the search (development only). The
   volunteer test descriptions are kept separately and never added here. */
window.TFS_HELP = {
  version: '2026-10-24-draft',
  approvedBy: null,
  approvedOn: null,
  sources: {
    ftcScammed: { title: 'FTC: What To Do if You Were Scammed', url: 'https://consumer.ftc.gov/articles/what-do-if-you-were-scammed' },
    ftcHacked: { title: 'FTC: How To Recover Your Hacked Email or Social Media Account', url: 'https://consumer.ftc.gov/articles/how-recover-your-hacked-email-or-social-media-account' },
    ftcGift: { title: 'FTC: Avoiding and Reporting Gift Card Scams', url: 'https://consumer.ftc.gov/articles/avoiding-and-reporting-gift-card-scams' },
    ftcSpam: { title: 'FTC: How To Recognize and Report Spam Text Messages', url: 'https://consumer.ftc.gov/articles/how-recognize-and-report-spam-text-messages' },
    aarp: { title: 'AARP Fraud Watch Network Helpline', url: 'https://www.aarp.org/money/scams-fraud/helpline/' },
    itrc: { title: 'ITRC: Identity recovery support', url: 'https://www.idtheftcenter.org/about-us/' },
    itrcContact: { title: 'ITRC: Contact and hours', url: 'https://www.idtheftcenter.org/contact-us/' }
  },
  cards: [
    {
      id: 'code', title: 'I gave someone a code or password',
      summary: 'Someone may be able to get into your account. Lock it again first.',
      steps: [
        { text: 'If you can still sign in, change the password. Open the official app, or type the website address yourself.', source: 'ftcScammed' },
        { text: 'Turn on two-step sign-in, so a password alone is not enough.', source: 'ftcScammed' },
        { text: 'Sign out of all other devices, and check that the recovery email and phone number on the account are yours.', source: 'ftcHacked' },
        { text: 'If you cannot sign in, use the company’s account recovery page.', source: 'ftcScammed' },
        { text: 'If the code or password was for a bank or card, call the number on the back of your card and tell them.', source: null }
      ],
      examples: [
        'I told someone my verification code', 'I read the six numbers to the man on the phone', 'I gave them the code that came in a text',
        'they asked for the code my bank sent and I gave it', 'I shared my password', 'I typed my password on a link they sent',
        'someone called and I read them the security code', 'I gave out my one time passcode', 'I told the caller my PIN',
        'my login got taken after I gave the code'
      ]
    },
    {
      id: 'remote', title: 'I let someone into my computer or phone',
      summary: 'They may have left something behind. Clean the device, then change passwords.',
      steps: [
        { text: 'Update your security software so it has the latest protection.', source: 'ftcScammed' },
        { text: 'Run a scan and delete anything it finds.', source: 'ftcScammed' },
        { text: 'Change your passwords and turn on two-step sign-in.', source: 'ftcScammed' },
        { text: 'If you opened your bank or typed card details while they were connected, call your bank using the number on your card.', source: null }
      ],
      examples: [
        'I let tech support control my computer', 'I installed AnyDesk because they told me to', 'they took over my screen',
        'I downloaded the program the caller asked for', 'someone was moving my mouse', 'I gave remote access to Microsoft support',
        'they said my computer had a virus and I let them fix it', 'I installed TeamViewer for the technician',
        'the pop up told me to call and they got into my laptop', 'I let a stranger connect to my phone'
      ]
    },
    {
      id: 'giftcard', title: 'I paid with gift cards or shared gift card numbers',
      summary: 'Call the gift card company right away. Some can freeze the money.',
      steps: [
        { text: 'Report it to the gift card company right away, no matter how long ago it happened. Use the number on the back of the card.', source: 'ftcGift' },
        { text: 'Tell them a scammer tricked you into giving them the card number and PIN, and ask for your money back.', source: 'ftcScammed' },
        { text: 'Keep the gift card and the store receipt.', source: 'ftcGift' },
        { text: 'Report it to the FTC at ReportFraud.ftc.gov.', source: 'ftcGift' }
      ],
      examples: [
        'I bought gift cards and sent the numbers', 'I read the numbers on the back of the cards', 'they wanted Apple cards and I got them',
        'I sent pictures of the gift cards', 'I paid the fine with Google Play cards', 'I scratched off the cards and gave the codes',
        'my grandson needed gift cards for bail', 'I bought Target cards for my boss', 'they told me to pay with store cards',
        'I gave the gift card PIN to the caller'
      ]
    },
    {
      id: 'money', title: 'I sent money or paid',
      summary: 'Act fast. What to do depends on how you paid.',
      choose: 'How did you pay?',
      children: ['money-bank', 'money-app', 'money-wire', 'money-credit', 'money-crypto', 'money-cash'],
      examples: [
        'I sent them money', 'I paid what they asked', 'I already paid the bill they texted me about', 'I transferred money',
        'I paid the toll on the link', 'I paid the fee to release my package', 'I sent money to help my grandson',
        'I paid them to fix my account', 'I lost money', 'I paid before I realized'
      ]
    },
    {
      id: 'money-bank', parent: 'money', title: 'Zelle, a bank transfer or a debit card',
      steps: [
        { text: 'Report it to your bank or credit union right away. Use the number on the back of your card, or sign in through their app.', source: 'ftcScammed' },
        { text: 'Ask them to reverse the payment and refund your money.', source: 'ftcScammed' }
      ],
      examples: ['I sent it with Zelle', 'I did a bank transfer', 'I paid with my debit card', 'it came out of my checking account', 'I moved money from my bank']
    },
    {
      id: 'money-app', parent: 'money', title: 'A payment app (Venmo, Cash App, PayPal)',
      steps: [
        { text: 'Report it to the payment app right away.', source: 'ftcScammed' },
        { text: 'Ask them to reverse the payment and refund your money.', source: 'ftcScammed' }
      ],
      examples: ['I paid with Cash App', 'I sent it on Venmo', 'I paid through PayPal', 'I used the payment app on my phone']
    },
    {
      id: 'money-wire', parent: 'money', title: 'A wire transfer (Western Union, MoneyGram)',
      steps: [
        { text: 'Report it to the wire transfer company right away.', source: 'ftcScammed' },
        { text: 'Tell them a scammer tricked you into sending money, and ask for a refund.', source: 'ftcScammed' }
      ],
      examples: ['I wired money', 'I sent it by Western Union', 'I used MoneyGram', 'I did a wire transfer at the store']
    },
    {
      id: 'money-credit', parent: 'money', title: 'A credit card',
      steps: [
        { text: 'Report it to your credit card company right away. Use the number on the back of the card, or sign in through their app.', source: 'ftcScammed' },
        { text: 'Ask them to refund your money.', source: 'ftcScammed' }
      ],
      examples: ['I paid with my credit card', 'I gave them my card number', 'I put it on my Visa', 'I typed my card into the website']
    },
    {
      id: 'money-crypto', parent: 'money', title: 'Bitcoin or another cryptocurrency',
      steps: [
        { text: 'Contact the cryptocurrency exchange or the ATM company right away.', source: 'ftcScammed' },
        { text: 'Tell them it was a fraudulent transaction and ask them to reverse it.', source: 'ftcScammed' },
        { text: 'Report it at ReportFraud.ftc.gov.', source: 'ftcScammed' }
      ],
      examples: ['I put cash in a Bitcoin machine', 'I sent Bitcoin', 'I used a crypto ATM', 'I bought crypto and sent it to them']
    },
    {
      id: 'money-cash', parent: 'money', title: 'Cash sent in the mail or by courier',
      steps: [
        { text: 'If you mailed it with the U.S. Postal Service, call the Postal Inspection Service right away at 1-877-876-2455. They may be able to stop a package that has not been delivered.', source: 'ftcScammed' },
        { text: 'If you used FedEx, UPS or another company, contact them as soon as possible.', source: 'ftcScammed' }
      ],
      examples: ['I mailed cash', 'I put money in an envelope and sent it', 'a courier came to pick up the cash', 'I sent cash by FedEx']
    },
    {
      id: 'identity', title: 'I gave my Social Security number or other personal details',
      summary: 'Someone could open accounts in your name. Get a recovery plan.',
      steps: [
        { text: 'If someone has already used your information, report it at IdentityTheft.gov and follow the recovery plan it gives you.', source: 'ftcScammed' },
        { text: 'If it has not been used, or you are not sure, go to IdentityTheft.gov/databreach and follow the steps there.', source: 'ftcScammed' }
      ],
      support: {
        title: 'Need help protecting your identity?',
        name: 'Identity Theft Resource Center (ITRC)',
        description: 'Free guidance if your personal details were exposed or used by someone else.',
        phone: '+18884005530',
        phoneLabel: '1-888-400-5530',
        hours: 'Monday–Friday, 6 a.m.–5 p.m. Pacific / 9 a.m.–8 p.m. Eastern.',
        source: 'itrc',
        contactSource: 'itrcContact',
        checkedOn: 'October 24, 2026'
      },
      examples: [
        'I gave them my Social Security number', 'I told them my date of birth and address', 'I filled out a form with my personal information',
        'I gave my Medicare number', 'they have my social', 'I sent a picture of my driver license', 'I gave my bank account number',
        'I answered all their questions about me'
      ]
    },
    {
      id: 'other', title: 'Something else, or I am not sure',
      summary: 'You do not have to work it out alone.',
      steps: [
        { text: 'Do not reply to the message or call the number in it.', source: null },
        { text: 'Forward a scam text to 7726 (SPAM), and report it at ReportFraud.ftc.gov.', source: 'ftcSpam' },
        { text: 'Call the AARP Fraud Watch Network Helpline at 877-908-3360 (Monday–Friday, 8 a.m.–8 p.m. Eastern) for free guidance about a possible scam. No AARP membership needed.', source: 'aarp' },
        { text: 'It is fine to ask someone you trust to help you.', source: null }
      ],
      examples: [
        'I got a weird text', 'I clicked the link but did not type anything', 'I am not sure if it was a scam', 'I replied to the message',
        'I called the number back', 'something feels wrong', 'I think I got scammed', 'I need help'
      ]
    }
  ]
};
