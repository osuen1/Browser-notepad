// --- Инициализация данных ---
let folders = JSON.parse(localStorage.getItem("folders")) || [
  { id: 1, name: "Работа", children: [] },
  { id: 4, name: "Личное", children: [] },
];
let notes = JSON.parse(localStorage.getItem("notes")) || [];
let syncTimeout; // Для задержки отправки на сервер

// --- Вспомогательные функции ---
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Генерация числового ID для папки
function generateFolderId() {
  // Простая генерация числового ID, можно улучшить для большей уникальности
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
}

function getUserId() {
  return parseInt(localStorage.getItem("user_id")); // Получаем ID, сохраненный при логине
}

// --- Работа с API (Сервер на Go) ---

// Отправка заметки на сервер
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
    Folder_id: note.folderId, // Ожидается числовой ID папки
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

// Отправка новой папки на сервер
async function sendFolderToServer(folder) {
  const userId = getUserId();
  if (!userId) {
    console.warn("User_id не найден. Синхронизация папок с сервером невозможна.");
    return null;
  }

  // Структура для отправки на бэкенд (должна соответствовать FolderData в page_handler.go)
  const payload = {
    id: folder.id, // Числовой ID папки
    name: folder.name,
    user_id: userId,
    parent_id: folder.parentId || 0, // Используем 0 для корневых папок
  };

  try {
    const response = await fetch("/api/folders/create", { // Новый эндпоинт для создания папок
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Ошибка сервера при создании папки: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Папка "${folder.name}" синхронизирована с сервером`);
    return result.folder_id; // Возвращаем ID папки с сервера

  } catch (error) {
    console.error("❌ Ошибка при отправке папки на сервер:", error);
    return null;
  }
}


// Синхронизация заметок с сервера (остается как есть, т.к. folderId уже числовой)
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

    if (serverNotes && Array.isArray(serverNotes)) {
      notes = serverNotes.map((sn) => ({
        id: sn.ID_note.toString(),
        title: sn.Title,
        content: sn.Data,
        folderId: sn.Folder_id, // Ожидаем числовой ID папки
        isCurrent: false,
      }));

      saveNotes();
      // renderFolders(); // Не перерисовываем здесь, т.к. syncDataFromServer будет вызвана
    }
  } catch (error) {
    console.error("❌ Ошибка синхронизации заметок:", error);
    alert("Не удалось загрузить заметки с сервера");
  }
}

// Синхронизация данных (папок и заметок) с сервера
async function syncDataFromServer() {
  const userId = getUserId();
  if (!userId) {
    alert("Пожалуйста, войдите в систему для синхронизации.");
    return;
  }

  try {
    // 1. Получаем заметки
    await syncNotesFromServer(); // Вызываем синхронизацию заметок

    // 2. Получаем структуру папок
    const foldersResponse = await fetch("/api/folders/get", { // Новый эндпоинт для получения папок
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!foldersResponse.ok) throw new Error(`Ошибка сервера при получении папок: ${foldersResponse.status}`);
    const serverFolders = await foldersResponse.json();

    // Обновляем локальные папки. 
    // Внимание: Эта простая замена может потерять локально созданные папки, если они еще не синхронизированы.
    // Для более надежной синхронизации потребуется сложная логика слияния.
    folders = serverFolders || []; // Используем [] если serverFolders пуст или null
    saveFolders();

    renderFolders(); // Перерисовываем интерфейс после полной синхронизации
    alert("✅ Данные успешно синхронизированы с сервером");

  } catch (error) {
    console.error("❌ Ошибка синхронизации:", error);
    alert("Не удалось загрузить данные с сервера");
  }
}

// Отправка запроса на удаление заметки с сервера
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
    // Синхронизация с сервером через 1 секунду после окончания набора текста (можно добавить debounce)
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

    // data-id теперь содержит числовой ID
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

    // Рекурсивно рендерим подпапки, если они есть
    if (folder.children && folder.children.length > 0) {
      renderFolders(folder.children, subfolderContainer);
    }
    // Рендерим заметки в текущей папке
    renderNotesInFolder(folder.id, noteContainer);

    // Раскрытие/скрытие содержимого папки
    folderElement
      .querySelector(".folder-item")
      .addEventListener("click", (e) => {
        // Не раскрываем, если клик был по кнопкам действий
        if (!e.target.closest(".folder-actions")) {
          const isOpen = contentDiv.classList.toggle("open");
          folderElement.querySelector(".toggle-icon").style.transform = isOpen
            ? "rotate(90deg)"
            : "rotate(0deg)";
        }
      });

    // Обработчик кнопки "Создать заметку"
    folderElement
      .querySelector(".create-note")
      .addEventListener("click", (e) => {
        e.stopPropagation(); // Предотвращаем всплытие события клика на folder-item
        createNoteInFolder(folder.id);
      });

    // Обработчик кнопки "Добавить подпапку"
    folderElement
      .querySelector(".add-subfolder")
      .addEventListener("click", (e) => {
        e.stopPropagation(); // Предотвращаем всплытие события клика на folder-item
        const subName = prompt("Название подпапки:");
        if (subName) addFolder(folder.id, subName); // Передаем ID родительской папки
      });
  });
}

// Рендерит заметки внутри указанной папки
function renderNotesInFolder(folderId, container) {
  container.innerHTML = "";
  const folderNotes = notes.filter((note) => note.folderId === folderId);

  folderNotes.forEach((note) => {
    const noteElement = document.createElement("li");
    noteElement.className = "note-item";
    if (note.isCurrent) noteElement.classList.add("active"); // Добавляем класс 'active' для текущей заметки

    noteElement.innerHTML = `
            <i class="far fa-file-alt note-icon"></i>
            <span class="note-title">${note.title}</span>
        `;

    // Обработчик клика по заметке: активирует ее и отображает в редакторе
    noteElement.addEventListener("click", () => {
      notes.forEach((n) => (n.isCurrent = false)); // Снимаем активность со всех заметок
      note.isCurrent = true; // Делаем текущую заметку активной
      document.getElementById("notes-content").value = note.content; // Заполняем редактор
      document.getElementById("current-note-title").textContent = note.title; // Обновляем заголовок
      renderFolders(); // Перерисовываем список папок, чтобы обновить класс 'active'
    });

    container.appendChild(noteElement);
  });
}

// --- Управление структурой ---

// Создание новой заметки в указанной папке
function createNoteInFolder(folderId) {
  const title = prompt("Название заметки:");
  if (!title) return; // Если название не введено, выходим

  const newNote = {
    id: generateId(), // Уникальный ID заметки
    title: title,
    content: "",
    folderId: folderId, // ID папки, в которую добавляем заметку (числовой)
    createdAt: new Date().toISOString(),
    isCurrent: true, // Новая заметка сразу становится активной
  };

  // Делаем новую заметку активной, остальные неактивными
  notes.forEach((n) => (n.isCurrent = false));
  notes.unshift(newNote); // Добавляем новую заметку в начало списка
  saveNotes(); // Сохраняем локально

  // Обновляем редактор и заголовок
  document.getElementById("notes-content").value = ""; // Очищаем редактор
  document.getElementById("current-note-title").textContent = title; // Устанавливаем заголовок
  renderFolders(); // Перерисовываем список папок
}

// Добавление новой папки (корневой или подпапки)
function addFolder(parentId, name) {
  // Создаем временный объект папки с уникальным числовым ID
  const newLocalFolder = { 
    FolderId: generateFolderId(), 
    Name: name, 
    Children: [],
    ParentId: parentId, // Сохраняем parentId для отправки на сервер
    isLocal: true // Флаг, чтобы отличать локально созданные папки
  };

  // Добавляем папку локально для немедленного отображения
  if (!parentId) {
    // Добавление корневой папки
    folders.push(newLocalFolder);
  } else {
    // Добавление подпапки
    const parent = findFolderById(folders, parentId);
    if (parent) {
      // Проверяем, есть ли у родителя поле children, если нет - создаем
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(newLocalFolder);
    } else {
      console.error(`Родительская папка с ID ${parentId} не найдена.`);
      return; // Если родителя нет, выходим
    }
  }
  saveFolders(); // Сохраняем обновленную структуру папок локально
  renderFolders(); // Перерисовываем интерфейс

  // Отправляем папку на сервер для синхронизации
  sendFolderToServer(newLocalFolder).then(serverId => {
    if (serverId !== null && serverId !== undefined) { // Проверяем, что ID получен успешно
      // Если папка успешно создана на сервере:
      // 1. Находим созданную папку по ее временному локальному ID
      const createdFolder = findFolderById(folders, newLocalFolder.id); 
      if (createdFolder) {
        createdFolder.id = serverId; // Обновляем локальный ID на ID, полученный с сервера
        createdFolder.isLocal = false; // Снимаем флаг локальной папки
        createdFolder.parentId = parentId; // Убедимся, что parentId правильный

        // Обновляем folderId у всех заметок, которые были добавлены в эту папку
        // до ее синхронизации с сервером (их folderId равен временному локальному ID)
        notes.forEach(note => {
          if (note.folderId === newLocalFolder.id) {
            note.folderId = serverId; // Заменяем временный ID на серверный
          }
        });

        saveFolders(); // Сохраняем обновленную структуру с серверным ID
        saveNotes();   // Сохраняем обновленные заметки
        renderFolders(); // Перерисовываем интерфейс, чтобы отобразить правильные ID
        console.log(`Папка "${name}" успешно синхронизирована с ID ${serverId}.`);
      } else {
        console.error(`Не удалось найти созданную папку ${newLocalFolder.id} для обновления.`);
      }
    } else {
      // Если при отправке на сервер произошла ошибка
      alert(`Не удалось синхронизировать папку "${name}". Пожалуйста, попробуйте позже.`);
      // Здесь можно добавить логику для удаления локально созданной папки, если синхронизация не удалась,
      // или пометить ее как "не синхронизированную" для повторной попытки.
    }
  });
}

// Рекурсивно ищет папку по ID в списке папок (включая вложенные)
function findFolderById(list, id) {
  for (const f of list) {
    if (f.id === id) return f; // Найдена папка
    // Если у папки есть подпапки, рекурсивно ищем в них
    if (f.children && f.children.length > 0) {
      const found = findFolderById(f.children, id);
      if (found) return found; // Найдена в подпапках
    }
  }
  return null; // Папка не найдена
}

// Подсчет количества заметок в указанной папке
function countNotesInFolder(folderId) {
  return notes.filter((note) => note.folderId === folderId).length;
}

// --- Слушатели событий ---

// Обновление содержимого заметки при вводе текста
document.getElementById("notes-content").addEventListener("input", loadNotes);

// Добавление корневой папки
document.getElementById("add-root-folder").addEventListener("click", () => {
  const name = document.getElementById("new-folder-input").value.trim();
  if (name) {
    addFolder(null, name); // null как parentId означает корневую папку
    document.getElementById("new-folder-input").value = ""; // Очищаем поле ввода
  }
});

// Ручное сохранение заметки (с отправкой на сервер)
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

// Удаление активной заметки
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
        // Удаляем заметку из локального массива
        notes = notes.filter((n) => n.id !== activeNote.id);
        saveNotes();
        // Очищаем редактор и заголовок
        document.getElementById("notes-content").value = "";
        document.getElementById("current-note-title").textContent =
          "Новая заметка";
        // Снимаем активность с любой заметки
        notes.forEach((n) => (n.isCurrent = false));
        renderFolders(); // Перерисовываем папки
        alert("Заметка успешно удалена.");
      } else {
        alert("Не удалось удалить заметку с сервера.");
      }
    }
  });

// Кнопка синхронизации данных (заметок и папок)
document
  .getElementById("sync-notes-btn")
  .addEventListener("click", syncDataFromServer); // Используем новую функцию синхронизации

// Выход из аккаунта
document.getElementById("logout-btn").addEventListener("click", () => {
  if (confirm("Вы уверены, что хотите выйти?")) {
    localStorage.clear(); // Очищаем все данные локального хранилища
    window.location.replace("/login.html"); // Перенаправление на страницу логина
  }
});

// --- Инициализация при загрузке ---
window.onload = () => {
  // При первой загрузке, если локальных данных нет, пытаемся синхронизировать с сервером
  // Проверяем наличие хотя бы одного элемента в folders или notes, чтобы не делать лишний запрос
  if (!localStorage.getItem("folders") && !localStorage.getItem("notes")) {
      console.log("Локальные данные не найдены, пытаюсь синхронизировать с сервером...");
      syncDataFromServer();
  } else {
      // Если локальные данные есть, просто рендерим их
      console.log("Локальные данные найдены, рендерю...");
      renderFolders();
  }
  
  renderCalendar(); // Рендерим календарь

  // Устанавливаем содержимое редактора, если есть активная заметка
  const active = notes.find((n) => n.isCurrent);
  if (active) {
    document.getElementById("notes-content").value = active.content;
    document.getElementById("current-note-title").textContent = active.title;
  }
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
