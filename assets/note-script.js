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

// --- Слушатели событий и инициализация ---

document.addEventListener("DOMContentLoaded", () => {
  // Обработка Markdown при вводе
  document.getElementById("notes-content")?.addEventListener("input", () => {
    if (isPreviewMode) updatePreview();
  });

  // Кнопка переключения режима предпросмотра
  document.getElementById("toggle-preview-btn")?.addEventListener("click", togglePreview);
});

document.getElementById('add-tags-btn')?.addEventListener('click', () => {
  const activeNote = notes.find(n => n.isCurrent);
  if (!activeNote) {
    alert('Сначала создайте или выберите заметку');
    return;
  }

  renderAvailableTags();
  document.getElementById('tag-select-modal').style.display = 'flex';
});

document.getElementById("todo-list-link").addEventListener("click", () => {
  window.location.href = '/todolist';
});

document.getElementById('create-tag-btn')?.addEventListener('click', () => {
  document.getElementById('tag-modal').style.display = 'flex';
});

document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      document.getElementById('tag-color-input').value = option.dataset.color;
    });
  });

document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.clear();
    window.location.replace("/login");
});