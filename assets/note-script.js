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
let todos = JSON.parse(localStorage.getItem("todos")) || [];


let notes = JSON.parse(localStorage.getItem("notes")) || [];
let syncTimeout;
let isPreviewMode = false;

let todoListLink = document.getElementById("todo-list-link").addEventListener("click", () => {
  window.location.href = "/todolist";
})


function updatePreview() {
  const rawText = document.getElementById("notes-content").value;
  const previewContainer = document.getElementById("notes-preview");

  // Используем библиотеку marked для парсинга
  // sanitize: true защищает от XSS (в современных версиях это делается через опции или доп. библиотеки)
  previewContainer.innerHTML = marked.parse(rawText);
}

function togglePreview() {
  const editor = document.getElementById("notes-content");
  const preview = document.getElementById("notes-preview");
  const toggleBtn = document.getElementById("toggle-preview-btn");

  isPreviewMode = !isPreviewMode;

  if (isPreviewMode) {
    updatePreview();
    editor.style.display = "none";
    preview.style.display = "block";
    toggleBtn.innerHTML = '<i class="fas fa-edit"></i>'; // Меняем иконку на карандаш
    toggleBtn.title = "Редактировать";
  } else {
    editor.style.display = "block";
    preview.style.display = "none";
    toggleBtn.innerHTML = '<i class="fas fa-eye"></i>'; // Меняем обратно на глаз
    toggleBtn.title = "Предпросмотр";
  }
}

// Функция сохранения тегов
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

// Функция для преобразования плоского списка папок от сервера в древовидную структуру
function buildFolderTree(flatFolders) {
  const folderMap = {};
  const tree = [];

  // 1. Создаем объект-карту, чтобы быстро находить папки по ID
  flatFolders.forEach(f => {
    // Важно: в Go поле называется FolderId, используем его
    folderMap[f.FolderId] = {
      id: f.FolderId,
      name: f.Name,
      parentId: f.ParentId,
      children: []
    };
  });

  // 2. Проходим по всем папкам и распределяем их: либо в корень, либо в родителя
  flatFolders.forEach(f => {
    const folder = folderMap[f.FolderId];
    if (f.ParentId && f.ParentId !== 0 && folderMap[f.ParentId]) {
      // Если есть родитель — пушим в его массив children
      folderMap[f.ParentId].children.push(folder);
    } else {
      // Если родителя нет (0) — это корневая папка
      tree.push(folder);
    }
  });

  return tree;
}

// Функция для удаления папки из дерева
function removeFolderRecursive(list, id) {
  return list.filter(f => {
    if (f.id === id) return false;
    if (f.children) {
      f.children = removeFolderRecursive(f.children, id);
    }
    return true;
  });
}
// --- Работа с API (Сервер на Go) ---

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
  if (!userId) {
    console.warn("User_id не найден.");
    return null;
  }

  // Соответствует структуре FolderData в page_handler.go
  const payload = {
    user_id: userId,
    Name: folder.Name,      // В Go: json:"Name"
    FolderId: folder.FolderId, // В Go: json:"FolderId"
    ParentId: folder.ParentId || 0 // В Go: json:"ParentId"
  };

  try {
    const response = await fetch("/api/folders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    // CreateFolderHandler в Go ничего не возвращает в теле (только статус), 
    // поэтому просто подтверждаем успех по статусу 200 OK
    console.log(`✅ Папка "${folder.Name}" синхронизирована`);
    return folder.FolderId; 

  } catch (error) {
    console.error("❌ Ошибка при отправке папки:", error);
    return null;
  }
}

async function syncNotesFromServer() {
  const userId = getUserId();
  if (!userId) return;

  try {
    const response = await fetch("/api/notes/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);

    const serverNotes = await response.json();

    if (serverNotes && Array.isArray(serverNotes)) {
      notes = serverNotes.map((sn) => ({
        id: sn.ID_note.toString(),
        title: sn.Title,
        content: sn.Data,
        folderId: sn.Folder_id,
        isCurrent: false,
      }));
      saveNotes();
    }
  } catch (error) {
    console.error("❌ Ошибка синхронизации заметок:", error);
  }
}

async function syncDataFromServer() {
  const userId = getUserId();
  if (!userId) {
    alert("Пожалуйста, войдите в систему.");
    return;
  }

  try {
    // 1. Сначала загружаем заметки (как и было)
    await syncNotesFromServer();

    // 2. Делаем запрос к серверу за папками
    const foldersResponse = await fetch("/api/folders/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!foldersResponse.ok) throw new Error(`Ошибка сервера папок: ${foldersResponse.status}`);

    const serverFolders = await foldersResponse.json();

    // 3. ПРЕОБРАЗОВАНИЕ: вместо простого .map используем нашу новую функцию
    if (serverFolders && Array.isArray(serverFolders)) {
      folders = buildFolderTree(serverFolders);
    } else {
      folders = [];
    }

    // 4. Сохраняем и перерисовываем интерфейс
    saveFolders();
    renderFolders();
    console.log("✅ Структура папок успешно восстановлена");

  } catch (error) {
    console.error("❌ Ошибка синхронизации:", error);
  }
}

// Функция вызова API сервера
async function sendDeleteFolderToServer(folderId) {
  const userId = getUserId();
  // Структура должна совпадать с FolderData в page_handler.go (json:"FolderId")
  const payload = {
    user_id: userId,
    FolderId: parseInt(folderId)
  };

  try {
    const response = await fetch("/api/folders/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Ошибка при удалении на сервере");
    return true;
  } catch (error) {
    console.error("❌ Ошибка удаления папки:", error);
    return false;
  }
}

// Логика удаления из интерфейса и массива
async function deleteFolder(folderId, folderName) {
  if (!confirm(`Вы уверены, что хотите удалить папку "${folderName}" и всё её содержимое?`)) {
    return;
  }

  const success = await sendDeleteFolderToServer(folderId);
  if (success) {
    // Рекурсивное удаление из локального массива folders
    folders = removeFolderRecursive(folders, folderId);

    // Удаляем также все заметки, которые были в этой папке
    notes = notes.filter(note => note.folderId !== folderId);

    saveFolders();
    saveNotes();
    renderFolders();
    console.log(`✅ Папка ${folderId} удалена`);
  } else {
    alert("Не удалось удалить папку с сервера.");
  }
}

// --- Управление заметками ---

function loadNotes() {
  const noteContent = document.getElementById("notes-content").value;
  const activeNote = notes.find((n) => n.isCurrent);
  if (activeNote) {
    activeNote.content = noteContent;
    saveNotes();
  }
}

function saveNotes() {
  localStorage.setItem("notes", JSON.stringify(notes));
}

function saveFolders() {
  localStorage.setItem("folders", JSON.stringify(folders));
}

// --- Рендеринг интерфейса ---

function renderFolders(
  foldersList = folders,
  container = document.getElementById("folder-list"),
) {
  container.innerHTML = "";

  foldersList.forEach((folder) => {
    const noteCount = countNotesInFolder(folder.id);
    const folderElement = document.createElement("li");
    folderElement.className = "folder-wrapper";

    folderElement.innerHTML = `
            <div class="folder-item" data-id="${folder.id}">
                <i class="fas fa-chevron-right toggle-icon"></i>
                <i class="fas fa-folder folder-icon"></i>
                <span class="folder-name">${folder.name}</span>
                <span class="item-count">${noteCount}</span>
                <div class="folder-actions">
                    <button class="folder-action-btn create-note" title="Создать заметку"><i class="fas fa-pencil-alt"></i></button>
                    <button class="folder-action-btn add-subfolder" title="Добавить подпапку"><i class="fas fa-plus"></i></button>
                    <button class="folder-action-btn delete-folder" title="Удалить папку"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="folder-content" id="content-${folder.id}">
                <ul class="subfolders-list"></ul>
                <ul class="note-list"></ul>
            </div>
        `;

    container.appendChild(folderElement);

    // Обработчик удаления
    folderElement.querySelector(".delete-folder").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFolder(folder.id, folder.name);
    });

    // Остальные обработчики (раскрытие, создание заметок и подпапок)
    const contentDiv = folderElement.querySelector(".folder-content");
    folderElement.querySelector(".folder-item").addEventListener("click", (e) => {
      if (!e.target.closest(".folder-actions")) {
        const isOpen = contentDiv.classList.toggle("open");
        folderElement.querySelector(".toggle-icon").style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
      }
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

    // Рекурсия для вложенных папок и заметок
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

// --- Управление структурой ---

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
  // Используем названия полей, которые легко мапятся на Go-структуру
  const newLocalFolder = {
    FolderId: generateFolderId(),
    Name: name,
    Children: [],
    ParentId: parentId || 0,
    id: null // Сюда запишем ID для JS-логики после генерации
  };
  newLocalFolder.id = newLocalFolder.FolderId;

  // Локальное обновление для UI (мапим под JS формат)
  const uiFolder = { id: newLocalFolder.id, name: name, children: [], parentId: parentId };

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

  // Отправка на сервер
  sendFolderToServer(newLocalFolder);
}

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

function countNotesInFolder(folderId) {
  return notes.filter((note) => note.folderId === folderId).length;
}

// --- Слушатели ---
document.getElementById("notes-content").addEventListener("input", function () {
  loadNotes();
  renderSelectedTags(); // Обновляем отображение тегов при изменении заметки
});

document.getElementById("add-root-folder").addEventListener("click", () => {
  const name = document.getElementById("new-folder-input").value.trim();
  if (name) {
    addFolder(null, name);
    document.getElementById("new-folder-input").value = "";
  }
});

document.getElementById("save-note-btn-manual").addEventListener("click", () => {
  const activeNote = notes.find((n) => n.isCurrent);
  if (activeNote) {
    activeNote.content = document.getElementById("notes-content").value;
    sendNoteToServer(activeNote);
  }
});

document.getElementById("delete-note-btn").addEventListener("click", async () => {
  const activeNote = notes.find((n) => n.isCurrent);
  if (activeNote && confirm(`Удалить "${activeNote.title}"?`)) {
    if (await sendDeleteNoteToServer(activeNote.id)) {
      notes = notes.filter((n) => n.id !== activeNote.id);
      saveNotes();
      renderFolders();
    }
  }
});

document.getElementById("sync-notes-btn").addEventListener("click", syncDataFromServer);

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.clear();
  window.location.replace("/login.html");
});

window.onload = () => {
  if (!localStorage.getItem("folders") && !localStorage.getItem("notes")) {
    syncDataFromServer();
  } else {
    renderFolders();
  }

  todos = JSON.parse(localStorage.getItem("todos")) || [];
  renderTodo();
  syncTodosFromServer();

  renderCalendar();
};

// Функция загрузки todos с сервера
async function syncTodosFromServer() {
  const userId = getUserId();
  if (!userId) {
    console.warn("User_id не найден.");
    return;
  }

  try {
    const response = await fetch("/api/todos/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }), // ИСПРАВЛЕНО: user_id вместо User_id
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);

    const data = await response.json();
    console.log("Полученные с сервера todos:", data);

    // ИСПРАВЛЕНО: правильная обработка ответа
    if (data && Array.isArray(data)) {
      todos = data.map(todo => ({
        Id: todo.Id,
        Text: todo.Text,
        IsDone: todo.IsDone
      }));
    } else if (data && Array.isArray(data.TodoData)) {
      todos = data.TodoData;
    } else {
      todos = [];
    }

    localStorage.setItem("todos", JSON.stringify(todos));
    renderTodo();
    console.log("✅ Todos синхронизированы с сервера");
  } catch (error) {
    console.error("❌ Ошибка синхронизации todos:", error);
  }
}

// Функция отправки новой задачи на сервер
async function addTodo() {
  const task = prompt("Введите задачу");
  if (!task?.trim()) return;

  const userId = getUserId();
  if (!userId) {
    alert("Пожалуйста, войдите в систему");
    return;
  }

  const payload = {
    user_id: userId, // ИСПРАВЛЕНО: user_id вместо User_id
    Text: task.trim(),
    IsDone: false
  };

  console.log("Отправка todo:", payload);

  try {
    const response = await fetch("/api/todo/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ошибка сервера:", errorText);
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    const savedTodo = await response.json();
    console.log("Сохраненная задача:", savedTodo);
    
    todos.push(savedTodo);
    localStorage.setItem("todos", JSON.stringify(todos));
    renderTodo();
    
    console.log("✅ Задача добавлена!");
  } catch (error) {
    console.error("❌ Ошибка при добавлении задачи:", error);
    alert(`Не удалось добавить задачу: ${error.message}`);
  }
}

// Функция удаления задачи с сервера
async function deleteTodo(todoId) {
  const userId = getUserId();
  if (!userId) return false;

  const payload = {
    user_id: userId,
    Id: todoId
  };

  try {
    const response = await fetch("/api/todo/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Ошибка при удалении на сервере");
    
    // Удаляем локально
    todos = todos.filter(t => t.Id !== todoId);
    localStorage.setItem("todos", JSON.stringify(todos));
    renderTodo();
    
    console.log("✅ Задача удалена с сервера");
    return true;
  } catch (error) {
    console.error("❌ Ошибка удаления задачи:", error);
    return false;
  }
}

// Функция обновления статуса задачи
async function updateTodoStatus(todoId, isDone) {
  const userId = getUserId();
  if (!userId) return false;

  const payload = {
    user_id: userId,
    Id: todoId,
    IsDone: isDone
  };

  try {
    const response = await fetch("/api/todo/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Ошибка при обновлении");
    
    console.log("✅ Статус задачи обновлен");
    return true;
  } catch (error) {
    console.error("❌ Ошибка обновления задачи:", error);
    return false;
  }
}

// ИСПРАВЛЕННАЯ функция рендеринга TODO
function renderTodo() {
  const container = document.getElementById("todo-handler");
  if (!container) {
    console.warn("Контейнер todo-handler не найден");
    return;
  }
  
  container.innerHTML = "";

  // ИСПРАВЛЕНО: forEach вместо .for
  todos.forEach((todo) => {
    const todoElement = document.createElement("div");
    todoElement.className = "todo-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-checkbox";
    checkbox.checked = todo.IsDone;

    checkbox.addEventListener("change", async () => {
      todo.IsDone = checkbox.checked;
      await updateTodoStatus(todo.Id, todo.IsDone);
      localStorage.setItem("todos", JSON.stringify(todos));
    });

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.Text;
    if (todo.IsDone) {
      text.style.textDecoration = "line-through";
      text.style.opacity = "0.6";
    }

    // Кнопка удаления
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "todo-delete-btn";
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Удалить задачу?")) {
        await deleteTodo(todo.Id);
      }
    });

    todoElement.appendChild(checkbox);
    todoElement.appendChild(text);
    todoElement.appendChild(deleteBtn);
    container.appendChild(todoElement);
  });

  console.log(`Отрендерено ${todos.length} задач`);
}

document.getElementById("new-todo").addEventListener("click", () => {
  addTodo();
});


document.addEventListener('DOMContentLoaded', () => {
  // Загружаем теги при загрузке страницы
  loadTags();
  renderSidebarTags();

  todos = JSON.parse(localStorage.getItem("todos")) || [];
  renderTodo();

  document.getElementById("toggle-preview-btn")?.addEventListener("click", togglePreview);
  document.getElementById("notes-content").addEventListener("input", () => {
    if (isPreviewMode) updatePreview();
  });

  // Кнопка создания тега
  document.getElementById('create-tag-btn')?.addEventListener('click', () => {
    document.getElementById('tag-modal').style.display = 'flex';
  });

  // Кнопка выбора тегов для заметки
  document.getElementById('add-tags-btn')?.addEventListener('click', () => {
    const activeNote = notes.find(n => n.isCurrent);
    if (!activeNote) {
      alert('Сначала создайте или выберите заметку');
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