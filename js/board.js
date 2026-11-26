// ============================================================
// Отрисовка карточек: сетка и полоса фразы
// ============================================================

// Для каждого фото (Blob) создаём ссылку один раз и переиспользуем,
// чтобы не плодить копии при каждой перерисовке
const imageUrls = new WeakMap();

function urlFor(blob) {
  let url = imageUrls.get(blob);
  if (!url) {
    url = URL.createObjectURL(blob);
    imageUrls.set(blob, url);
  }
  return url;
}

// Создать элемент одной карточки
export function createCardElement(card) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'card';
  el.setAttribute('aria-label', card.label);

  if (card.image) {
    const img = document.createElement('img');
    img.src = urlFor(card.image);
    img.alt = '';
    el.append(img);
  } else {
    const emoji = document.createElement('span');
    emoji.className = 'emoji';
    emoji.textContent = card.emoji || '❔';
    el.append(emoji);
  }

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = card.label;
  el.append(label);

  return el;
}

// Небольшая кнопка-инструмент для родительского режима
function toolButton(text, title, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.title = title;
  button.addEventListener('click', (event) => {
    event.stopPropagation(); // чтобы не сработал клик по самой карточке
    onClick();
  });
  return button;
}

// Сетка карточек.
// В режиме ребёнка нажатие добавляет карточку во фразу.
// В родительском режиме нажатие открывает редактор, есть стрелки
// для перестановки и плитка «+» для новой карточки.
export function renderBoard(container, cards, options) {
  const { parentMode, onTap, onEdit, onMove, onAdd } = options;
  container.replaceChildren();

  cards.forEach((card, index) => {
    const el = createCardElement(card);

    if (parentMode) {
      el.addEventListener('click', () => onEdit(card));

      const tools = document.createElement('div');
      tools.className = 'tools';
      if (index > 0) tools.append(toolButton('◀', 'Переместить левее', () => onMove(card, -1)));
      if (index < cards.length - 1) tools.append(toolButton('▶', 'Переместить правее', () => onMove(card, 1)));
      el.append(tools);

      if (card.audio) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = '🎙';
        badge.title = 'Есть запись голоса';
        el.append(badge);
      }
    } else {
      el.addEventListener('click', () => onTap(card));
    }

    container.append(el);
  });

  if (parentMode) {
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'card add';
    add.textContent = '+';
    add.setAttribute('aria-label', 'Добавить карточку');
    add.addEventListener('click', onAdd);
    container.append(add);
  }
}

// Полоса фразы. Нажатие на карточку в полосе убирает её.
export function renderStrip(container, phrase, onRemove) {
  container.replaceChildren();
  phrase.forEach((card, index) => {
    const el = createCardElement(card);
    el.addEventListener('click', () => onRemove(index));
    container.append(el);
  });
  container.scrollLeft = container.scrollWidth;
}
