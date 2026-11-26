// ============================================================
// Фото и запись голоса
// ============================================================

// ---------- Фото ----------
// Фото с камеры весит несколько мегабайт. Уменьшаем до 512 px
// и сжимаем в JPEG, чтобы сотни карточек помещались в память.

const MAX_SIZE = 512;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось открыть изображение')); };
    img.src = url;
  });
}

export async function resizeImage(file) {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // белый фон для прозрачных PNG
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}

// ---------- Запись голоса ----------
// Используем MediaRecorder. Запись останавливается сама через MAX_SECONDS.

const MAX_SECONDS = 5;

export function canRecord() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

// Возвращает объект { stop(), result: Promise<Blob> }
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];

  const result = new Promise((resolve) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop()); // выключаем микрофон
      resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    };
  });

  recorder.start();
  const timer = setTimeout(() => stop(), MAX_SECONDS * 1000);

  function stop() {
    clearTimeout(timer);
    if (recorder.state !== 'inactive') recorder.stop();
  }

  return { stop, result };
}
