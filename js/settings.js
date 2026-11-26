// ============================================================
// Окно настроек и проверка PIN
// ============================================================

const $ = (id) => document.getElementById(id);

const dialog = $('settings-dialog');
const sound = $('set-sound');
const volume = $('set-volume');
const speakOnTap = $('set-speak-on-tap');
const columns = $('set-columns');
const pin = $('set-pin');

let handlers = null;
let current = null;

function emitChange() {
  current = {
    ...current,
    sound: sound.checked,
    volume: Number(volume.value),
    speakOnTap: speakOnTap.checked,
    columns: Number(columns.value),
    pin: pin.value.trim(),
  };
  handlers.onChange(current);
}

[sound, volume, speakOnTap, columns, pin].forEach((input) => {
  input.addEventListener('change', emitChange);
});

$('btn-close-settings').addEventListener('click', () => dialog.close());
$('btn-export').addEventListener('click', () => handlers.onExport());
$('input-import').addEventListener('change', (event) => {
  const file = event.target.files[0];
  event.target.value = '';
  if (file) handlers.onImport(file);
});
$('btn-reset').addEventListener('click', () => {
  if (confirm('Удалить все карточки и вернуть стартовый набор?')) handlers.onReset();
});

// handlers: { onChange(settings), onExport(), onImport(file), onReset() }
export function openSettings(settings, newHandlers) {
  current = { ...settings };
  handlers = newHandlers;
  sound.checked = settings.sound;
  volume.value = settings.volume;
  speakOnTap.checked = settings.speakOnTap;
  columns.value = String(settings.columns);
  pin.value = settings.pin;
  dialog.showModal();
}

// ---------- PIN ----------

const pinDialog = $('pin-dialog');
const pinInput = $('pin-input');
const pinError = $('pin-error');

// Возвращает Promise<boolean>: введён ли правильный PIN
export function askPin(expected) {
  if (!expected) return Promise.resolve(true);

  pinInput.value = '';
  pinError.hidden = true;
  pinDialog.showModal();
  pinInput.focus();

  return new Promise((resolve) => {
    const cleanup = () => {
      pinDialog.removeEventListener('submit', onSubmit);
      $('btn-pin-cancel').removeEventListener('click', onCancel);
      pinDialog.removeEventListener('cancel', onCancel);
    };
    const onSubmit = (event) => {
      event.preventDefault();
      if (pinInput.value === expected) {
        cleanup();
        pinDialog.close();
        resolve(true);
      } else {
        pinError.hidden = false;
        pinInput.value = '';
      }
    };
    const onCancel = (event) => {
      event?.preventDefault();
      cleanup();
      pinDialog.close();
      resolve(false);
    };
    pinDialog.addEventListener('submit', onSubmit);
    $('btn-pin-cancel').addEventListener('click', onCancel);
    pinDialog.addEventListener('cancel', onCancel);
  });
}
