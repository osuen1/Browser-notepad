// --- Управление дашбордом на отдельной странице ---

// Загрузка данных из localStorage и API
async function initDashboard() {
  await loadDashboardData();
  updateDashboard();
  // Обновлять каждые 5 секунд
  setInterval(updateDashboard, 5000);
}

async function loadDashboardData() {
  // Загружаем все данные из localStorage сразу
  window.notes = JSON.parse(localStorage.getItem('notes')) || [];
  window.folders = JSON.parse(localStorage.getItem('folders')) || [];
  window.tags = JSON.parse(localStorage.getItem('tags')) || [];
  window.todos = JSON.parse(localStorage.getItem('todos')) || [];

  const userId = parseInt(localStorage.getItem('user_id'));
  
  if (!userId) {
    console.warn("User_id не найден");
    return;
  }

  try {
    // Загружаем заметки с API
    const notesResponse = await fetch('/api/notes/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ User_id: userId })
    });

    if (notesResponse.ok) {
      const notesData = await notesResponse.json();
      // Преобразуем в локальный формат и сохраняем
      window.notes = (notesData || []).map(note => ({
        id: note.ID_note,
        title: note.Title,
        content: note.Data,
        folderId: note.Folder_id,
        isCurrent: false
      }));
      localStorage.setItem('notes', JSON.stringify(window.notes));
    }

    // Загружаем папки с API
    const foldersResponse = await fetch('/api/folders/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ User_id: userId })
    });

    if (foldersResponse.ok) {
      const foldersDataApi = await foldersResponse.json();
      // Преобразуем в локальный формат и сохраняем
      if (foldersDataApi.length > 0 && foldersDataApi[0].FolderId) {
        window.folders = buildFolderTree(foldersDataApi);
      } else {
        window.folders = foldersDataApi || [];
      }
      localStorage.setItem('folders', JSON.stringify(window.folders));
    }

    // Загружаем задачи с API
    const todosResponse = await fetch('/api/todos/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ User_id: userId })
    });

    if (todosResponse.ok) {
      const todosData = await todosResponse.json();
      window.todos = todosData || [];
      localStorage.setItem('todos', JSON.stringify(window.todos));
    }

  } catch (error) {
    console.error('Ошибка при загрузке данных дашборда:', error);
  }
}

// Преобразование плоского списка папок (API формат) в дерево (локальный формат)
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

// Обновить все данные дашборда
function updateDashboard() {
  updateDate();
  updateStats();
  updateTasksProgress();
  updateRecentNotes();
  updatePopularTags();
}

function updateDate() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeStr = now.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const dateEl = document.getElementById('dashboard-date');
  if (dateEl) dateEl.textContent = `${dateStr} • ${timeStr}`;
}

function updateStats() {
  const notesCount = (window.notes || []).length;
  const foldersCount = (window.folders || []).length;
  
  // Для todos нужно распаковать массив TodoData
  let todosCount = 0;
  if (window.todos && window.todos.TodoData) {
    todosCount = window.todos.TodoData.length;
  }
  
  // Теги из localStorage
  const tagsCount = (window.tags || []).length;

  updateElement('stat-notes', notesCount);
  updateElement('stat-folders', foldersCount);
  updateElement('stat-todos', todosCount);
  updateElement('stat-tags', tagsCount);

  // Для профиля
  updateElement('notes-count', notesCount);
  updateElement('folders-count', foldersCount);
  updateElement('files-count', (window.userPdfs || []).length);
}

function updateElement(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateTasksProgress() {
  // Извлекаем массив TodoData
  const todosArray = (window.todos && window.todos.TodoData) ? window.todos.TodoData : [];
  const completed = todosArray.filter(t => t.IsDone).length;
  const total = todosArray.length;
  const percent = total > 0 ? (completed / total * 100) : 0;

  const fillEl = document.getElementById('progress-fill');
  if (fillEl) fillEl.style.width = percent + '%';

  const textEl = document.getElementById('progress-text');
  if (textEl) textEl.textContent = `${completed} из ${total}`;

  // Список первых 5 активных задач
  const tasksList = document.getElementById('tasks-list');
  if (tasksList) {
    const activeTasks = todosArray.filter(t => !t.IsDone).slice(0, 5);
    if (activeTasks.length === 0) {
      tasksList.innerHTML = '<p style="color: #999; text-align: center;">Все задачи выполнены! 🎉</p>';
    } else {
      tasksList.innerHTML = activeTasks.map(task => `
        <div class="task-item">
          <input type="checkbox" class="task-checkbox" data-task-id="${task.Id}" ${task.IsDone ? 'checked' : ''} />
          <span class="task-text">${task.Text || 'Без названия'}</span>
        </div>
      `).join('');

      // Обработчики для чекбоксов
      tasksList.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          const taskId = checkbox.dataset.taskId;
          const task = todosArray.find(t => t.Id === taskId);
          if (task) {
            task.IsDone = checkbox.checked;
            localStorage.setItem('todos', JSON.stringify(window.todos));
            updateTasksProgress();
          }
        });
      });
    }
  }
}

function updateRecentNotes() {
  const recentList = document.getElementById('recent-notes');
  if (!recentList) return;

  const recent = (window.notes || [])
    .sort((a, b) => new Date(b.Date || 0) - new Date(a.Date || 0))
    .slice(0, 5);

  if (recent.length === 0) {
    recentList.innerHTML = '<p style="color: #999; text-align: center;">Нет заметок</p>';
  } else {
    recentList.innerHTML = recent.map(note => `
      <div class="recent-item" data-note-id="${note.ID_note}">
        <div class="recent-title">${note.Title || 'Без названия'}</div>
        <div class="recent-preview">${(note.Data || '').substring(0, 60)}...</div>
        <div class="recent-date">${formatDate(note.Date)}</div>
      </div>
    `).join('');

    // Клики по недавним заметкам - переход на страницу редактирования
    recentList.querySelectorAll('.recent-item').forEach(item => {
      item.addEventListener('click', () => {
        const noteId = item.dataset.noteId;
        localStorage.setItem('selectedNoteId', noteId);
        window.location.href = '/new_note';
      });
    });
  }
}

function updatePopularTags() {
  const tagsCloud = document.getElementById('tags-cloud');
  if (!tagsCloud) return;

  // Собираем все уникальные теги из заметок
  const tagsMap = {};
  (window.notes || []).forEach(note => {
    if (note.Tags && Array.isArray(note.Tags)) {
      note.Tags.forEach(tag => {
        if (tag.Name && tag.Name.trim()) {
          tagsMap[tag.Name] = tag.Colour || '#4ECDC4';
        }
      });
    }
  });

  const uniqueTags = Object.entries(tagsMap).map(([name, colour]) => ({
    name,
    colour
  }));

  // Теги из localStorage (если они есть)
  const localTags = window.tags || [];
  localTags.forEach(tag => {
    if (!tagsMap[tag.name]) {
      uniqueTags.push({
        name: tag.name || tag.Name,
        colour: tag.colour || tag.Colour || '#4ECDC4'
      });
    }
  });

  if (uniqueTags.length === 0) {
    tagsCloud.innerHTML = '<p style="color: #999; text-align: center;">Нет тегов</p>';
  } else {
    tagsCloud.innerHTML = uniqueTags.map(tag => `
      <span class="tag-cloud-item" style="background-color: ${tag.colour}">
        ${tag.name}
      </span>
    `).join('');
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'давно';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'сейчас';
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours}ч назад`;
  if (days < 7) return `${days}д назад`;
  
  return date.toLocaleDateString('ru-RU');
}

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/login';
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('user_id');
  if (!userId) {
    window.location.href = '/login';
    return;
  }

  initDashboard();
});