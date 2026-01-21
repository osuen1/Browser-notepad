// === НАВИГАЦИЯ ===
document.getElementById("new-note")?.addEventListener("click", () => {
  window.location.href = "/new_note";
});

document.getElementById("logout-btn")?.addEventListener("click", () => {
  localStorage.clear();
  window.location.replace("/login.html");
});

// === ХРАНИЛИЩЕ TODO ===
let todos = [];
let folders = JSON.parse(localStorage.getItem("folders")) || [];
let tags = JSON.parse(localStorage.getItem("tags")) || [];

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function getUserId() {
  return parseInt(localStorage.getItem("user_id"));
}

function generateFolderId() {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
}

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

function removeFolderRecursive(list, id) {
  return list.filter(f => {
    if (f.id === id) return false;
    if (f.children) {
      f.children = removeFolderRecursive(f.children, id);
    }
    return true;
  });
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

function saveFolders() {
  localStorage.setItem("folders", JSON.stringify(folders));
}

function saveTags() {
  localStorage.setItem("tags", JSON.stringify(tags));
}

// === API ФУНКЦИИ ===

// Загрузка папок с сервера
async function syncFoldersFromServer() {
  const userId = getUserId();
  if (!userId) return;

  try {
    const response = await fetch("/api/folders/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) throw new Error(`Ошибка сервера папок: ${response.status}`);

    const serverFolders = await response.json();

    if (serverFolders && Array.isArray(serverFolders)) {
      folders = buildFolderTree(serverFolders);
    } else {
      folders = [];
    }

    saveFolders();
    renderFolders();
    console.log("✅ Папки синхронизированы");
  } catch (error) {
    console.error("❌ Ошибка синхронизации папок:", error);
  }
}

// Создание папки на сервере
async function sendFolderToServer(folder) {
  const userId = getUserId();
  if (!userId) return false;

  const payload = {
    user_id: userId,
    FolderId: folder.FolderId,
    Name: folder.Name,
    ParentId: folder.ParentId || 0
  };

  try {
    const response = await fetch("/api/folders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Ошибка при создании папки");
    console.log("✅ Папка создана на сервере");
    return true;
  } catch (error) {
    console.error("❌ Ошибка создания папки:", error);
    return false;
  }
}

// Удаление папки с сервера
async function sendDeleteFolderToServer(folderId) {
  const userId = getUserId();
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

// Загрузка todos с сервера
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
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);

    const data = await response.json();
    console.log("📥 Полученные с сервера todos:", data);

    // Обработка разных форматов ответа
    if (Array.isArray(data)) {
      todos = data;
    } else if (data && Array.isArray(data.TodoData)) {
      todos = data.TodoData;
    } else {
      todos = [];
    }

    localStorage.setItem("todos", JSON.stringify(todos));
    renderTodoList();
    console.log("✅ Todos синхронизированы:", todos.length);
  } catch (error) {
    console.error("❌ Ошибка синхронизации todos:", error);
    // Загружаем из localStorage если есть
    const cached = localStorage.getItem("todos");
    if (cached) {
      todos = JSON.parse(cached);
      renderTodoList();
    }
  }
}

// Создание новой задачи
async function createTodo(text) {
  const userId = getUserId();
  if (!userId) {
    alert("Пожалуйста, войдите в систему");
    return false;
  }

  const payload = {
    user_id: userId,
    Text: text.trim(),
    IsDone: false
  };

  console.log("📤 Отправка todo:", payload);

  try {
    const response = await fetch("/api/todo/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ошибка сервера:", errorText);
      throw new Error(`Ошибка: ${response.status}`);
    }

    const savedTodo = await response.json();
    console.log("✅ Задача создана:", savedTodo);
    
    todos.push(savedTodo);
    localStorage.setItem("todos", JSON.stringify(todos));
    renderTodoList();
    
    return true;
  } catch (error) {
    console.error("❌ Ошибка при создании задачи:", error);
    alert(`Не удалось добавить задачу: ${error.message}`);
    return false;
  }
}

// Обновление статуса задачи
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
    
    // Обновляем локально
    const todo = todos.find(t => t.Id === todoId);
    if (todo) {
      todo.IsDone = isDone;
      localStorage.setItem("todos", JSON.stringify(todos));
    }
    
    console.log("✅ Статус задачи обновлен");
    return true;
  } catch (error) {
    console.error("❌ Ошибка обновления задачи:", error);
    return false;
  }
}

// Удаление задачи
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

    if (!response.ok) throw new Error("Ошибка при удалении");
    
    // Удаляем локально
    todos = todos.filter(t => t.Id !== todoId);
    localStorage.setItem("todos", JSON.stringify(todos));
    renderTodoList();
    
    console.log("✅ Задача удалена");
    return true;
  } catch (error) {
    console.error("❌ Ошибка удаления задачи:", error);
    return false;
  }
}

// === РЕНДЕРИНГ ===

// Рендеринг папок
function renderFolders(
  foldersList = folders,
  container = document.getElementById("folder-list")
) {
  if (!container) return;
  
  container.innerHTML = "";

  foldersList.forEach((folder) => {
    const folderElement = document.createElement("li");
    folderElement.className = "folder-wrapper";

    folderElement.innerHTML = `
      <div class="folder-item" data-id="${folder.id}">
        <i class="fas fa-chevron-right toggle-icon"></i>
        <i class="fas fa-folder folder-icon"></i>
        <span class="folder-name">${folder.name}</span>
        <div class="folder-actions">
          <button class="folder-action-btn add-subfolder" title="Добавить подпапку">
            <i class="fas fa-plus"></i>
          </button>
          <button class="folder-action-btn delete-folder" title="Удалить папку">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="folder-content" id="content-${folder.id}">
        <ul class="subfolders-list"></ul>
      </div>
    `;

    container.appendChild(folderElement);

    // Обработчик удаления
    folderElement.querySelector(".delete-folder").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFolder(folder.id, folder.name);
    });

    // Раскрытие папки
    const contentDiv = folderElement.querySelector(".folder-content");
    folderElement.querySelector(".folder-item").addEventListener("click", (e) => {
      if (!e.target.closest(".folder-actions")) {
        const isOpen = contentDiv.classList.toggle("open");
        folderElement.querySelector(".toggle-icon").style.transform = 
          isOpen ? "rotate(90deg)" : "rotate(0deg)";
      }
    });

    // Добавление подпапки
    folderElement.querySelector(".add-subfolder").addEventListener("click", (e) => {
      e.stopPropagation();
      const subName = prompt("Название подпапки:");
      if (subName) addFolder(folder.id, subName);
    });

    // Рекурсия для вложенных папок
    if (folder.children && folder.children.length > 0) {
      renderFolders(folder.children, folderElement.querySelector(".subfolders-list"));
    }
  });
}

// Добавление папки
function addFolder(parentId, name) {
  const newLocalFolder = {
    FolderId: generateFolderId(),
    Name: name,
    Children: [],
    ParentId: parentId || 0,
    id: null
  };
  newLocalFolder.id = newLocalFolder.FolderId;

  const uiFolder = { 
    id: newLocalFolder.id, 
    name: name, 
    children: [], 
    parentId: parentId 
  };

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
  sendFolderToServer(newLocalFolder);
}

// Удаление папки
async function deleteFolder(folderId, folderName) {
  if (!confirm(`Вы уверены, что хотите удалить папку "${folderName}" и всё её содержимое?`)) {
    return;
  }

  const success = await sendDeleteFolderToServer(folderId);
  if (success) {
    folders = removeFolderRecursive(folders, folderId);
    saveFolders();
    renderFolders();
    console.log(`✅ Папка ${folderId} удалена`);
  } else {
    alert("Не удалось удалить папку с сервера.");
  }
}

// Рендеринг тегов
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
      <span class="item-count">${tag.count || 0}</span>
    `;

    tagsList.appendChild(tagElement);
  });
}

// Рендеринг списка TODO
function renderTodoList() {
  const container = document.getElementById("todo-list-full");
  if (!container) {
    console.warn("Контейнер todo-list-full не найден");
    return;
  }
  
  container.innerHTML = "";

  if (todos.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">Задач пока нет. Добавьте первую!</div>';
    return;
  }

  todos.forEach((todo) => {
    const todoElement = document.createElement("div");
    todoElement.className = "todo-item-full";
    if (todo.IsDone) {
      todoElement.classList.add("completed");
    }

    // Чекбокс
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-checkbox";
    checkbox.checked = todo.IsDone;

    checkbox.addEventListener("change", async () => {
      await updateTodoStatus(todo.Id, checkbox.checked);
      renderTodoList(); // Перерисовываем для применения стилей
    });

    // Текст задачи
    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.Text;

    // Кнопка удаления
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "todo-delete-btn";
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = "Удалить задачу";
    
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Удалить эту задачу?")) {
        await deleteTodo(todo.Id);
      }
    });

    todoElement.appendChild(checkbox);
    todoElement.appendChild(text);
    todoElement.appendChild(deleteBtn);
    container.appendChild(todoElement);
  });

  console.log(`📝 Отрендерено ${todos.length} задач`);
}

// === ОБРАБОТЧИКИ СОБЫТИЙ ===

// Добавление корневой папки
document.getElementById("add-root-folder")?.addEventListener("click", () => {
  const name = document.getElementById("new-folder-input").value.trim();
  if (name) {
    addFolder(null, name);
    document.getElementById("new-folder-input").value = "";
  }
});

// Добавление задачи через кнопку
document.getElementById("todo-add-btn")?.addEventListener("click", async () => {
  const input = document.getElementById("todo-new-input");
  const text = input.value.trim();
  
  if (!text) {
    alert("Введите текст задачи");
    return;
  }
  
  const success = await createTodo(text);
  if (success) {
    input.value = ""; // Очищаем поле
  }
});

// Добавление задачи по Enter
document.getElementById("todo-new-input")?.addEventListener("keypress", async (e) => {
  if (e.key === "Enter") {
    document.getElementById("todo-add-btn").click();
  }
});

// Синхронизация
document.getElementById("sync-todo-btn")?.addEventListener("click", () => {
  syncTodosFromServer();
});

// Очистка выполненных
document.getElementById("clear-completed-btn")?.addEventListener("click", async () => {
  const completedTodos = todos.filter(t => t.IsDone);
  
  if (completedTodos.length === 0) {
    alert("Нет выполненных задач");
    return;
  }
  
  if (!confirm(`Удалить ${completedTodos.length} выполненных задач?`)) {
    return;
  }
  
  // Удаляем каждую выполненную задачу
  for (const todo of completedTodos) {
    await deleteTodo(todo.Id);
  }
});

// === КАЛЕНДАРЬ ===

let currentDisplayDate = new Date();

function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const monthYearLabel = document.getElementById("calendar-month-year");

  if (!grid || !monthYearLabel) return;

  grid.innerHTML = "";
  const year = currentDisplayDate.getFullYear();
  const month = currentDisplayDate.getMonth();

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];
  monthYearLabel.textContent = `${monthNames[month]} ${year}`;

  const weekDays = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
  weekDays.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "calendar-day weekday";
    dayHeader.textContent = day;
    grid.appendChild(dayHeader);
  });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startOffset; i > 0; i--) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day other-month";
    dayDiv.textContent = prevMonthLastDay - i + 1;
    grid.appendChild(dayDiv);
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day";
    dayDiv.textContent = d;

    if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayDiv.classList.add("today");
    }
    grid.appendChild(dayDiv);
  }

  const totalCellsRendered = grid.children.length - weekDays.length;
  const remainingCells = 42 - (totalCellsRendered + weekDays.length);
  for (let i = 1; i <= remainingCells; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day other-month";
    dayDiv.textContent = i;
    grid.appendChild(dayDiv);
  }
}

document.getElementById("prev-month")?.addEventListener("click", () => {
  currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("next-month")?.addEventListener("click", () => {
  currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
  renderCalendar();
});

document.getElementById("today-btn")?.addEventListener("click", () => {
  currentDisplayDate = new Date();
  renderCalendar();
});

// === ИНИЦИАЛИЗАЦИЯ ===

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Инициализация страницы TODO");
  
  // Проверяем авторизацию
  const userId = getUserId();
  if (!userId) {
    alert("Необходимо войти в систему");
    window.location.href = "/login.html";
    return;
  }
  
  // Загружаем данные
  await syncFoldersFromServer();
  await syncTodosFromServer();
  renderSidebarTags();
  renderCalendar();
  
  console.log("✅ Страница TODO готова");
});