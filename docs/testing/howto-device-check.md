# How-to guides: checking the steps on a real phone

The guides in `help.html`, linked from beside the message box on `check.html`, describe two kinds of steps:

- **Steps on this app's own screens** (the review of screenshot text). These are checked by
  `tests/ocr-browser/howto.spec.cjs` and the label check in `scripts/build-howto.cjs`. Nothing to do
  by hand.
- **Steps in the phone's own apps** (Messages, Mail, Gmail, the screenshot buttons, the photo
  picker, saving a picture). No computer test can check these. Each one shows
  "Not yet checked on a phone" until a person follows it on a real phone and records it here.

## What a check means, and what it does not

A record says: *this person followed these exact steps on this one phone, with this system and app
version, on this date, and they worked.* It does **not** mean the steps work on every phone, and it
says nothing about whether older adults can follow them on their own. That needs a separate test
with older adults on their own phones (completion, mistakes, help needed), and it has not been run.

A family member's phone is fine for a check, as long as the record names that phone.

## How to check one guide

1. Open the deployed site on the phone (or `npm run preview:ocr` on the same Wi-Fi).
2. Open **How to use**, choose your phone near the top, then choose the guide, and follow each step exactly as written,
   with a made-up message (the practice message or one you text to yourself).
3. If any step does not match the screen, **fix the step text in `data/how-to.js` first**, then
   follow it again from the start. Do not record a check for steps you changed after following them.
4. Find the versions: iPhone, Settings > General > About > iOS Version. Android, Settings > About
   phone > Android version. The app version is optional; the app name is required.
5. Fill in that device's `checked` record in `data/how-to.js`:

   ```js
   checked: { by: 'Your Name', on: '2026-10-25', phone: 'iPhone 13', system: 'iOS 26.0.1', app: 'Messages' }
   ```

   Every field is required. `app` must contain the app the steps name (for example `Messages`).
   The build refuses a record with a missing field, a placeholder name, a date that is not real or is
   in the future, or a different app.
6. Run `node scripts/build-howto.cjs`, then `npm test`. Update the count in the test
   `the shipped pages claim no phone check` in `tests/howto-node.cjs` (it guards against a check
   appearing by accident).

## Pictures of the phone's screens

Pictures show only for a device with a complete `checked` record. To add one:

1. While following the guide, take a screenshot at the step (for example, with the Messages menu
   open). Use a made-up message, never a real one: no real names, numbers or codes.
2. Save it as a PNG in `assets/how-to/`, named `<guide>-<device>-<step>.png`
   (for example `copy-text-iphone-2.png`).
3. Add it to `pictures` in `data/how-to.js` with alt text that says what the picture shows, and set
   `picture: '<key>'` on that step.
4. Rebuild and test.

## The list to check

| Guide | Device id | App the steps name |
|---|---|---|
| Copy a text message | `iphone` | Messages |
| Copy a text message | `android` | Google Messages |
| Copy an email | `iphone` | Mail |
| Copy an email | `android` | Gmail |
| Paste the message into the checker | `iphone` | Safari |
| Paste the message into the checker | `android` | Chrome |
| Take a screenshot | `iphone-faceid` | Any app |
| Take a screenshot | `iphone-home` | Any app |
| Take a screenshot | `android` | Any app |
| Choose a saved screenshot | `iphone` | Safari |
| Choose a saved screenshot | `android` | Chrome |
| Practice: save the practice picture | `iphone` | Safari |
| Practice: save the practice picture | `android` | Chrome |

Things worth watching for while checking, because they are the likeliest to be wrong:

- **Paste on iPhone:** whether one tap or a press and hold shows "Paste" in our message box.
- **Choose a screenshot:** the exact wording of the iPhone menu ("Photo Library") and what the
  Android picker shows first. These differ between versions.
- **Samsung phones** use Samsung Messages, not Google Messages. Those steps are not written yet;
  if your Android phone is a Samsung, record it only if the Google Messages steps match exactly.
- **Copy an email:** whether "Select All" appears in Mail and Gmail when the email is not editable.
