// ============================================================
// Озвучка карточек
// 1) Если родитель записал слово своим голосом — играем запись.
//    Это работает на любом языке и без интернета.
// 2) Иначе — синтезатор речи браузера (русский голос есть почти везде).
// Новый звук всегда прерывает предыдущий, чтобы звуки не накладывались.
// ============================================================

let currentAudio = null;
let currentUrl = null;
let sequenceToken = 0;

// Остановить всё, что сейчас звучит
export function stopAll() {
  sequenceToken++;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// Найти подходящий голос для языка (например, 'ru')
function pickVoice(lang) {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang) && v.localService)
      || voices.find((v) => v.lang.toLowerCase().startsWith(lang))
      || null;
}

// В некоторых браузерах список голосов загружается не сразу
if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.('voiceschanged', () => speechSynthesis.getVoices());
}

function speakText(text, settings) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.9; // чуть медленнее обычного — понятнее
    utterance.volume = settings.volume;
    const voice = pickVoice('ru');
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    speechSynthesis.speak(utterance);
  });
}

function playRecording(blob, settings) {
  return new Promise((resolve) => {
    currentUrl = URL.createObjectURL(blob);
    const audio = new Audio(currentUrl);
    audio.volume = settings.volume;
    currentAudio = audio;
    const finish = () => {
      if (currentAudio === audio) {
        currentAudio = null;
        URL.revokeObjectURL(currentUrl);
        currentUrl = null;
      }
      resolve();
    };
    audio.onended = finish;
    audio.onerror = finish;
    audio.play().catch(finish);
  });
}

// Произнести одну карточку
function playOne(card, settings) {
  if (card.audio) return playRecording(card.audio, settings);
  return speakText(card.label, settings);
}

// Произнести карточку, прервав предыдущий звук
export function sayCard(card, settings) {
  if (!settings.sound) return Promise.resolve();
  stopAll();
  return playOne(card, settings);
}

// Произнести фразу: карточки по очереди
export async function sayPhrase(cards, settings) {
  if (!settings.sound || cards.length === 0) return;
  stopAll();
  const token = sequenceToken;
  for (const card of cards) {
    if (token !== sequenceToken) return; // фразу прервали
    await playOne(card, settings);
  }
}
