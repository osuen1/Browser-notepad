// --- Инициализация данных ---
let folders = JSON.parse(localStorage.getItem("folders")) || [
  { id: 1, name: "Работа", children: [] },
  { id: 4, name: "Личное", children: [] },
];
let notes = JSON.parse(localStorage.getItem("notes")) || [];
let syncTimeout; 

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

  const payload = {
    user_id: userId,
    Title: note.title,
    Date: new Date().toISOString(),
    Data: note.content,
    ID_note: note.id,
    Folder_id: note.folderId, 
  };

  try {
    const response = await fetch("/api/notes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    console.log("✅ Заметка синхронизирована");
  } catch (error) {
    console.error("❌ Ошибка при отправке на сервер:", error);
  }
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ: Поля теперь соответствуют FolderData в Go
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

    noteElement.innerHTML = `
            <i class="far fa-file-alt note-icon"></i>
            <span class="note-title">${note.title}</span>
        `;

    noteElement.addEventListener("click", () => {
      notes.forEach((n) => (n.isCurrent = false));
      note.isCurrent = true;
      document.getElementById("notes-content").value = note.content;
      document.getElementById("current-note-title").textContent = note.title;
      renderFolders();
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
  saveNotes();

  document.getElementById("notes-content").value = "";
  document.getElementById("current-note-title").textContent = title;
  renderFolders();
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
document.getElementById("notes-content").addEventListener("input", loadNotes);

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
  renderCalendar();
};

// --- Логика динамического календаря ---

let currentDisplayDate = new Date(); // Текущая дата для отображения календаря

// Функция рендеринга календаря
function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const monthYearLabel = document.getElementById("calendar-month-year");

  if (!grid || !monthYearLabel) return; // Если элементы календаря не найдены, выходим

  grid.innerHTML = ""; // Очищаем предыдущее содержимое
  const year = currentDisplayDate.getFullYear();
  const month = currentDisplayDate.getMonth();

  // Установка заголовка (Месяц Год)
  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];
  monthYearLabel.textContent = `${monthNames[month]} ${year}`;

  // Заголовки дней недели
  const weekDays = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
  weekDays.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "calendar-day weekday";
    dayHeader.textContent = day;
    grid.appendChild(dayHeader);
  });

  // Расчет дат для календаря
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // День недели первого дня месяца (0 - воскресенье)
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // Количество дней в месяце

  // Смещение для начала недели с понедельника (в JS 0 - воскресенье, 1 - понедельник, ..., 6 - суббота)
  let startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Отображение дней предыдущего месяца (серым цветом)
  const prevMonthLastDay = new Date(year, month, 0).getDate(); // Последний день предыдущего месяца
  for (let i = startOffset; i > 0; i--) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day other-month";
    dayDiv.textContent = prevMonthLastDay - i + 1;
    grid.appendChild(dayDiv);
  }

  // Отображение дней текущего месяца
  const today = new Date(); // Получаем текущую дату
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day";
    dayDiv.textContent = d;

    // Помечаем сегодняшний день
    if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayDiv.classList.add("today");
    }
    grid.appendChild(dayDiv);
  }

  // Отображение дней следующего месяца (для заполнения сетки)
  // Всего в сетке 42 ячейки (6 недель * 7 дней)
  const totalCellsRendered = grid.children.length - weekDays.length; // Кол-во ячеек, уже добавленных (дни пред. месяца + текущего)
  const remainingCells = 42 - (totalCellsRendered + weekDays.length); // Оставшиеся ячейки для дней следующего месяца
  for (let i = 1; i <= remainingCells; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day other-month";
    dayDiv.textContent = i;
    grid.appendChild(dayDiv);
  }
}

// Слушатели для навигации календаря (предыдущий/следующий месяц, сегодня)
document.getElementById("prev-month")?.addEventListener("click", () => {
  currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1); // Переход на предыдущий месяц
  renderCalendar(); // Перерисовываем календарь
});

document.getElementById("next-month")?.addEventListener("click", () => {
  currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1); // Переход на следующий месяц
  renderCalendar(); // Перерисовываем календарь
});

document.getElementById("today-btn")?.addEventListener("click", () => {
  currentDisplayDate = new Date(); // Устанавливаем текущую дату
  renderCalendar(); // Перерисовываем календарь
});
