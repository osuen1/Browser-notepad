// --- Инициализация данных ---
let folders = JSON.parse(localStorage.getItem("folders")) || [
  { id: "1", name: "Работа", children: [] },
  { id: "4", name: "Личное", children: [] },
];
let notes = JSON.parse(localStorage.getItem("notes")) || [];
let syncTimeout; // Для задержки отправки на сервер

// --- Вспомогательные функции ---
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getUserId() {
  return parseInt(localStorage.getItem("user_id")); // Получаем ID, сохраненный при логине
}

// --- Работа с API (Сервер на Go) ---
async function sendNoteToServer(note) {
  const userId = getUserId();
  if (!userId) {
    console.warn("User_id не найден. Синхронизация с сервером невозможна.");
    return;
  }

  const payload = {
    User_id: userId,
    Title: note.title,
    Date: new Date().toISOString(),
    Data: note.content,
    ID_note: note.id,
    Folder_id: parseInt(note.folderId),
  };

  try {
    const response = await fetch("/api/notes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    console.log("✅ Заметка синхронизирована с сервером");
  } catch (error) {
    console.error("❌ Ошибка при отправке на сервер:", error);
  }
}

async function syncNotesFromServer() {
  const userId = getUserId();
  if (!userId) {
    alert("Пожалуйста, войдите в систему для синхронизации.");
    return;
  }

  try {
    const response = await fetch("/api/notes/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);

    const serverNotes = await response.json();

    // ВАЖНО: Маппинг данных зависит от структуры, которую возвращает db.Get_notes
    if (serverNotes && Array.isArray(serverNotes)) {
      // Очищаем текущие локальные данные (или можно реализовать мердж)
      notes = serverNotes.map((sn) => ({
        id: sn.ID_note.toString(),
        title: sn.Title,
        content: sn.Data, // Теперь поле совпадает с NoteData на сервере
        folderId: sn.Folder_id.toString(), // Теперь Folder_id доступен
        isCurrent: false,
      }));

      saveNotes();
      renderFolders();
      alert("✅ Заметки успешно синхронизированы с сервером");
    }
  } catch (error) {
    console.error("❌ Ошибка синхронизации:", error);
    alert("Не удалось загрузить заметки с сервера");
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

// --- Управление заметками (Логика) ---

function loadNotes() {
  const noteContent = document.getElementById("notes-content").value;
  const activeNote = notes.find((n) => n.isCurrent);

  if (activeNote) {
    activeNote.content = noteContent;
    saveNotes(); // Локальное сохранение

    // Синхронизация с сервером через 1 секунду после окончания набора текста
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
                </div>
            </div>
            <div class="folder-content" id="content-${folder.id}">
                <ul class="subfolders-list"></ul>
                <ul class="note-list"></ul>
            </div>
        `;

    container.appendChild(folderElement);

    const contentDiv = folderElement.querySelector(".folder-content");
    const subfolderContainer = folderElement.querySelector(".subfolders-list");
    const noteContainer = folderElement.querySelector(".note-list");

    if (folder.children.length > 0)
      renderFolders(folder.children, subfolderContainer);
    renderNotesInFolder(folder.id, noteContainer);

    // Раскрытие папки
    folderElement
      .querySelector(".folder-item")
      .addEventListener("click", (e) => {
        if (!e.target.closest(".folder-actions")) {
          const isOpen = contentDiv.classList.toggle("open");
          folderElement.querySelector(".toggle-icon").style.transform = isOpen
            ? "rotate(90deg)"
            : "rotate(0deg)";
        }
      });

    // Кнопки внутри папки
    folderElement
      .querySelector(".create-note")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        createNoteInFolder(folder.id);
      });

    folderElement
      .querySelector(".add-subfolder")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        const subName = prompt("Название подпапки:");
        if (subName) addFolder(folder.id, subName);
      });
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
  const newFolder = { id: generateId(), name, children: [] };
  if (!parentId) {
    folders.push(newFolder);
  } else {
    const parent = findFolderById(folders, parentId);
    if (parent) parent.children.push(newFolder);
  }
  saveFolders();
  renderFolders();
}

function findFolderById(list, id) {
  for (const f of list) {
    if (f.id === id) return f;
    const found = findFolderById(f.children, id);
    if (found) return found;
  }
  return null;
}

function countNotesInFolder(folderId) {
  return notes.filter((n) => n.folderId === folderId).length;
}

// --- Слушатели событий ---

document.getElementById("notes-content").addEventListener("input", loadNotes);

document.getElementById("add-root-folder").addEventListener("click", () => {
  const name = document.getElementById("new-folder-input").value.trim();
  if (name) {
    addFolder(null, name);
    document.getElementById("new-folder-input").value = "";
  }
});

document
  .getElementById("save-note-btn-manual")
  .addEventListener("click", () => {
    const activeNote = notes.find((n) => n.isCurrent);
    if (activeNote) {
      // Принудительно обновляем контент перед отправкой
      activeNote.content = document.getElementById("notes-content").value;
      sendNoteToServer(activeNote);
      alert("Отправка на сервер...");
    } else {
      alert("Нет активной заметки для сохранения");
    }
  });

document
  .getElementById("delete-note-btn")
  .addEventListener("click", async () => {
    const activeNote = notes.find((n) => n.isCurrent);
    if (!activeNote) {
      alert("Нет активной заметки для удаления.");
      return;
    }

    if (
      confirm(`Вы уверены, что хотите удалить заметку "${activeNote.title}"?`)
    ) {
      const success = await sendDeleteNoteToServer(activeNote.id);
      if (success) {
        notes = notes.filter((n) => n.id !== activeNote.id);
        saveNotes();
        // Clear editor and title
        document.getElementById("notes-content").value = "";
        document.getElementById("current-note-title").textContent =
          "Новая заметка";
        // Deselect any active note
        notes.forEach((n) => (n.isCurrent = false));
        renderFolders();
        alert("Заметка успешно удалена.");
      } else {
        alert("Не удалось удалить заметку с сервера.");
      }
    }
  });

document
  .getElementById("sync-notes-btn")
  .addEventListener("click", syncNotesFromServer);

document.getElementById("logout-btn").addEventListener("click", () => {
  if (confirm("Вы уверены, что хотите выйти?")) {
    localStorage.clear();
    window.location.replace("/login.html"); // Перенаправление на главную страницу или страницу логина
  }
});

// --- Инициализация при загрузке ---
window.onload = () => {
  renderFolders();
  renderCalendar(); // Добавьте эту строку

  const active = notes.find((n) => n.isCurrent);
  if (active) {
    document.getElementById("notes-content").value = active.content;
    document.getElementById("current-note-title").textContent = active.title;
  }
};

// --- Логика динамического календаря ---

let currentDisplayDate = new Date();

function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const monthYearLabel = document.getElementById("calendar-month-year");

  if (!grid || !monthYearLabel) return;

  grid.innerHTML = "";
  const year = currentDisplayDate.getFullYear();
  const month = currentDisplayDate.getMonth();

  // Установка заголовка (Месяц Год)
  const monthNames = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
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

  // Расчет дат
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Смещение для понедельника (в JS 0 - это воскресенье)
  let startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Предыдущий месяц (серые дни)
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startOffset; i > 0; i--) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day other-month";
    dayDiv.textContent = prevMonthLastDay - i + 1;
    grid.appendChild(dayDiv);
  }

  // Текущий месяц
  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day";
    dayDiv.textContent = d;

    if (
      d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      dayDiv.classList.add("today");
    }
    grid.appendChild(dayDiv);
  }

  // Следующий месяц (заполнение остатка сетки до 42 ячеек для ровности)
  const totalCells = grid.children.length - 7; // исключая заголовки
  const remaining = 42 - totalCells;
  for (let i = 1; i <= remaining; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day other-month";
    dayDiv.textContent = i;
    grid.appendChild(dayDiv);
  }
}

// Слушатели для навигации календаря
document.getElementById("prev-month")?.addEventListener("click", () => {
  currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("next-month")?.addEventListener("click", () => {
  currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
  renderCalendar();
});

document.getElementById("today-btn")?.addEventListener("click", () => {
  currentDisplayDate = new Date(); // Устанавливаем текущую дату
  renderCalendar();
});
