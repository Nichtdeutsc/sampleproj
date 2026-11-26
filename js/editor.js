// ============================================================
// Редактор карточки (родительский режим)
// Фото с камеры или из галереи, либо эмодзи; подпись; запись голоса.
// ============================================================

import { createCardElement } from './board.js';
import { resizeImage, canRecord, startRecording } from './media.js';
import { sayCard, stopAll } from './speech.js';
import { newId } from './db.js';

const $ = (id) => document.getElementById(id);

const dialog = $('card-dialog');
const title = $('card-dialog-title');
const preview = $('card-preview');
const labelInput = $('card-label');
const photoInput = $('card-photo');
const galleryInput = $('card-gallery');
const emojiInput = $('card-emoji');
const recordButton = $('btn-record');
const playButton = $('btn-play');
const removeAudioButton = $('btn-remove-audio');
const recordHint = $('record-hint');
const deleteButton = $('btn-delete-card');
const cancelButton = $('btn-cancel-card');
const saveButton = $('btn-save-card');

let draft = null;        // карточка, которую сейчас редактируем
let recording = null;    // идущая запись голоса
let finish = null;       // функция, закрывающая редактор с результатом
let getSettings = () => ({ sound: true, volume: 0.7 });

export function setSettingsProvider(fn) {
  getSettings = fn;
}

function updatePreview() {
  draft.label = labelInput.value.trim() || '…';
  preview.replaceChildren(createCardElement(draft));
  playButton.disabled = !draft.audio && !labelInput.value.trim();
  removeAudioButton.disabled = !draft.audio;
  recordHint.textContent = draft.audio
    ? 'Записан ваш голос.'
    : 'Без записи слово произнесёт синтезатор речи.';
}

async function onPhotoChosen(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    draft.image = await resizeImage(file);
    draft.emoji = '';
    emojiInput.value = '';
    updatePreview();
  } catch (error) {
    alert(error.message);
  }
}

async function toggleRecording() {
  if (recording) {
    recording.stop();
    return;
  }
  if (!canRecord()) {
    alert('Этот браузер не умеет записывать звук.');
    return;
  }
  try {
    stopAll();
    recording = await startRecording();
    recordButton.textContent = '⏹ Остановить';
    recordButton.classList.add('recording');
    recordHint.textContent = 'Говорите… (не больше 5 секунд)';
    const blob = await recording.result;
    if (blob.size > 0) draft.audio = blob;
  } catch {
    alert('Нет доступа к микрофону. Разрешите его в настройках браузера.');
  } finally {
    recording = null;
    recordButton.textContent = '🎙 Записать голос';
    recordButton.classList.remove('recording');
    updatePreview();
  }
}

function close(result) {
  if (recording) recording.stop();
  stopAll();
  dialog.close();
  if (finish) finish(result);
  finish = null;
}

// ---------- Обработчики кнопок (подключаются один раз) ----------

labelInput.addEventListener('input', updatePreview);
emojiInput.addEventListener('input', () => {
  draft.emoji = emojiInput.value.trim();
  if (draft.emoji) draft.image = null;
  updatePreview();
});
photoInput.addEventListener('change', onPhotoChosen);
galleryInput.addEventListener('change', onPhotoChosen);
recordButton.addEventListener('click', toggleRecording);
playButton.addEventListener('click', () => sayCard(draft, { ...getSettings(), sound: true }));
removeAudioButton.addEventListener('click', () => {
  draft.audio = null;
  updatePreview();
});
cancelButton.addEventListener('click', () => close(null));
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  close(null);
});
deleteButton.addEventListener('click', () => {
  if (confirm(`Удалить карточку «${draft.label}»?`)) close({ deleted: true, card: draft });
});
saveButton.addEventListener('click', () => {
  const label = labelInput.value.trim();
  if (!label) {
    labelInput.focus();
    return;
  }
  draft.label = label;
  close({ deleted: false, card: draft });
});

// Открыть редактор. Возвращает Promise:
//   null — отмена; { deleted, card } — результат
export function openCardEditor(card, nextOrder) {
  const isNew = !card;
  draft = isNew
    ? { id: newId(), label: '', emoji: '🙂', image: null, audio: null, order: nextOrder }
    : { ...card };

  title.textContent = isNew ? 'Новая карточка' : 'Изменить карточку';
  labelInput.value = isNew ? '' : card.label;
  emojiInput.value = draft.image ? '' : (draft.emoji || '');
  deleteButton.hidden = isNew;
  updatePreview();

  dialog.showModal();
  if (isNew) labelInput.focus();

  return new Promise((resolve) => { finish = resolve; });
}
