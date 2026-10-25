/* "Learn the signs": the scam guide and the practice messages. learn.html is written from this
   file by scripts/build-learn.cjs, so the page and the data can never say different things.
   Written for one person reading alone, at their own pace.

   Every message here is made up. Each step cites the official page it comes from, or is marked
   as Tech for Silvers advice (source: null) when no official page states it directly.
   approvedBy stays null until a person has checked every step against its source; the page
   shows a draft notice until then.

   scams[].example loads into the checker from check.html?example=<id>. Only these fixed
   examples can be loaded by a link, so no message text travels in a URL. Each one must get a
   warning from the checker (tests/learn-node.cjs). recover names the topic on recover.html for
   "If this already happened".

   practice[].marks are the words to notice, each found in the message exactly as written. An
   ordinary message has no marks. */
window.TFS_GUIDE = {
  version: '2026-10-24-draft',
  approvedBy: null,
  approvedOn: null,
  sources: {
    ftcAvoid: { title: 'FTC: How To Avoid a Scam', url: 'https://consumer.ftc.gov/articles/how-avoid-scam' },
    ftcFamily: { title: 'FTC: Grandkid and family emergency scams (tear sheet)', url: 'https://www.bulkorder.ftc.gov/sites/bulkorder.ftc.gov/files/publications/934a-pio-grandkidfamilyscams-tearsheet-aug_2023-508.pdf' },
    ftcGift: { title: 'FTC: Avoiding and Reporting Gift Card Scams', url: 'https://consumer.ftc.gov/articles/avoiding-and-reporting-gift-card-scams' },
    ftcCode: { title: 'FTC (MilitaryConsumer.gov): What’s a verification code and why would someone ask me for it?', url: 'https://www.militaryconsumer.gov/blog/whats-verification-code-why-would-someone-ask-me-it' },
    ftcTech: { title: 'FTC: How To Spot, Avoid, and Report Tech Support Scams', url: 'https://consumer.ftc.gov/articles/how-spot-avoid-and-report-tech-support-scams' },
    ftcPhishing: { title: 'FTC: How To Recognize and Avoid Phishing Scams', url: 'https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams' },
    ftcToll: { title: 'FTC consumer alert: Got a text about unpaid tolls? It’s probably a scam', url: 'https://www.consumer.ftc.gov/consumer-alerts/2025/01/got-text-about-unpaid-tolls-its-probably-scam' },
    ftcRomance: { title: 'FTC: What To Know About Romance Scams', url: 'https://consumer.ftc.gov/articles/what-know-about-romance-scams' }
  },

  // The four warning signs written by hand at the top of learn.html (id="sign-1" to "sign-4").
  signs: {
    1: '“Do this right now.”',
    2: '“You know who I am.”',
    3: '“Pay this way.”',
    4: '“There’s a problem. Or a prize.”'
  },

  scams: [
    {
      id: 'government', title: 'IRS and government impersonation',
      hook: 'Someone says they are from Social Security, the IRS or Medicare, and threatens arrest unless you act now.',
      example: { text: 'Social Security Administration: Your benefits are suspended. Call (202) 555-0199 today or a warrant will be issued for your arrest.', channel: 'unknown' },
      why: 'Threats are meant to frighten you into acting before you can think or ask anyone.',
      signs: [1, 2, 4],
      steps: [
        { text: 'Scammers use real agency names, like Social Security, the IRS or Medicare. A real name does not prove who is calling.', source: 'ftcAvoid' },
        { text: 'Do not give personal or financial information to someone who contacted you out of the blue.', source: 'ftcAvoid' },
        { text: 'Hang up. If you are worried, call the agency using the number on its official website or on a letter you already have.', source: null }
      ],
      recover: 'identity'
    },
    {
      id: 'family', title: 'A grandchild or relative in trouble',
      hook: 'A call or text from “your grandchild” who needs money fast, and asks you not to tell anyone.',
      example: { text: 'Grandma, please buy 3 Apple gift cards and send me the codes.', channel: 'text' },
      why: 'Scammers pretend to be someone you love, because you will want to help right away.',
      signs: [1, 2, 3],
      steps: [
        { text: 'Stop replying, or hang up. Then call your relative on the number you already have for them.', source: 'ftcFamily' },
        { text: 'If you cannot reach them, call another family member to check the story, even if you were asked to keep it secret.', source: 'ftcFamily' },
        { text: 'Anyone who asks you to pay with gift cards is a scammer.', source: 'ftcGift' }
      ],
      recover: 'money'
    },
    {
      id: 'giftcard', title: 'Pay with gift cards',
      hook: 'Someone asks you to buy gift cards and give them the numbers on the back.',
      example: { text: 'Your electric bill is past due. Buy a $300 Target gift card today and read me the numbers on the back to avoid shutoff.', channel: 'text' },
      why: 'Once someone has a gift card’s numbers, they can take the money on it, even while you still hold the card.',
      signs: [1, 3],
      steps: [
        { text: 'No real business or government agency will tell you to pay with a gift card.', source: 'ftcGift' },
        { text: 'Never read, text or send a photo of the numbers on the back of a gift card to someone who asked you to buy it.', source: 'ftcGift' },
        { text: 'If you already bought the cards, keep them and the receipt, and call the number on the back of the card right away.', source: 'ftcGift' }
      ],
      recover: 'giftcard'
    },
    {
      id: 'code', title: '“Read me the code we sent you”',
      hook: 'Someone asks for the code that was just texted to you, often saying they are from your bank.',
      example: { text: 'Chase: We noticed a new sign-in. A team member will call you; read them the code we text you.', channel: 'text' },
      why: 'A code sent to your phone is the second key to your account. With it, someone else can get in as you.',
      signs: [2, 4],
      steps: [
        { text: 'Never give a sign-in or verification code to anyone, even someone who says they are from the company.', source: 'ftcCode' },
        { text: 'If you are worried about your account, open the company’s app yourself, or call the number on your card.', source: 'ftcPhishing' }
      ],
      recover: 'code'
    },
    {
      id: 'computer', title: 'Computer help you did not ask for',
      hook: 'A pop-up, call or text says your computer has a virus, and gives you a number to call.',
      example: { text: 'Microsoft Security Alert: Your computer is infected. Do not turn it off. Call support now at (888) 555-0147.', channel: 'unknown' },
      why: 'Scammers pretend to find a problem so they can get into your computer and charge you to fix it.',
      signs: [1, 2, 4],
      steps: [
        { text: 'Do not call a number from a pop-up or a message. Real security warnings never ask you to call a phone number.', source: 'ftcTech' },
        { text: 'If you are worried about your computer, update your security software and run a scan, or ask someone you trust for help.', source: 'ftcTech' },
        { text: 'Do not let anyone you do not know connect to your computer or phone.', source: null }
      ],
      recover: 'remote'
    },
    {
      id: 'account', title: '“Your account is locked”',
      hook: 'An email or text says your bank or shopping account has a problem, and gives you a link to sign in.',
      example: { text: 'Chase: Your account has been locked. Sign in at chase-secure-login.net to restore access.', channel: 'text' },
      why: 'The link can lead to a copy of a real page that keeps whatever you type into it.',
      signs: [2, 4],
      steps: [
        { text: 'Do not use the link or phone number in the message.', source: 'ftcPhishing' },
        { text: 'Open the company’s app yourself, type its website address yourself, or call the number on your card or statement.', source: 'ftcPhishing' },
        { text: 'If you do not have an account with that company, delete the message.', source: 'ftcPhishing' }
      ],
      recover: 'code'
    },
    {
      id: 'toll', title: 'An unpaid toll or a small fee',
      hook: 'A text says you owe a small toll or delivery fee, and must pay today through a link.',
      example: { text: 'FasTrak: You have an unpaid toll of $4.15. Pay within 24 hours to avoid a fine: https://fastrak-ca-tolls.com/pay', channel: 'text' },
      why: 'The small amount makes it seem harmless. The real goal is your card details.',
      signs: [1, 4],
      steps: [
        { text: 'Do not click links in a text you did not expect, and do not reply.', source: 'ftcToll' },
        { text: 'If you are not sure, contact the toll agency or delivery company using a phone number or website you know is real.', source: 'ftcToll' },
        { text: 'Report the text as junk, or forward it to 7726 (SPAM). Then delete it.', source: 'ftcToll' }
      ],
      recover: 'money'
    },
    {
      id: 'prize', title: '“You won! Just pay a fee.”',
      hook: 'A call or message says you won a lottery, sweepstakes or prize, but you must pay first to collect it.',
      example: { text: 'Congratulations! You won $850,000 in the National Sweepstakes. Wire the $199 processing fee by Western Union today to claim it.', channel: 'unknown' },
      why: 'A real prize never costs money to collect. The fee is the scam.',
      signs: [3, 4],
      steps: [
        { text: 'If you have to pay to collect a prize, it is a scam.', source: 'ftcAvoid' },
        { text: 'Do not send money, or give your bank or card details, to claim it.', source: 'ftcAvoid' }
      ],
      recover: 'money'
    },
    {
      id: 'romance', title: 'A new friend online who needs money',
      hook: 'Someone you met online is kind and attentive, writes to you often, and then needs money.',
      example: { text: 'My darling, I can finally visit you, but I need $1,800 for the plane ticket. Please wire it by Western Union today.', channel: 'unknown' },
      why: 'Scammers build a warm friendship over weeks, so that sending money feels like helping someone you care about. It can happen to anyone.',
      signs: [2, 3],
      steps: [
        { text: 'Never send money or gifts to someone you have not met in person.', source: 'ftcRomance' },
        { text: 'If they ask for money, a wire transfer, gift cards or cryptocurrency, stop writing back.', source: 'ftcRomance' },
        { text: 'Search their name or story online with the word “scammer.” Others may have reported the same person.', source: 'ftcRomance' },
        { text: 'Talk with someone you trust about this friendship.', source: 'ftcRomance' }
      ],
      recover: 'money'
    }
  ],

  practice: [
    {
      id: 'practice-1', from: 'A text message', scam: true,
      text: 'Medicare: Your card will be cancelled today. Reply with your Medicare number and date of birth to keep your benefits.',
      marks: [
        { words: 'Medicare:', note: 'A real agency’s name can be copied by anyone.' },
        { words: 'cancelled today', note: 'A threat with a deadline.' },
        { words: 'Reply with your Medicare number and date of birth', note: 'A request for personal details you did not expect.' }
      ],
      todo: { text: 'Do not reply. If you are worried, call Medicare at 1-800-MEDICARE (1-800-633-4227).', source: null }
    },
    {
      id: 'practice-2', from: 'A text message', scam: false,
      text: 'Hi, this is Dr. Patel’s office reminding you of your appointment on Tuesday at 10:30. Reply C to confirm, or call the office if you need to change it.',
      marks: [],
      todo: { text: 'It does not ask for money, codes or personal details. If you are not sure, call the office on the number you already have.', source: null }
    },
    {
      id: 'practice-3', from: 'A text message', scam: true,
      text: 'Amazon: A charge of $749.99 was placed on your account. If you did not make this purchase, call us now at (877) 555-0123.',
      marks: [
        { words: 'A charge of $749.99', note: 'A sudden, alarming problem.' },
        { words: 'call us now at (877) 555-0123', note: 'The number in the message may reach the scammer, not the company.' }
      ],
      todo: { text: 'Open the Amazon app or website yourself and look at your orders. Do not call the number in the message.', source: 'ftcPhishing' }
    },
    {
      id: 'practice-4', from: 'A text message', scam: true,
      text: 'Grandpa, it’s me. I got in a car accident and need $2,000 for bail right now. Please don’t tell Mom.',
      marks: [
        { words: 'Grandpa, it’s me.', note: 'It says “it’s me” instead of a name. Anyone can write that.' },
        { words: 'right now', note: 'A rush, so you do not stop to check.' },
        { words: 'Please don’t tell Mom.', note: 'Keeping it secret stops you from checking with the family.' }
      ],
      todo: { text: 'Call your grandchild, or their parent, on the number you already have.', source: 'ftcFamily' }
    },
    {
      id: 'practice-5', from: 'A text from your daughter’s usual number', scam: false,
      text: 'Hi Mom, I’m running late. I’ll be there by 6. Love you.',
      marks: [],
      todo: { text: 'It comes from the number you already have, and asks for nothing.', source: null }
    },
    {
      id: 'practice-6', from: 'A message from someone you met online', scam: true,
      text: 'I have never felt this way about anyone. I am stuck overseas and my bank card is frozen. Please buy $500 in Apple gift cards and send me the codes.',
      marks: [
        { words: 'I have never felt this way about anyone.', note: 'Strong feelings, quickly, from someone you have not met.' },
        { words: 'I am stuck overseas', note: 'A reason they cannot meet you or pay for themselves.' },
        { words: 'buy $500 in Apple gift cards and send me the codes', note: 'Whoever has the codes can take the money on the cards.' }
      ],
      todo: { text: 'Never send money or gifts to someone you have not met in person.', source: 'ftcRomance' }
    }
  ]
};
