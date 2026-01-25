// --- Инициализация данных ---
let folders = JSON.parse(localStorage.getItem("folders")) || [
  { id: 1, name: "Работа", children: [] },
  { id: 4, name: "Личное", children: [] },
];

let notes = JSON.parse(localStorage.getItem("notes")) || [];

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

async function sendDeleteNoteToServer(noteId) {
  const userId = getUserId();
  if (!userId) {
    console.warn("User_id не найден. Удаление с сервера невозможно.");
    return false;
  }

  const payload = {
    User_id: userId,
    ID_note: noteId,
  };

  try {
    const response = await fetch("/api/notes/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    console.log(`✅ Заметка с ID ${noteId} успешно удалена с сервера`);
    return true;
  } catch (error) {
    console.error("❌ Ошибка при удалении заметки с сервера:", error);
    return false;
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

    // Предпросмотр при наведении
    noteElement.addEventListener("mouseenter", (e) => {
      showNotePreview(note, e);
    });

    noteElement.addEventListener("mouseleave", () => {
      hideNotePreview();
    });

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

function showNotePreview(note, event) {
  // Удаляем старый превью если он существует
  hideNotePreview();

  if (!note.content) return; // Если нет содержимого, не показываем превью

  const preview = document.createElement("div");
  preview.id = "note-preview-tooltip";
  preview.className = "note-preview-tooltip";
  
  // Берем первые 150 символов для preview
  const previewText = note.content.substring(0, 150);
  const hasMore = note.content.length > 150;
  
  preview.innerHTML = `
    <div class="note-preview-content">
      <div class="note-preview-title">${note.title}</div>
      <div class="note-preview-text">${previewText}${hasMore ? '...' : ''}</div>
    </div>
  `;

  document.body.appendChild(preview);

  // Позиционируем превью относительно курсора
  const rect = event.target.getBoundingClientRect();
  preview.style.top = (rect.bottom + 8) + "px";
  preview.style.left = (rect.left + 10) + "px";
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

document.getElementById("save-note-btn-manual").addEventListener("click", () => {
  const activeNote = notes.find((n) => n.isCurrent);
  if (activeNote) {
    activeNote.content = document.getElementById("notes-content").value;
    sendNoteToServer(activeNote);
  }
});

function hideNotePreview() {
  const preview = document.getElementById("note-preview-tooltip");
  if (preview) {
    preview.remove();
  }
}

function downloadNoteAsMarkdown() {
  const activeNote = notes.find((n) => n.isCurrent);
  if (!activeNote) {
    alert("Сначала создайте или выберите заметку");
    return;
  }

  // Создаем содержимое файла с названием заметки как заголовок
  const content = `# ${activeNote.title}\n\n${activeNote.content}`;

  // Создаем Blob из содержимого
  const blob = new Blob([content], { type: "text/markdown" });

  // Создаем URL для скачивания
  const url = URL.createObjectURL(blob);

  // Создаем временный элемент ссылки и кликаем на него
  const link = document.createElement("a");
  link.href = url;
  link.download = `${activeNote.title}.md`;
  document.body.appendChild(link);
  link.click();

  // Очищаем ресурсы
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`✅ Заметка "${activeNote.title}" скачана`);
}

// Обработчик горячей клавиши Command+S (Mac) / Ctrl+S (остальные)
document.addEventListener("keydown", (e) => {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

  if (isCtrlOrCmd && e.key === "s") {
    e.preventDefault(); // Отменяем стандартное сохранение браузера
    downloadNoteAsMarkdown();
  }
});

document.getElementById("delete-note-btn").addEventListener("click", () => {
  const activeNote = notes.find((n) => n.isCurrent);
  if (activeNote && confirm(`Удалить заметку "${activeNote.title}"?`)) {
    sendDeleteNoteToServer(activeNote.id);
    notes = notes.filter((n) => n.id !== activeNote.id);
    delete noteTags[activeNote.id]; // Удаляем связи тегов
    saveNotes();
    saveTags();
    document.getElementById("notes-content").value = "";
    document.getElementById("current-note-title").textContent = "Выберите заметку";
    renderFolders();
    renderSelectedTags();
  }
});