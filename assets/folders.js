// --- Инициализация данных ---
let folders = JSON.parse(localStorage.getItem("folders")) || [
  { id: 1, name: "Работа", children: [] },
  { id: 4, name: "Личное", children: [] },
];

let tags = JSON.parse(localStorage.getItem("tags")) || [
  { id: 1, name: "Работа", color: "#4ECDC4", count: 12 },
  { id: 2, name: "Личное", color: "#96CEB4", count: 7 },
  { id: 3, name: "Идеи", color: "#FFEAA7", count: 15 }
];

let noteTags = {}; // Хранит теги для каждой заметки: { noteId: [tagId1, tagId2, ...] }

let notes = JSON.parse(localStorage.getItem("notes")) || [];

// Работа с тегами

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

// --- Вспомогательные функции ---
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateFolderId() {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
}

function getUserId() {
  return parseInt(localStorage.getItem("user_id"));
}

function saveNotes() {
  localStorage.setItem("notes", JSON.stringify(notes));
}

function saveFolders() {
  localStorage.setItem("folders", JSON.stringify(folders));
}

// Поиск папки в иерархическом дереве
function findFolderById(list, id) {
  for (const f of list) {
    if (f.id === id) return f;
    if (f.children && f.children.length > 0) {
      const found = findFolderById(f.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Рекурсивное удаление папки из локального дерева
function removeFolderRecursive(list, id) {
  return list.filter(f => {
    if (f.id === id) return false;
    if (f.children) {
      f.children = removeFolderRecursive(f.children, id);
    }
    return true;
  });
}

// Преобразование плоского списка от сервера в дерево
function buildFolderTree(flatFolders) {
  const folderMap = {};
  const tree = [];

  flatFolders.forEach(f => {
    folderMap[f.FolderId] = {
      id: f.FolderId,
      name: f.Name,
      parentId: f.ParentId,
      children: []
    };
  });

  flatFolders.forEach(f => {
    const folder = folderMap[f.FolderId];
    if (f.ParentId && f.ParentId !== 0 && folderMap[f.ParentId]) {
      folderMap[f.ParentId].children.push(folder);
    } else {
      tree.push(folder);
    }
  });

  return tree;
}

// --- Работа с API (Заметки и Папки) ---

async function sendNoteToServer(note) {
  const userId = getUserId();
  if (!userId) {
    console.warn("User_id не найден.");
    return;
  }

  // Получаем теги для заметки
  const noteTagIds = noteTags[note.id] || [];
  const noteTagsData = tags.filter(tag => noteTagIds.includes(tag.id))
    .map(tag => ({
      Name: tag.name,
      Colour: tag.color // Добавляем параметр colour
    }));

  const payload = {
    user_id: userId,
    Title: note.title,
    Date: new Date().toISOString(),
    Data: note.content,
    ID_note: note.id,
    Folder_id: note.folderId,
    Tags: noteTagsData // Добавляем теги в отправляемые данные
  };

  try {
    const response = await fetch("/api/notes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    console.log("✅ Заметка с тегами синхронизирована");
  } catch (error) {
    console.error("❌ Ошибка при отправке на сервер:", error);
  }
}

async function sendFolderToServer(folder) {
  const userId = getUserId();
  if (!userId) return null;

  const payload = {
    user_id: userId,
    Name: folder.Name,
    FolderId: folder.FolderId,
    ParentId: folder.ParentId || 0
  };

  try {
    const response = await fetch("/api/folders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) console.log(`✅ Папка "${folder.Name}" синхронизирована`);
    return folder.FolderId;
  } catch (error) {
    console.error("❌ Ошибка отправки папки:", error);
    return null;
  }
}

async function syncDataFromServer() {
  const userId = getUserId();
  if (!userId) return;

  try {
    // 1. Загрузка заметок (включая теги из GetNotesHandler)
    const nResp = await fetch("/api/notes/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    if (nResp.ok) {
      const serverNotes = await nResp.json();
      
      // Очищаем текущие связи тегов перед импортом
      noteTags = {};

      notes = serverNotes.map(sn => {
        const noteId = sn.ID_note.toString();
        
        // Парсинг тегов, пришедших с сервера
        if (sn.Tags && Array.isArray(sn.Tags)) {
          sn.Tags.forEach(serverTag => {
            if (!serverTag.Name) return;

            // Ищем, существует ли уже такой тег в нашей системе
            let existingTag = tags.find(t => t.name === serverTag.Name);
            
            if (!existingTag) {
              // Если тега нет, создаем его локально
              existingTag = {
                id: generateTagId(),
                name: serverTag.Name,
                color: serverTag.Colour,
                count: 0
              };
              tags.push(existingTag);
            }

            // Привязываем тег к заметке
            if (!noteTags[noteId]) noteTags[noteId] = [];
            if (!noteTags[noteId].includes(existingTag.id)) {
              noteTags[noteId].push(existingTag.id);
              existingTag.count++;
            }
          });
        }

        return {
          id: noteId,
          title: sn.Title,
          content: sn.Data,
          folderId: sn.Folder_id,
          isCurrent: false,
        };
      });

      saveNotes();
      saveTags(); // Сохраняем обновленные теги и их связи
      renderSidebarTags();
    }

    // 2. Загрузка папок (без изменений)
    const fResp = await fetch("/api/folders/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    if (fResp.ok) {
      const serverFolders = await fResp.json();
      folders = buildFolderTree(serverFolders);
      saveFolders();
      renderFolders();
    }
  } catch (error) {
    console.error("❌ Ошибка синхронизации:", error);
  }
}

async function deleteFolder(folderId, folderName) {
  if (!confirm(`Вы уверены, что хотите удалить папку "${folderName}"?`)) return;

  try {
    const response = await fetch("/api/folders/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: getUserId(), FolderId: parseInt(folderId) }),
    });

    if (response.ok) {
      folders = removeFolderRecursive(folders, folderId);
      notes = notes.filter(note => note.folderId !== folderId);
      saveFolders();
      saveNotes();
      renderFolders();
    }
  } catch (error) {
    console.error("❌ Ошибка удаления папки:", error);
  }
}

// --- Управление интерфейсом ---

function renderFolders(foldersList = folders, container = document.getElementById("folder-list")) {
  if (!container) return;
  container.innerHTML = "";

  foldersList.forEach((folder) => {
    const noteCount = notes.filter(n => n.folderId === folder.id).length;
    const folderElement = document.createElement("li");
    folderElement.className = "folder-wrapper";

    folderElement.innerHTML = `
      <div class="folder-item" data-id="${folder.id}">
          <i class="fas fa-chevron-right toggle-icon"></i>
          <i class="fas fa-folder folder-icon"></i>
          <span class="folder-name">${folder.name}</span>
          <span class="item-count">${noteCount}</span>
          <div class="folder-actions">
              <button class="folder-action-btn create-note"><i class="fas fa-pencil-alt"></i></button>
              <button class="folder-action-btn add-subfolder"><i class="fas fa-plus"></i></button>
              <button class="folder-action-btn delete-folder"><i class="fas fa-trash"></i></button>
          </div>
      </div>
      <div class="folder-content" id="content-${folder.id}">
          <ul class="subfolders-list"></ul>
          <ul class="note-list"></ul>
      </div>
    `;

    container.appendChild(folderElement);

    // Логика раскрытия и кнопок
    folderElement.querySelector(".delete-folder").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFolder(folder.id, folder.name);
    });

    folderElement.querySelector(".create-note").addEventListener("click", (e) => {
      e.stopPropagation();
      createNoteInFolder(folder.id);
    });

    folderElement.querySelector(".add-subfolder").addEventListener("click", (e) => {
      e.stopPropagation();
      const subName = prompt("Название подпапки:");
      if (subName) addFolder(folder.id, subName);
    });

    const folderItem = folderElement.querySelector(".folder-item");
    const contentDiv = folderElement.querySelector(".folder-content");
    folderItem.addEventListener("click", (e) => {
      if (!e.target.closest(".folder-actions")) {
        const isOpen = contentDiv.classList.toggle("open");
        folderElement.querySelector(".toggle-icon").style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
      }
    });

    if (folder.children && folder.children.length > 0) {
      renderFolders(folder.children, folderElement.querySelector(".subfolders-list"));
    }
    renderNotesInFolder(folder.id, folderElement.querySelector(".note-list"));
  });
}

function renderNotesInFolder(folderId, container) {
  container.innerHTML = "";
  const folderNotes = notes.filter((note) => note.folderId === folderId);

  folderNotes.forEach((note) => {
    const noteElement = document.createElement("li");
    noteElement.className = "note-item";
    if (note.isCurrent) noteElement.classList.add("active");

    // Добавляем иконки тегов к заметке в списке
    const noteTagsList = noteTags[note.id] || [];
    const tagsPreview = noteTagsList.slice(0, 2).map(tagId => {
      const tag = tags.find(t => t.id === tagId);
      return tag ? `<span class="tag-dot" style="background-color: ${tag.color}" title="${tag.name}"></span>` : '';
    }).join('');

    noteElement.innerHTML = `
      <div style="display: flex; align-items: center; width: 100%;">
        <i class="far fa-file-alt note-icon"></i>
        <span class="note-title">${note.title}</span>
        <div style="margin-left: auto; display: flex; gap: 4px;">
          ${tagsPreview}
        </div>
      </div>
    `;

    noteElement.addEventListener("click", () => {
      notes.forEach((n) => (n.isCurrent = false));
      note.isCurrent = true;
      document.getElementById("notes-content").value = note.content;
      document.getElementById("current-note-title").textContent = note.title;
      renderFolders();
      renderSelectedTags(); // Обновляем теги при переключении заметки
    });

    container.appendChild(noteElement);
  });
}

function createNoteInFolder(folderId) {
  const title = prompt("Название заметки:");
  if (!title) return;

  const newNote = {
    id: generateId(),
    title: title,
    content: "",
    folderId: folderId,
    createdAt: new Date().toISOString(),
    isCurrent: true,
  };

  notes.forEach((n) => (n.isCurrent = false));
  notes.unshift(newNote);
  
  // Инициализируем теги для новой заметки
  noteTags[newNote.id] = [];
  
  saveNotes();
  saveTags();

  document.getElementById("notes-content").value = "";
  document.getElementById("current-note-title").textContent = title;
  renderFolders();
  renderSelectedTags();
}

function addFolder(parentId, name) {
  const folderId = generateFolderId();
  const uiFolder = { id: folderId, name: name, children: [], parentId: parentId };

  if (!parentId) {
    folders.push(uiFolder);
  } else {
    const parent = findFolderById(folders, parentId);
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(uiFolder);
    }
  }

  saveFolders();
  renderFolders();
  sendFolderToServer({ Name: name, FolderId: folderId, ParentId: parentId || 0 });
}

window.onload = () => {
  if (!localStorage.getItem("folders") && !localStorage.getItem("notes")) {
      syncDataFromServer();
  } else {
      renderFolders();
  }
  renderCalendar();
};

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

document.getElementById("save-note-btn-manual").addEventListener("click", () => {
  const activeNote = notes.find((n) => n.isCurrent);
  if (activeNote) {
    activeNote.content = document.getElementById("notes-content").value;
    sendNoteToServer(activeNote);
  }
});