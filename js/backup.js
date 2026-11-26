// ============================================================
// Резервная копия: все карточки (с фото и голосом) в одном JSON-файле.
// Нужна, чтобы перенести набор на другое устройство
// или поделиться им (например, логопед — с семьёй).
// ============================================================

const FORMAT = 'pecs-cards-backup';
const VERSION = 1;

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function exportBackup(cards) {
  const exported = [];
  for (const card of cards) {
    exported.push({
      id: card.id,
      label: card.label,
      emoji: card.emoji || '',
      order: card.order,
      image: card.image ? await blobToDataUrl(card.image) : null,
      audio: card.audio ? await blobToDataUrl(card.audio) : null,
    });
  }

  const data = { format: FORMAT, version: VERSION, createdAt: new Date().toISOString(), cards: exported };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `kartochki-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export async function importBackup(file) {
  const data = JSON.parse(await file.text());
  if (data.format !== FORMAT || !Array.isArray(data.cards)) {
    throw new Error('Это не файл с карточками.');
  }

  const cards = [];
  for (const [index, card] of data.cards.entries()) {
    // Принимаем только картинки и звук, закодированные в data:-ссылки
    const image = typeof card.image === 'string' && card.image.startsWith('data:image/')
      ? await dataUrlToBlob(card.image) : null;
    const audio = typeof card.audio === 'string' && card.audio.startsWith('data:audio/')
      ? await dataUrlToBlob(card.audio) : null;

    cards.push({
      id: String(card.id || index),
      label: String(card.label || '').slice(0, 40),
      emoji: String(card.emoji || '').slice(0, 4),
      order: Number.isFinite(card.order) ? card.order : index,
      image,
      audio,
    });
  }
  return cards;
}
