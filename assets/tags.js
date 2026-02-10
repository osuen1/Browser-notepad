let tags = JSON.parse(localStorage.getItem("tags")) || [
  { id: 1, name: "Работа", color: "#4ECDC4", count: 12 },
  { id: 2, name: "Личное", color: "#96CEB4", count: 7 },
  { id: 3, name: "Идеи", color: "#FFEAA7", count: 15 }
];

let noteTags = {}; // Хранит теги для каждой заметки: { noteId: [tagId1, tagId2, ...] }

function saveTags() {
  localStorage.setItem("tags", JSON.stringify(tags));
  localStorage.setItem("noteTags", JSON.stringify(noteTags));
}

// Функция загрузки тегов
function loadTags() {
  const savedTags = localStorage.getItem("tags");
  const savedNoteTags = localStorage.getItem("noteTags");
  
  if (savedTags) tags = JSON.parse(savedTags);
  if (savedNoteTags) noteTags = JSON.parse(savedNoteTags);
}

// Функция генерации ID для тега
function generateTagId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Функция создания нового тега
function createTag(name, color) {
  const newTag = {
    id: generateTagId(),
    name: name,
    color: color,
    count: 0
  };
  
  tags.push(newTag);
  saveTags();
  renderSidebarTags();
  return newTag;
}

// Функция отображения тегов в сайдбаре
function renderSidebarTags() {
  const tagsList = document.querySelector('.tags-list');
  if (!tagsList) return;
  
  tagsList.innerHTML = '';
  
  tags.forEach(tag => {
    const tagElement = document.createElement('li');
    tagElement.className = 'tag-item';
    tagElement.style.setProperty('--tag-color', tag.color);
    
    tagElement.innerHTML = `
      <i class="fas fa-tag" style="color: ${tag.color}"></i> 
      ${tag.name}
      <span class="item-count">${tag.count}</span>
    `;
    
    tagElement.addEventListener('click', () => {
      document.querySelectorAll('.tag-item').forEach(item => item.classList.remove('active'));
      tagElement.classList.add('active');
      // Фильтрация заметок по тегу
      filterNotesByTag(tag.id);
    });
    
    tagsList.appendChild(tagElement);
  });
}

// Функция фильтрации заметок по тегу
function filterNotesByTag(tagId) {
  const noteIds = Object.keys(noteTags).filter(noteId => 
    noteTags[noteId].includes(tagId)
  );
  
  // Здесь можно добавить логику фильтрации отображения заметок
  console.log(`Заметки с тегом ${tagId}:`, noteIds);
}

// Функция отображения выбранных тегов для текущей заметки
function renderSelectedTags() {
  const container = document.getElementById('selected-tags-container');
  if (!container) return;
  
  const activeNote = notes.find(n => n.isCurrent);
  if (!activeNote) {
    container.innerHTML = '';
    return;
  }
  
  const currentTags = noteTags[activeNote.id] || [];
  container.innerHTML = '';
  
  currentTags.forEach(tagId => {
    const tag = tags.find(t => t.id === tagId);
    if (tag) {
      const tagElement = document.createElement('div');
      tagElement.className = 'tag-pill';
      tagElement.style.backgroundColor = tag.color;
      tagElement.innerHTML = `
        ${tag.name}
        <i class="fas fa-times remove-tag" data-tag-id="${tag.id}"></i>
      `;
      
      tagElement.querySelector('.remove-tag').addEventListener('click', (e) => {
        e.stopPropagation();
        removeTagFromNote(activeNote.id, tag.id);
      });
      
      container.appendChild(tagElement);
    }
  });
}

// Функция добавления тега к заметке
function addTagToNote(noteId, tagId) {
  if (!noteTags[noteId]) {
    noteTags[noteId] = [];
  }
  
  if (!noteTags[noteId].includes(tagId)) {
    noteTags[noteId].push(tagId);
    
    // Увеличиваем счетчик использования тега
    const tag = tags.find(t => t.id === tagId);
    if (tag) {
      tag.count = (tag.count || 0) + 1;
    }
    
    saveTags();
    renderSelectedTags();
    renderSidebarTags();
  }
}

// Функция удаления тега из заметки
function removeTagFromNote(noteId, tagId) {
  if (noteTags[noteId]) {
    const index = noteTags[noteId].indexOf(tagId);
    if (index > -1) {
      noteTags[noteId].splice(index, 1);
      
      // Уменьшаем счетчик использования тега
      const tag = tags.find(t => t.id === tagId);
      if (tag && tag.count > 0) {
        tag.count--;
      }
      
      saveTags();
      renderSelectedTags();
      renderSidebarTags();
    }
  }
}

// Функция отображения доступных тегов в модальном окне
function renderAvailableTags() {
  const container = document.getElementById('available-tags-container');
  if (!container) return;
  
  const activeNote = notes.find(n => n.isCurrent);
  const currentTags = activeNote ? noteTags[activeNote.id] || [] : [];
  
  container.innerHTML = '';
  
  tags.forEach(tag => {
    const isSelected = currentTags.includes(tag.id);
    const tagElement = document.createElement('button');
    tagElement.className = 'tag-pill';
    tagElement.style.backgroundColor = tag.color;
    if (isSelected) {
      tagElement.style.opacity = '0.6';
      tagElement.style.border = '2px solid white';
    }
    
    tagElement.innerHTML = `
      ${tag.name}
      ${isSelected ? '<i class="fas fa-check"></i>' : ''}
    `;
    
    tagElement.addEventListener('click', () => {
      if (activeNote) {
        if (isSelected) {
          removeTagFromNote(activeNote.id, tag.id);
        } else {
          addTagToNote(activeNote.id, tag.id);
        }
        renderAvailableTags();
      }
    });
    
    container.appendChild(tagElement);
  });
}



// Слушатели
document.getElementById("notes-content").addEventListener("input", function() {
  loadNotes();
  renderSelectedTags(); // Обновляем отображение тегов при изменении заметки
});

document.addEventListener('DOMContentLoaded', () => {
  // Загружаем теги при загрузке страницы
  loadTags();
  renderSidebarTags();
  
  // Кнопка создания тега
  document.getElementById('create-tag-btn')?.addEventListener('click', () => {
    document.getElementById('tag-modal').style.display = 'flex';
  });
  
  // Кнопка выбора тегов для заметки
  document.getElementById('add-tags-btn')?.addEventListener('click', () => {
    const activeNote = notes.find(n => n.isCurrent);
    if (!activeNote) {
      alert('Сначала создайте или выберите заметку');
      return;
    }
    
    renderAvailableTags();
    document.getElementById('tag-select-modal').style.display = 'flex';
  });
  
  // Выбор цвета тега
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
    
    if (!name) {
      alert('Введите название тега');
      return;
    }
    
    createTag(name, color);
    document.getElementById('tag-name-input').value = '';
    document.getElementById('tag-modal').style.display = 'none';
  });
  
  // Отмена создания тега
  document.getElementById('cancel-tag-btn')?.addEventListener('click', () => {
    document.getElementById('tag-modal').style.display = 'none';
  });
  
  // Применение выбранных тегов
  document.getElementById('confirm-tags-btn')?.addEventListener('click', () => {
    document.getElementById('tag-select-modal').style.display = 'none';
  });
  
  // Отмена выбора тегов
  document.getElementById('cancel-select-tags-btn')?.addEventListener('click', () => {
    document.getElementById('tag-select-modal').style.display = 'none';
  });
  
  // Закрытие модальных окон при клике вне их
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
});