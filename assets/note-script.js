// --- Инициализация данных (Тэги и UI) ---
let tags = JSON.parse(localStorage.getItem("tags")) || [
  { id: 1, name: "Работа", color: "#4ECDC4", count: 12 },
  { id: 2, name: "Личное", color: "#96CEB4", count: 7 },
  { id: 3, name: "Идеи", color: "#FFEAA7", count: 15 }
];

let isPreviewMode = false;

// --- Логика Markdown и Предпросмотра ---

function updatePreview() {
  const contentInput = document.getElementById("notes-content");
  const previewContainer = document.getElementById("notes-preview");
  if (!contentInput || !previewContainer) return;

  const rawText = contentInput.value;
  // Используем библиотеку marked для парсинга Markdown
  previewContainer.innerHTML = marked.parse(rawText);
}

function togglePreview() {
  const editor = document.getElementById("notes-content");
  const preview = document.getElementById("notes-preview");
  const btn = document.getElementById("toggle-preview-btn");

  isPreviewMode = !isPreviewMode;

  if (isPreviewMode) {
    updatePreview();
    editor.style.display = "none";
    preview.style.display = "block";
    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    btn.title = "Редактировать";
  } else {
    editor.style.display = "block";
    preview.style.display = "none";
    btn.innerHTML = '<i class="fas fa-eye"></i>';
    btn.title = "Предпросмотр";
  }
}

// --- Работа с тегами ---

function renderTags() {
  const tagsList = document.getElementById("tags-list");
  if (!tagsList) return;

  tagsList.innerHTML = "";
  tags.forEach(tag => {
    const li = document.createElement("li");
    li.className = "tag-item";
    li.innerHTML = `
      <span class="tag-color" style="background-color: ${tag.color}"></span>
      <span class="tag-name">${tag.name}</span>
      <span class="item-count">${tag.count}</span>
    `;
    tagsList.appendChild(li);
  });
}

function createTag(name, color) {
  const newTag = {
    id: Date.now(),
    name: name,
    color: color,
    count: 0
  };
  tags.push(newTag);
  localStorage.setItem("tags", JSON.stringify(tags));
  renderTags();
  renderAvailableTags();
}

function renderSelectedTags() {
  const container = document.getElementById("selected-tags-container");
  if (!container) return;

  container.innerHTML = "";
  // Находим текущую активную заметку (предполагается наличие массива notes)
  const currentNote = typeof notes !== 'undefined' ? notes.find(n => n.isCurrent) : null;
  if (!currentNote) return;

  const activeTagIds = noteTags[currentNote.id] || [];
  
  activeTagIds.forEach(tagId => {
    const tag = tags.find(t => t.id === tagId);
    if (tag) {
      const tagEl = document.createElement("span");
      tagEl.className = "selected-tag";
      tagEl.style.backgroundColor = tag.color;
      tagEl.textContent = tag.name;
      container.appendChild(tagEl);
    }
  });

  const addBtn = document.createElement("button");
  addBtn.className = "add-tag-btn";
  addBtn.innerHTML = '<i class="fas fa-plus"></i>';
  addBtn.onclick = () => document.getElementById("tag-select-modal").style.display = "flex";
  container.appendChild(addBtn);
}

function renderAvailableTags() {
  const container = document.getElementById("available-tags-container");
  if (!container) return;

  container.innerHTML = "";
  const currentNote = typeof notes !== 'undefined' ? notes.find(n => n.isCurrent) : null;
  const activeTagIds = currentNote ? (noteTags[currentNote.id] || []) : [];

  tags.forEach(tag => {
    const tagEl = document.createElement("div");
    tagEl.className = `tag-option ${activeTagIds.includes(tag.id) ? 'selected' : ''}`;
    tagEl.style.borderColor = tag.color;
    tagEl.innerHTML = `
      <span class="tag-color-dot" style="background-color: ${tag.color}"></span>
      ${tag.name}
    `;
    tagEl.onclick = () => {
      if (!currentNote) return;
      if (!noteTags[currentNote.id]) noteTags[currentNote.id] = [];
      
      const index = noteTags[currentNote.id].indexOf(tag.id);
      if (index === -1) {
        noteTags[currentNote.id].push(tag.id);
        tagEl.classList.add('selected');
      } else {
        noteTags[currentNote.id].splice(index, 1);
        tagEl.classList.remove('selected');
      }
      renderSelectedTags();
    };
    container.appendChild(tagEl);
  });
}

// --- Слушатели событий и инициализация ---

document.addEventListener("DOMContentLoaded", () => {
  // Обработка Markdown при вводе
  document.getElementById("notes-content")?.addEventListener("input", () => {
    if (isPreviewMode) updatePreview();
  });

  // Кнопка переключения режима предпросмотра
  document.getElementById("toggle-preview-btn")?.addEventListener("click", togglePreview);

  // Управление модальным окном создания тега
  document.getElementById("add-tag-icon")?.addEventListener("click", () => {
    document.getElementById("tag-modal").style.display = "flex";
  });

  // Выбор цвета в модальном окне
  document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      document.getElementById('tag-color-input').value = option.dataset.color;
    });
  });

  // Сохранение нового тега
  document.getElementById('save-tag-btn')?.addEventListener('click', () => {
    const name = document.getElementById('tag-name-input').value.trim();
    const color = document.getElementById('tag-color-input').value;
    if (!name) return alert('Введите название тега');

    createTag(name, color);
    document.getElementById('tag-modal').style.display = 'none';
    document.getElementById('tag-name-input').value = '';
  });

  // Закрытие модалок
  document.getElementById('cancel-tag-btn')?.addEventListener('click', () => {
    document.getElementById('tag-modal').style.display = 'none';
  });

  document.getElementById('confirm-tags-btn')?.addEventListener('click', () => {
    document.getElementById('tag-select-modal').style.display = 'none';
  });

  // Инициализация UI
  renderTags();
});