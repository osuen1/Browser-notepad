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
  if (!userId) return;

  // Извлекаем теги (если глобальные переменные tags/noteTags доступны)
  const noteTagIds = (typeof noteTags !== 'undefined') ? noteTags[note.id] || [] : [];
  const noteTagsData = (typeof tags !== 'undefined') ? 
    tags.filter(tag => noteTagIds.includes(tag.id)).map(tag => ({ Name: tag.name, Colour: tag.color })) : [];

  const payload = {
    user_id: userId,
    Title: note.title,
    Date: new Date().toISOString(),
    Data: note.content,
    ID_note: note.id,
    Folder_id: note.folderId,
    Tags: noteTagsData
  };

  try {
    const response = await fetch("/api/notes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) console.log("✅ Заметка синхронизирована");
  } catch (error) {
    console.error("❌ Ошибка отправки заметки:", error);
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
    // Загрузка заметок
    const nResp = await fetch("/api/notes/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    if (nResp.ok) {
      const serverNotes = await nResp.json();
      notes = serverNotes.map(sn => ({
        id: sn.ID_note.toString(),
        title: sn.Title,
        content: sn.Data,
        folderId: sn.Folder_id,
        isCurrent: false,
      }));
      saveNotes();
    }

    // Загрузка папок
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

    noteElement.innerHTML = `
      <div style="display: flex; align-items: center; width: 100%;">
        <i class="far fa-file-alt note-icon"></i>
        <span class="note-title">${note.title}</span>
      </div>
    `;

    noteElement.addEventListener("click", () => {
      notes.forEach((n) => (n.isCurrent = false));
      note.isCurrent = true;
      document.getElementById("notes-content").value = note.content;
      document.getElementById("current-note-title").textContent = note.title;
      renderFolders();
      if (typeof renderSelectedTags === 'function') renderSelectedTags();
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
    content: document.getElementById("notes-content").value,
    folderId: folderId,
    createdAt: new Date().toISOString(),
    isCurrent: true,
  };

  notes.forEach((n) => (n.isCurrent = false));
  notes.unshift(newNote);
  saveNotes();
  document.getElementById("current-note-title").textContent = title;
  renderFolders();
  sendNoteToServer(newNote);
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

document.addEventListener("DOMContentLoaded", () => {
  syncDataFromServer();
  renderFolders();
});

document.getElementById("save-note-btn-manual").addEventListener("click", () => {
  const activeNote = notes.find((n) => n.isCurrent);
  if (activeNote) {
    activeNote.content = document.getElementById("notes-content").value;
    sendNoteToServer(activeNote);
  }
});