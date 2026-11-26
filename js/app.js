// ============================================================
// Главный файл: состояние приложения и связь всех частей
// ============================================================

import {
  getAllCards, saveCard, deleteCard, replaceAllCards,
  getSettings, saveSettings, requestPersistentStorage,
} from './db.js';
import { starterCards } from './defaults.js';
import { renderBoard, renderStrip } from './board.js';
import { sayCard, sayPhrase, stopAll } from './speech.js';
import { openCardEditor, setSettingsProvider } from './editor.js';
import { openSettings, askPin } from './settings.js';
import { exportBackup, importBackup } from './backup.js';

const $ = (id) => document.getElementById(id);

// ---------- Состояние ----------

const state = {
  cards: [],      // все карточки по порядку
  phrase: [],     // карточки, собранные в полосе фразы
  settings: null,
  parentMode: false,
};

setSettingsProvider(() => state.settings);

// ---------- Отрисовка ----------

function render() {
  document.documentElement.style.setProperty('--columns', state.settings.columns);
  document.body.classList.toggle('parent', state.parentMode);

  renderBoard($('board'), state.cards, {
    parentMode: state.parentMode,
    onTap: onChildTap,
    onEdit: editCard,
    onMove: moveCard,
    onAdd: () => editCard(null),
  });
  renderStrip($('strip'), state.phrase, removeFromPhrase);

  $('mode-label').textContent = state.parentMode
    ? 'Родительский режим: нажмите карточку, чтобы изменить её'
    : '';
  $('btn-done').hidden = !state.parentMode;
  $('btn-settings').hidden = !state.parentMode;
  $('btn-parent').hidden = state.parentMode;
}

// ---------- Режим ребёнка ----------

const MAX_PHRASE = 8;

function onChildTap(card) {
  if (state.phrase.length < MAX_PHRASE) state.phrase.push(card);
  renderStrip($('strip'), state.phrase, removeFromPhrase);
  if (state.settings.speakOnTap) sayCard(card, state.settings);
}

function removeFromPhrase(index) {
  state.phrase.splice(index, 1);
  renderStrip($('strip'), state.phrase, removeFromPhrase);
}

$('btn-say').addEventListener('click', () => sayPhrase(state.phrase, state.settings));
$('btn-clear').addEventListener('click', () => {
  stopAll();
  state.phrase = [];
  renderStrip($('strip'), state.phrase, removeFromPhrase);
});

// ---------- Вход в родительский режим ----------
// Кнопку нужно удерживать 2 секунды. Случайное нажатие ничего не сделает.

const HOLD_MS = 2000;
const parentButton = $('btn-parent');
let holdTimer = null;

function startHold(event) {
  event.preventDefault();
  parentButton.classList.add('holding');
  holdTimer = setTimeout(async () => {
    cancelHold();
    if (await askPin(state.settings.pin)) {
      state.parentMode = true;
      stopAll();
      render();
    }
  }, HOLD_MS);
}

function cancelHold() {
  clearTimeout(holdTimer);
  holdTimer = null;
  parentButton.classList.remove('holding');
}

parentButton.addEventListener('pointerdown', startHold);
['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => {
  parentButton.addEventListener(type, cancelHold);
});
parentButton.addEventListener('contextmenu', (event) => event.preventDefault());

$('btn-done').addEventListener('click', () => {
  state.parentMode = false;
  render();
});

// ---------- Родительский режим: карточки ----------

async function editCard(card) {
  const nextOrder = state.cards.length ? state.cards[state.cards.length - 1].order + 1 : 0;
  const result = await openCardEditor(card, nextOrder);
  if (!result) return;

  if (result.deleted) {
    await deleteCard(result.card.id);
    state.cards = state.cards.filter((c) => c.id !== result.card.id);
    state.phrase = state.phrase.filter((c) => c.id !== result.card.id);
  } else {
    await saveCard(result.card);
    const index = state.cards.findIndex((c) => c.id === result.card.id);
    if (index >= 0) state.cards[index] = result.card;
    else state.cards.push(result.card);
    // Обновляем карточку и в полосе фразы, если она там есть
    state.phrase = state.phrase.map((c) => (c.id === result.card.id ? result.card : c));
  }
  render();
}

async function moveCard(card, direction) {
  const index = state.cards.findIndex((c) => c.id === card.id);
  const other = state.cards[index + direction];
  if (!other) return;

  [card.order, other.order] = [other.order, card.order];
  state.cards[index] = other;
  state.cards[index + direction] = card;
  await Promise.all([saveCard(card), saveCard(other)]);
  render();
}

// ---------- Родительский режим: настройки ----------

$('btn-settings').addEventListener('click', () => {
  openSettings(state.settings, {
    async onChange(settings) {
      state.settings = settings;
      await saveSettings(settings);
      render();
    },
    async onExport() {
      await exportBackup(state.cards);
    },
    async onImport(file) {
      try {
        const cards = await importBackup(file);
        if (!confirm(`Заменить текущие карточки на ${cards.length} из файла?`)) return;
        await replaceAllCards(cards);
        state.cards = await getAllCards();
        state.phrase = [];
        render();
      } catch (error) {
        alert('Не удалось загрузить файл: ' + error.message);
      }
    },
    async onReset() {
      await replaceAllCards(starterCards());
      state.cards = await getAllCards();
      state.phrase = [];
      render();
    },
  });
});

// ---------- Запуск ----------

async function init() {
  state.settings = await getSettings();

  // Первый запуск: кладём стартовый набор карточек
  if (!state.settings.initialized) {
    await replaceAllCards(starterCards());
    state.settings.initialized = true;
    await saveSettings(state.settings);
  }

  state.cards = await getAllCards();
  render();
  requestPersistentStorage();

  // Подключаем работу без интернета
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
