// --- Управление папками ---
let folders = JSON.parse(localStorage.getItem('folders')) || [
    { id: '1', name: 'Работа', children: [
        { id: '2', name: 'Проекты', children: [] },
        { id: '3', name: 'Отчеты', children: [] }
    ]},
    { id: '4', name: 'Личное', children: [] }
];

// Заметки
let notes = JSON.parse(localStorage.getItem('notes')) || [];

// Генерация ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Рендер папок
function renderFolders(foldersList = folders, container = document.getElementById('folder-list')) {
    container.innerHTML = '';
    
    foldersList.forEach(folder => {
        const noteCount = countNotesInFolder(folder.id);
        const folderElement = document.createElement('li');
        folderElement.className = 'folder-wrapper'; // Используем обертку для структуры
        
        folderElement.innerHTML = `
            <div class="folder-item" data-id="${folder.id}">
                <i class="fas fa-chevron-right toggle-icon"></i>
                <i class="fas fa-folder folder-icon"></i>
                <span class="folder-name">${folder.name}</span>
                <span class="item-count">${noteCount}</span>
                <div class="folder-actions">
                    <button class="folder-action-btn create-note" data-folder-id="${folder.id}" title="Создать заметку"><i class="fas fa-pencil-alt"></i></button>
                    <button class="folder-action-btn add-subfolder" data-parent-id="${folder.id}" title="Добавить подпапку"><i class="fas fa-plus"></i></button>
                </div>
            </div>
            <div class="folder-content" id="content-${folder.id}">
                <ul class="subfolders-list"></ul>
                <ul class="note-list"></ul>
            </div>
        `;
        
        container.appendChild(folderElement);

        const contentDiv = folderElement.querySelector('.folder-content');
        const subfolderContainer = folderElement.querySelector('.subfolders-list');
        const noteContainer = folderElement.querySelector('.note-list');

        // Рендер вложенных элементов
        if (folder.children.length > 0) {
            renderFolders(folder.children, subfolderContainer);
        }
        renderNotes(folder.id, noteContainer);

        // Логика раскрытия
        const folderHeader = folderElement.querySelector('.folder-item');
        folderHeader.addEventListener('click', (e) => {
            // Если кликнули не по кнопкам действий
            if (!e.target.closest('.folder-actions')) {
                const isOpen = contentDiv.classList.toggle('open');
                folderHeader.classList.toggle('active', isOpen);
                folderElement.querySelector('.toggle-icon').style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
                
                // Меняем иконку папки
                const icon = folderElement.querySelector('.folder-icon');
                icon.className = isOpen ? 'fas fa-folder-open folder-icon' : 'fas fa-folder folder-icon';
            }
        });

        // Обработчики для кнопок (создание заметки / подпапки)
        folderElement.querySelector('.create-note').addEventListener('click', (e) => {
            e.stopPropagation();
            createNoteInFolder(folder.id);
        });

        folderElement.querySelector('.add-subfolder').addEventListener('click', (e) => {
            e.stopPropagation();
            const subName = prompt('Название подпапки:');
            if (subName) {
                addFolder(folder.id, subName);
            }
        });
    });
}

// Рендер заметок в папке (основной список)
function renderNotes(folderId, container) {
    container.innerHTML = '';
    const folderNotes = notes.filter(note => note.folderId === folderId);
    
    folderNotes.forEach(note => {
        const noteElement = document.createElement('li');
        noteElement.className = 'note-item';
        noteElement.innerHTML = `
            <i class="far fa-file-alt note-icon"></i>
            <span class="note-title">${note.title}</span>
            <div class="note-actions">
                <button class="note-action-btn edit-note" data-id="${note.id}"><i class="fas fa-edit"></i></button>
                <button class="note-action-btn delete-note" data-id="${note.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        container.appendChild(noteElement);

        // Обработчик клика по заметке
        noteElement.addEventListener('click', () => {
            document.querySelectorAll('.note-item').forEach(n => n.classList.remove('active'));
            noteElement.classList.add('active');
            document.getElementById('notes-content').value = note.content;
            document.getElementById('current-note-title').textContent = note.title;
        });

        // Редактирование заметки
        noteElement.querySelector('.edit-note').addEventListener('click', (e) => {
            e.stopPropagation();
            const newTitle = prompt('Новое название заметки:', note.title);
            if (newTitle) {
                note.title = newTitle;
                noteElement.querySelector('.note-title').textContent = newTitle;
                saveNotes();
            }
        });

        // Удаление заметки
        noteElement.querySelector('.delete-note').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Удалить заметку "${note.title}"?`)) {
                notes = notes.filter(n => n.id !== note.id);
                saveNotes();
                renderNotes(folderId, container);
            }
        });
    });
}

// Создание заметки в папке
function createNoteInFolder(folderId) {
    const title = prompt('Название заметки:');
    if (!title) return;

    const newNote = {
        id: generateId(),
        title: title,
        content: '',
        folderId: folderId,
        createdAt: new Date().toISOString(),
        isCurrent: true
    };

    // Сброс текущей заметки
    notes.forEach(note => note.isCurrent = false);

    notes.unshift(newNote);
    saveNotes();

    // Обновляем UI
    document.getElementById('notes-content').value = '';
    document.getElementById('current-note-title').textContent = newNote.title;

    // Перезагружаем папки
    renderFolders();
}

// Подсчет заметок в папке
function countNotesInFolder(folderId) {
    return notes.filter(note => note.folderId === folderId).length;
}

// Поиск папки по ID
function findFolder(id, list = folders) {
    for (const item of list) {
        if (item.id === id) return item;
        const found = findFolder(id, item.children);
        if (found) return found;
    }
    return null;
}

// Добавление папки
function addFolder(parentId, name) {
    const newFolder = { id: generateId(), name, children: [] };
    
    if (!parentId) {
        folders.push(newFolder);
    } else {
        const parent = findFolder(parentId);
        if (parent) parent.children.push(newFolder);
    }
    
    saveFolders();
    renderFolders();
}

// Удаление папки
function deleteFolder(id) {
    folders = folders.filter(f => f.id !== id);
    folders.forEach(f => f.children = f.children.filter(c => c.id !== id));
    // Удаляем также заметки в этой папке
    notes = notes.filter(note => note.folderId !== id);
    saveNotes();
    saveFolders();
    renderFolders();
}

// Сохранение в localStorage
function saveFolders() {
    localStorage.setItem('folders', JSON.stringify(folders));
}

// --- Управление заметками ---

// Загрузка всех заметок
function loadNotes() {
    const noteContent = document.getElementById('notes-content').value;
    const currentTitle = document.getElementById('current-note-title').textContent;

    // Здесь можно улучшить: хранить активную заметку и обновлять её
    // Пока просто обновляем текущую заметку
    const activeNote = notes.find(n => n.isCurrent);
    if (activeNote) {
        activeNote.content = noteContent;
        saveNotes();
    }
}

// Сохранение заметок
function saveNotes() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

// Создание новой заметки (из модального окна)
function createNewNote(title, folderId) {
    const newNote = {
        id: generateId(),
        title: title || 'Новая заметка',
        content: '',
        folderId: folderId || null,
        createdAt: new Date().toISOString(),
        isCurrent: true
    };

    // Сброс текущей заметки
    notes.forEach(note => note.isCurrent = false);

    notes.unshift(newNote);
    saveNotes();

    // Обновляем UI
    document.getElementById('notes-content').value = '';
    document.getElementById('current-note-title').textContent = newNote.title;

    // Перезагружаем папки, чтобы обновить счетчики и список заметок
    renderFolders();
}

// --- Обработчики событий ---

// Кнопка создания заметки
document.getElementById('create-note-btn').addEventListener('click', () => {
    document.getElementById('note-modal').style.display = 'flex';
    populateFolderSelect(document.getElementById('folder-select'));
    document.getElementById('note-title-input').focus();
});

// Кнопка сохранения заметки
document.getElementById('save-note-btn').addEventListener('click', () => {
    const title = document.getElementById('note-title-input').value.trim();
    const folderId = document.getElementById('folder-select').value;

    if (!title) {
        alert('Введите название заметки!');
        return;
    }

    createNewNote(title, folderId);
    document.getElementById('note-modal').style.display = 'none';
    document.getElementById('note-title-input').value = '';
});

// Кнопка отмены
document.getElementById('cancel-note-btn').addEventListener('click', () => {
    document.getElementById('note-modal').style.display = 'none';
});

// Закрытие модального окна при клике вне его
document.getElementById('note-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('note-modal')) {
        document.getElementById('note-modal').style.display = 'none';
    }
});

// Кнопка добавления корневой папки
document.getElementById('add-root-folder').addEventListener('click', () => {
    const name = document.getElementById('new-folder-input').value.trim();
    if (!name) {
        alert('Введите название папки!');
        return;
    }
    addFolder(null, name);
    document.getElementById('new-folder-input').value = '';
});

// Загрузка списка папок в модальное окно
function populateFolderSelect(selectElement, foldersList = folders, level = 0) {
    selectElement.innerHTML = '<option value="">В корне</option>';
    
    function buildOption(folder, prefix = '') {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = `${prefix}${folder.name}`;
        selectElement.appendChild(option);

        if (folder.children.length > 0) {
            folder.children.forEach(child => buildOption(child, prefix + '— '));
        }
    }

    foldersList.forEach(folder => buildOption(folder));
}

// Автосохранение заметки
document.getElementById('notes-content').addEventListener('input', loadNotes);

// Инициализация
renderFolders();

// Восстановление последней заметки
const lastNote = notes[0];
if (lastNote) {
    document.getElementById('notes-content').value = lastNote.content || '';
    document.getElementById('current-note-title').textContent = lastNote.title || 'Новая заметка';
}