/* How-to guides for getting a message into the checker. One source for both places they appear:
   help.html (the full guides) and the help beside the message box on check.html. Both are
   written from this file by scripts/build-howto.cjs, so the two can never say different things.

   Two kinds of guide:

   kind: 'phone'  Steps that happen in the phone's own apps (Messages, Mail, the screenshot
                  buttons, the photo picker). Nobody can check these from a computer. Each
                  device has a `checked` record that stays null until a person follows the steps
                  on a real phone. Until then the page says "Not yet checked on a phone".
                  A record counts only when every field is filled in (see CHECK_FIELDS in the
                  build script). It describes one phone and one app version, never "all iPhones".
                  Pictures of the phone's screens show only for a checked device.

   kind: 'app'    Steps on this app's own screens. The build fails if any label a step quotes
                  (`uiLabels`) is missing from check.html, and tests/ocr-browser/howto.spec.cjs
                  walks the real screens. Pictures are captured from the app itself by
                  scripts/capture-howto.cjs.

   Writing rules: one action per step, the words on the button in quotes exactly as shown,
   no timers, no "simply", no "just". */
window.TFS_HOWTO = {
  version: '2026-10-24-draft',
  guides: [
    {
      id: 'copy-text', kind: 'phone', inline: 'paste',
      title: 'Copy a text message',
      goal: 'Copy the words of a text so you can paste them into the checker.',
      safety: 'Press on the words, not on a link. Pressing on a link can open the website.',
      devices: [
        {
          id: 'iphone', label: 'On an iPhone', app: 'Messages',
          steps: [
            { text: 'Open the Messages app, then open the conversation with the message.' },
            { text: 'Press and hold your finger on the message bubble until a menu appears.' },
            { text: 'Tap “Copy”.' },
            { text: 'Come back to Safety4Seniors. Then follow “Paste the message into the checker”.' }
          ],
          checked: null
        },
        {
          id: 'android', label: 'On an Android phone', app: 'Google Messages',
          steps: [
            { text: 'Open the Messages app, then open the conversation with the message.' },
            { text: 'Press and hold the message until it is highlighted.' },
            { text: 'Tap the copy button at the top of the screen. It may look like two squares on top of each other. If you see three dots instead, tap them and choose “Copy text”.' },
            { text: 'Come back to Safety4Seniors. Then follow “Paste the message into the checker”.' }
          ],
          checked: null
        }
      ]
    },
    {
      id: 'copy-email', kind: 'phone', inline: 'paste',
      title: 'Copy an email',
      goal: 'Copy the words of an email so you can paste them into the checker.',
      safety: 'Press on the words, not on a link or a button in the email.',
      devices: [
        {
          id: 'iphone', label: 'On an iPhone', app: 'Mail',
          steps: [
            { text: 'Open the email in the Mail app.' },
            { text: 'Press and hold on a word in the email until it is highlighted and a menu appears.' },
            { text: 'Tap “Select All”. If you do not see it, drag the small handles at each end of the highlight to cover the whole message.' },
            { text: 'Tap “Copy”.' },
            { text: 'Come back to Safety4Seniors. Then follow “Paste the message into the checker”.' }
          ],
          checked: null
        },
        {
          id: 'android', label: 'On an Android phone', app: 'Gmail',
          steps: [
            { text: 'Open the email in the Gmail app.' },
            { text: 'Press and hold on a word in the email until it is highlighted.' },
            { text: 'Tap “Select all”. If you do not see it, drag the small handles at each end of the highlight to cover the whole message.' },
            { text: 'Tap “Copy”.' },
            { text: 'Come back to Safety4Seniors. Then follow “Paste the message into the checker”.' }
          ],
          checked: null
        }
      ]
    },
    {
      id: 'paste', kind: 'phone', inline: 'paste',
      title: 'Paste the message into the checker',
      goal: 'Put the words you copied into the message box, then check them.',
      devices: [
        {
          id: 'iphone', label: 'On an iPhone', app: 'Safari',
          steps: [
            { text: 'On the Check a message page, under “Where did the message arrive?”, choose where the message came from.' },
            { text: 'Tap once inside the big box under “Add the message”. The keyboard opens.' },
            { text: 'Tap inside the box again, or press and hold, until you see “Paste”.' },
            { text: 'Tap “Paste”.' },
            { text: 'Read the box and make sure the whole message is there.' },
            { text: 'Tap “Check this message”.' }
          ],
          checked: null
        },
        {
          id: 'android', label: 'On an Android phone', app: 'Chrome',
          steps: [
            { text: 'On the Check a message page, under “Where did the message arrive?”, choose where the message came from.' },
            { text: 'Tap inside the big box under “Add the message”. The keyboard opens.' },
            { text: 'Press and hold inside the box until you see “Paste”, then tap it. Some keyboards also show the copied words in a strip above the keys. Tapping them there works too.' },
            { text: 'Read the box and make sure the whole message is there.' },
            { text: 'Tap “Check this message”.' }
          ],
          checked: null
        }
      ],
      uiLabels: ['Where did the message arrive?', 'Add the message', 'Check this message']
    },
    {
      id: 'take-screenshot', kind: 'phone', inline: 'screenshot',
      title: 'Take a screenshot of a message',
      goal: 'Save a picture of the message, if copying it does not work.',
      safety: 'Press the buttons and let go quickly. Holding them down can start an emergency call or turn the phone off.',
      devices: [
        {
          id: 'iphone-faceid', label: 'On an iPhone without a Home button', app: 'Any app',
          steps: [
            { text: 'Open the message so that all of it is on the screen.' },
            { text: 'Press the side button and the volume up button at the same time, then let go quickly.' },
            { text: 'A small picture appears in the bottom corner. You can leave it. The screenshot is saved in your Photos app.' }
          ],
          checked: null
        },
        {
          id: 'iphone-home', label: 'On an iPhone with a Home button', app: 'Any app',
          steps: [
            { text: 'Open the message so that all of it is on the screen.' },
            { text: 'Press the side or top button and the Home button at the same time, then let go quickly.' },
            { text: 'A small picture appears in the bottom corner. You can leave it. The screenshot is saved in your Photos app.' }
          ],
          checked: null
        },
        {
          id: 'android', label: 'On an Android phone', app: 'Any app',
          steps: [
            { text: 'Open the message so that all of it is on the screen.' },
            { text: 'Press the power button and the volume down button at the same time, then let go quickly.' },
            { text: 'The screenshot is saved in your Photos or Gallery app, usually in a folder called Screenshots.' }
          ],
          checked: null
        }
      ],
      tips: [
        'Take one screenshot for one message.',
        'If the message has a sign-in code or an account number in it, copy the words instead, or cover that part. This checker does not need them.'
      ]
    },
    {
      id: 'choose-screenshot', kind: 'phone', inline: 'screenshot',
      title: 'Choose a saved screenshot',
      goal: 'Pick the screenshot so the app can read the words in it.',
      devices: [
        {
          id: 'iphone', label: 'On an iPhone', app: 'Safari',
          steps: [
            { text: 'On the Check a message page, tap “Or use a screenshot”.' },
            { text: 'A menu opens. Tap “Photo Library”.' },
            { text: 'Find your screenshot. The newest pictures are usually at the bottom. Tap it.' },
            { text: 'Wait while the app reads the words. The first time can take a minute.' },
            { text: 'Then follow “Check the words read from a screenshot”.' }
          ],
          checked: null
        },
        {
          id: 'android', label: 'On an Android phone', app: 'Chrome',
          steps: [
            { text: 'On the Check a message page, tap “Or use a screenshot”.' },
            { text: 'Your phone opens a picture chooser. If it asks where to look, choose Photos or Files, then Screenshots.' },
            { text: 'Tap your screenshot.' },
            { text: 'Wait while the app reads the words. The first time can take a minute.' },
            { text: 'Then follow “Check the words read from a screenshot”.' }
          ],
          checked: null
        }
      ],
      uiLabels: ['Or use a screenshot'],
      tips: ['The picture stays on your phone. The app reads it on your phone and does not upload it.']
    },
    {
      id: 'review-screenshot', kind: 'app', inline: 'screenshot',
      title: 'Check the words read from a screenshot',
      goal: 'Make sure the app read the picture correctly before it checks the message.',
      why: 'Reading a picture can drop or change words. One missing word, like “not”, can change what a message asks you to do. The checker only checks the words in the box, so the box must match your picture.',
      steps: [
        { text: 'The words read from your picture appear in the message box. Your screenshot is shown further down so you can compare.', picture: 'review-box' },
        { text: 'Compare every line with the picture. Look closely at links, phone numbers, amounts, and small words like “not” and “never”.' },
        { text: 'Fix anything that is wrong: tap in the box and type. Delete words that are not part of the message, like the time or the name of your phone company at the top.' },
        { text: 'If a note says the picture was hard to read, or you cannot check every word, tap “Clear screenshot and paste instead” and copy the message instead.', picture: 'review-clear' },
        { text: 'When the box matches the picture, tick “I compared the full text with the screenshot and fixed any errors.” The “Check this message” button works only after you tick it.', picture: 'review-tick' },
        { text: 'If you change the words after ticking, the tick comes off. Tick it again when you are done.' },
        { text: 'Tap “Check this message”.' }
      ],
      uiLabels: ['Clear screenshot and paste instead', 'I compared the full text with the screenshot and fixed any errors.', 'Check this message', 'Check the text against your screenshot'],
      tips: ['A check from a screenshot can warn you about a message. It never says the details match our reviewed list, because the words came from a picture.']
    }
  ],
  // Pictures of this app's own screens, made by scripts/capture-howto.cjs. Each file is checked
  // to exist by the build. Alt text says what the picture shows, not what to do.
  pictures: {
    'review-box': { file: 'assets/how-to/review-box.png', alt: 'The message box under “Add the message”, holding the words read from the practice picture: Unknown number, Text message, and the message about gift cards.' },
    'review-clear': { file: 'assets/how-to/review-clear.png', alt: 'The button “Clear screenshot and paste instead”, under the instructions for comparing the text with the screenshot.' },
    'review-tick': { file: 'assets/how-to/review-tick.png', alt: 'The tick box “I compared the full text with the screenshot and fixed any errors.”, ticked, above the “Check this message” button.' }
  },
  // Made-up messages for practice. They are never real and say so on the page.
  practice: {
    paste: 'PRACTICE MESSAGE: Hi, this is the library. Your book is ready to pick up at the front desk.',
    screenshot: {
      file: 'assets/how-to/practice-screenshot.png',
      alt: 'A picture of a made-up text message, labelled PRACTICE PICTURE. The message says: Grandma, please buy 3 Apple gift cards and send me the codes.',
      label: 'PRACTICE PICTURE · made-up message',
      text: 'Grandma, please buy 3 Apple gift cards and send me the codes.',
      // Saving a picture from a web page happens in the browser's own menu, so it is a phone step.
      devices: [
        {
          id: 'iphone', label: 'On an iPhone', app: 'Safari',
          steps: [
            { text: 'Press and hold the practice picture until a menu appears.' },
            { text: 'Tap “Save to Photos”. On some iPhones it says “Add to Photos”.' }
          ],
          checked: null
        },
        {
          id: 'android', label: 'On an Android phone', app: 'Chrome',
          steps: [
            { text: 'Press and hold the practice picture until a menu appears.' },
            { text: 'Tap “Download image”. The picture goes to your Downloads, or to Photos or Gallery.' }
          ],
          checked: null
        }
      ]
    },
    // A made-up example from data/scam-guide.js that check.html can load by link (?example=).
    exampleId: 'family'
  }
};
