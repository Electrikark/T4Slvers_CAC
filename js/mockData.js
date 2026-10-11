/* Text examples run through the real engine. Channels are fixture labels;
   loading a fixture does not choose a channel for the person. */
window.demoScenarios = {
  bank: {
    label: '1. Bank link lookalike', channelLabel: 'Text',
    input: 'Chase: Your account has been locked. Sign in at chase-secure-login.net to restore access.'
  },
  code: {
    label: '2. Real bank link, risky request', channelLabel: 'Text',
    input: 'Chase: We noticed a new sign-in. Review it at https://www.chase.com/personal/security. A team member will call you; read them the code we text you.'
  },
  phone: {
    label: '3. Unknown phone number', channelLabel: 'Not sure',
    input: 'This is your bank calling from (202) 555-0148. Please call us back about your account.'
  },
  support: {
    label: '4. Tech-support pressure', channelLabel: 'Not sure',
    input: 'Microsoft: Install AnyDesk and grant remote access. Keep this between us. Visit https://microsoft.com.'
  },
  toll: {
    label: '5. Unpaid toll text', channelLabel: 'Text',
    input: 'FasTrak: You have an unpaid toll of $4.15. Pay within 24 hours to avoid a fine: https://fastrak-ca-tolls.com/pay'
  },
  family: {
    label: '6. Grandchild gift-card request', channelLabel: 'Text',
    input: 'Grandma, I’m in trouble. Please buy 3 Apple gift cards and send me the codes.'
  },
  delivery: {
    label: '7. Delivery link', channelLabel: 'Text',
    input: 'USPS: Your package is out for delivery. Track it at https://tools.usps.com/go/TrackConfirmAction'
  }
};
