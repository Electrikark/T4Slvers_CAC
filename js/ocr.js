// Image-to-text only. No message rules or reference data are loaded here.
const BASE = new URL('vendor/tesseract/', document.baseURI).href;
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;
const MAX_SIDE = 3200;
let libraryPromise = null;
let workerPromise = null;
let worker = null;
let nativeWorker = null;
let generation = 0;
let active = false;
let progress = () => {};
let rejectActive = null;

function loadLibrary() {
  if (window.Tesseract) return Promise.resolve();
  if (!libraryPromise) {
    libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(new Error('library-timeout')), 30000);
      function finish(error) {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) { script.remove(); reject(error); } else resolve();
      }
      script.src = BASE + 'tesseract.min.js';
      script.onload = () => window.Tesseract ? finish() : finish(new Error('library-load-failed'));
      script.onerror = () => finish(new Error('library-load-failed'));
      document.head.append(script);
    }).catch(error => { libraryPromise = null; throw error; });
  }
  return libraryPromise;
}

async function getWorker(token) {
  await loadLibrary();
  if (token !== generation) throw new Error('cancelled');
  if (!workerPromise) {
    // createWorker returns only after initialization. Capture its native worker
    // during the synchronous spawn so Cancel can stop a stalled initialization.
    const NativeWorker = window.Worker;
    class LocalWorker extends NativeWorker {
      constructor(url, options) { super(url, options); nativeWorker = this; }
    }
    let starting;
    window.Worker = LocalWorker;
    try { starting = window.Tesseract.createWorker('eng', 1, {
      workerPath: BASE + 'worker.min.js', workerBlobURL: false,
      corePath: BASE + 'core', langPath: BASE + 'lang',
      cachePath: 't4s-eng-best-int-1.0.0-core7',
      logger: message => { if (token === generation) progress(message); },
      errorHandler: () => { if (token === generation) cancelRecognition('read-failed'); }
    }); } finally { window.Worker = NativeWorker; }
    workerPromise = starting.then(created => {
      if (token !== generation) { void created.terminate(); throw new Error('cancelled'); }
      worker = created;
      return created;
    }).catch(error => {
      if (token === generation) workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

export function cancelRecognition(reason = 'cancelled') {
  generation++;
  const old = worker;
  const native = nativeWorker;
  worker = null;
  nativeWorker = null;
  workerPromise = null;
  if (old) void old.terminate().catch(() => {});
  else if (native) native.terminate();
  if (rejectActive) rejectActive(new Error(reason));
}

// Read dimensions before decoding, to reject large compressed images first.
export function imageDimensions(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const png = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length >= 24 && png.every((byte, i) => bytes[i] === byte)) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes[0] === 255 && bytes[1] === 216) {
    let at = 2;
    while (at + 3 < bytes.length) {
      if (bytes[at++] !== 255) throw new Error('decode-failed');
      while (bytes[at] === 255) at++;
      const marker = bytes[at++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (at + 2 > bytes.length) break;
      const length = view.getUint16(at);
      if (length < 2 || at + length > bytes.length) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && length >= 7) {
        return { height: view.getUint16(at + 3), width: view.getUint16(at + 5) };
      }
      at += length;
    }
  }
  throw new Error('unsupported-image');
}

async function fileToCanvas(file, token) {
  if (!file || !file.size || file.size > MAX_BYTES) throw new Error('file-size');
  const dimensions = imageDimensions(new Uint8Array(await file.arrayBuffer()));
  if (!dimensions.width || !dimensions.height || dimensions.width * dimensions.height > MAX_PIXELS ||
      Math.max(dimensions.width, dimensions.height) > 16000) throw new Error('image-size');
  if (token !== generation) throw new Error('cancelled');
  let source;
  let url;
  try {
    try { source = await createImageBitmap(file); }
    catch {
      url = URL.createObjectURL(file);
      source = await new Promise((resolve, reject) => {
        const image = new Image();
        const timer = setTimeout(() => { image.src = ''; reject(new Error('decode-failed')); }, 15000);
        image.onload = () => { clearTimeout(timer); resolve(image); };
        image.onerror = () => { clearTimeout(timer); reject(new Error('decode-failed')); };
        image.src = url;
      });
    }
    if (token !== generation) throw new Error('cancelled');
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    if (!width || !height || width * height > MAX_PIXELS) throw new Error('image-size');
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('decode-failed');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    if (source?.close) source.close();
    if (url) URL.revokeObjectURL(url);
  }
}

export async function readScreenshot(file, onProgress = () => {}) {
  if (active) throw new Error('busy');
  active = true;
  const token = generation;
  progress = typeof onProgress === 'function' ? onProgress : () => {};
  let canvas;
  let timer;
  try {
    const stopped = new Promise((resolve, reject) => { rejectActive = reject; });
    timer = setTimeout(() => cancelRecognition('read-timeout'), 120000);
    return await Promise.race([stopped, (async () => {
      canvas = await fileToCanvas(file, token);
      const current = await getWorker(token);
      if (token !== generation) throw new Error('cancelled');
      const { data } = await current.recognize(canvas);
      if (token !== generation) throw new Error('cancelled');
      // Preserve exact OCR text. No automatic line joining or contact repair.
      return { text: data.text || '', confidence: data.confidence };
    })()]);
  } catch (error) {
    if (token === generation) cancelRecognition();
    throw error;
  } finally {
    clearTimeout(timer);
    rejectActive = null;
    active = false;
    progress = () => {};
    if (canvas) canvas.width = canvas.height = 0;
  }
}
