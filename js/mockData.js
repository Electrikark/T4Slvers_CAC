/* Workshop examples. Every example except the screenshot runs through the real checker
   (js/engine) against the reference list (data/store.js). The screenshot example stays scripted
   because the app does not read images yet. Phone numbers are fictional 555 numbers. */
window.demoScenarios = {
  bank: {
    label: '1. Bank link lookalike', type: 'paste',
    input: 'Chase: Your account has been locked. Sign in at chase-secure-login.net to restore access.'
  },
  code: {
    label: '2. Real bank link, risky request', type: 'paste',
    input: 'Chase: We noticed a new sign-in. Review it at https://www.chase.com/personal/security. A team member will call you; read them the code we text you.'
  },
  screenshot: {
    label: '3. Screenshot with a hidden link', type: 'upload', input: '',
    result: {
      schemaVersion: 1,
      state: 'unknown', claimedIdentity: 'Chase (in the sample screenshot)', claimSource: 'explicit',
      channel: 'A screenshot example; no image was read', inspected: 'Visible text: chase.com · destination unknown',
      description: 'We do not have enough information to check this yet.',
      checks: [{ status: 'UNKNOWN', code: 'screenshot_not_read', detail: 'The sample screenshot shows "chase.com". A picture cannot reveal where the original button or hidden link actually leads. Your selected image has not been read.', source: 'Scripted screenshot example; no image reading yet' }],
      meaning: 'Visible link text and the actual destination can differ. Missing evidence is not a sign that a link is fine.',
      requestRisk: { level: 'none', flags: [] },
      actionWarnings: ['Do not open the link yet.'],
      nextSteps: ['If you know how to copy a link without opening it, paste the actual address here.', 'Otherwise, ask a trusted person to help or contact the bank directly.'],
      offerPaste: true
    }
  },
  phone: {
    label: '4. Unknown phone number', type: 'paste',
    input: 'This is your bank calling from (202) 555-0148. Please call us back about your account.'
  },
  support: {
    label: '5. Fake tech-support pop-up', type: 'paste',
    input: 'MICROSOFT SECURITY ALERT: Your device is locked! Call (202) 555-0199 now. Pay a support fee and grant remote access.'
  },
  toll: {
    label: '6. Unpaid toll text', type: 'paste',
    input: 'FasTrak: You have an unpaid toll of $4.15. Pay within 24 hours to avoid a fine: https://fastrak-ca-tolls.com/pay'
  },
  family: {
    label: '7. Grandchild in trouble', type: 'paste',
    input: "Hi Grandma, it's me. I'm in trouble and need $2,000. Please send it by Zelle and don't tell Mom."
  },
  delivery: {
    label: '8. Real delivery link', type: 'paste',
    input: 'USPS: Your package is out for delivery. Track it at https://tools.usps.com/go/TrackConfirmAction'
  }
};

// Real file selections must never inherit facts from a scripted example.
window.screenshotResult = {
  schemaVersion: 1,
  state: 'unknown',
  claimedIdentity: 'Not assessed — image not read',
  claimSource: 'none',
  channel: 'A screenshot selected on this device',
  inspected: 'No image content or hidden links inspected',
  description: 'This prototype cannot read screenshots yet.',
  checks: [{
    status: 'UNKNOWN', code: 'screenshot_not_read',
    detail: 'Your image has not been read. We cannot identify a sender or see where a button leads from this file.',
    source: 'Image analysis is not available in this prototype.'
  }],
  meaning: 'No conclusion can be drawn from the selected image. A displayed website name can differ from a hidden link destination.',
  requestRisk: { level: 'none', flags: [] },
  actionWarnings: ['Pause before opening links or sharing personal details.'],
  nextSteps: ['Paste the message text or a complete link if you can copy it without opening it.', 'If you are unsure how, ask a trusted person to help or contact the organization through a contact you already trust.'],
  offerPaste: true
};
