// ============================================================
// Хранилище (IndexedDB)
// Все карточки, фото и записи голоса хранятся прямо на устройстве.
// В интернет ничего не отправляется.
// ============================================================

const DB_NAME = 'pecs-cards';
const DB_VERSION = 1;

let dbPromise = null;

// Открываем базу один раз и переиспользуем соединение
function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // Вызывается при первом запуске или при смене DB_VERSION
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

// Обёртка: превращает запрос IndexedDB в Promise
function run(storeName, mode, action) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    transaction.oncomplete = () => resolve(request ? request.result : undefined);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }));
}

// ---------- Карточки ----------
// Карточка: { id, label, emoji?, image?: Blob, audio?: Blob, order }

export async function getAllCards() {
  const cards = await run('cards', 'readonly', (store) => store.getAll());
  return cards.sort((a, b) => a.order - b.order);
}

export function saveCard(card) {
  return run('cards', 'readwrite', (store) => store.put(card));
}

export function deleteCard(id) {
  return run('cards', 'readwrite', (store) => store.delete(id));
}

// Заменить все карточки разом (стартовый набор, импорт)
export function replaceAllCards(cards) {
  return run('cards', 'readwrite', (store) => {
    store.clear();
    cards.forEach((card) => store.put(card));
    return null;
  });
}

// ---------- Настройки ----------

export const DEFAULT_SETTINGS = {
  sound: true,
  volume: 0.7,
  speakOnTap: true,
  columns: 4,
  pin: '',
  initialized: false,
};

export async function getSettings() {
  const saved = await run('settings', 'readonly', (store) => store.get('main'));
  return { ...DEFAULT_SETTINGS, ...(saved || {}) };
}

export function saveSettings(settings) {
  return run('settings', 'readwrite', (store) => store.put(settings, 'main'));
}

// Просим браузер не удалять данные при нехватке места
// (особенно важно для iPhone)
export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

// Уникальный id для новой карточки
export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
