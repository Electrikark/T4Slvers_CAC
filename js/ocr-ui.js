import { readScreenshot, cancelRecognition } from './ocr.js';

const form = document.getElementById('submission-form');
const button = document.getElementById('ocr-button');
const input = document.getElementById('ocr-file');
const status = document.getElementById('ocr-status');
const preview = document.getElementById('ocr-confirm');
const image = document.getElementById('ocr-image');
const raw = document.getElementById('ocr-raw');
const openImage = document.getElementById('ocr-open-image');
const warning = document.getElementById('ocr-warning');
const message = document.getElementById('message');
const reviewed = document.getElementById('ocr-reviewed');
const reviewLabel = document.getElementById('ocr-review-label');
const check = document.getElementById('check-button');
const cancel = document.getElementById('ocr-cancel');
const clear = document.getElementById('ocr-clear');
const LOW_CONFIDENCE = 60; // Provisional; not a completeness or accuracy threshold.
let busy = false;
let epoch = 0;
let imageUrl = null;

function refresh() {
  check.disabled = busy || (form.dataset.inputSource === 'screenshot' && !reviewed.checked);
  button.disabled = busy;
  message.readOnly = busy;
  cancel.hidden = !busy;
  form.setAttribute('aria-busy', String(busy));
}

function clearPreview() {
  epoch++;
  cancelRecognition();
  busy = false;
  delete form.dataset.inputSource;
  reviewed.checked = false;
  reviewLabel.hidden = preview.hidden = true;
  raw.textContent = status.textContent = '';
  image.removeAttribute('src');
  openImage.removeAttribute('href');
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = null;
  input.value = '';
  refresh();
}

const recovery = error => {
  const messages = {
    'file-size': 'Choose a PNG or JPEG image smaller than 12 MB.',
    'image-size': 'This image is too large. Crop it to one complete message and try again.',
    'unsupported-image': 'Choose a PNG or JPEG screenshot.',
    'read-timeout': 'Reading took too long. Try a smaller screenshot.'
  };
  return (messages[error.message] || 'Could not read this picture. Try another PNG or JPEG screenshot.') +
    ' You can also copy and paste the original message.';
};

button.hidden = false;
button.addEventListener('click', () => input.click());
reviewed.addEventListener('change', refresh);
message.addEventListener('input', () => {
  if (form.dataset.inputSource === 'screenshot') reviewed.checked = false;
  refresh();
});
cancel.addEventListener('click', () => {
  epoch++;
  cancelRecognition();
  busy = false;
  status.textContent = 'Reading cancelled. Your previous text is still here. You can copy and paste instead.';
  refresh();
});
clear.addEventListener('click', () => {
  clearPreview();
  message.value = '';
  message.dispatchEvent(new Event('input', { bubbles: true }));
  message.focus();
});
form.addEventListener('reset', clearPreview);
window.addEventListener('pagehide', clearPreview);
form.addEventListener('submit', event => {
  if (!busy && (form.dataset.inputSource !== 'screenshot' || reviewed.checked)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  status.textContent = busy ? 'Wait for reading to finish, or cancel and paste the message.' :
    'Compare the full text with the screenshot, fix any errors, then tick the review box.';
  if (!busy) reviewed.focus();
}, true);

input.addEventListener('change', async () => {
  const file = input.files[0];
  input.value = '';
  if (!file || busy) return;
  const token = ++epoch;
  busy = true;
  refresh();
  status.textContent = 'Getting ready… The first read downloads local reading files and can take a minute.';
  try {
    const result = await readScreenshot(file, update => {
      if (token === epoch && update.status === 'recognizing text') {
        status.textContent = 'Reading… ' + Math.round(update.progress * 100) + '%';
      }
    });
    if (token !== epoch) return;
    if (!result.text.trim()) {
      status.textContent = 'No text found. Your previous text is still here. Try a clearer screenshot or copy and paste the original message.';
      return;
    }
    if (result.text.length > window.TFS.MAX_CHARS) {
      status.textContent = 'The text is too long to check fully. Your previous text is still here. Crop to one complete message or copy and paste a shorter message.';
      return;
    }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = URL.createObjectURL(file);
    image.src = imageUrl;
    openImage.href = imageUrl;
    raw.textContent = result.text;
    form.dataset.inputSource = 'screenshot';
    message.value = result.text;
    message.dispatchEvent(new Event('input', { bubbles: true }));
    reviewed.checked = false;
    warning.hidden = Number.isFinite(result.confidence) && result.confidence >= LOW_CONFIDENCE;
    preview.hidden = reviewLabel.hidden = false;
    status.textContent = 'Text is ready to review. Fix any errors, then tick the review box before choosing Check.';
    message.focus();
  } catch (error) {
    if (token === epoch) status.textContent = recovery(error);
  } finally {
    if (token === epoch) { busy = false; refresh(); }
  }
});
refresh();
