// --- Управление профилем пользователя ---

const profileModal = document.getElementById('profile-modal');
const profileBtn = document.getElementById('profile-btn');
const closeProfileModalBtn = document.getElementById('close-profile-modal');
const closeProfileBtn = document.getElementById('close-profile-btn');

// Открыть модальное окно профиля
profileBtn.addEventListener('click', () => {
  openProfileModal();
});

// Закрыть модальное окно профиля
closeProfileModalBtn.addEventListener('click', () => {
  closeProfileModal();
});

closeProfileBtn.addEventListener('click', () => {
  closeProfileModal();
});

// Закрыть при клике на фон
profileModal.addEventListener('click', (e) => {
  if (e.target === profileModal) {
    closeProfileModal();
  }
});

function openProfileModal() {
  profileModal.classList.add('active');
  loadProfileData();
  updateProfileStats();
}

function closeProfileModal() {
  profileModal.classList.remove('active');
}

// --- Загрузка данных профиля ---

function loadProfileData() {
  const username = localStorage.getItem('username') || 'Пользователь';
  const email = localStorage.getItem('email') || '';
  const theme = localStorage.getItem('theme') || 'dark';
  const language = localStorage.getItem('language') || 'ru';

  document.getElementById('profile-username-display').textContent = username;
  document.getElementById('profile-email').value = email;
  document.getElementById('profile-theme').value = theme;
  document.getElementById('profile-language').value = language;
}

// --- Обновление статистики ---

function updateProfileStats() {
  const notesCount = notes ? notes.length : 0;
  const foldersCount = folders ? folders.length : 0;
  const filesCount = userPdfs ? userPdfs.length : 0;

  document.getElementById('notes-count').textContent = notesCount;
  document.getElementById('folders-count').textContent = foldersCount;
  document.getElementById('files-count').textContent = filesCount;
}

// --- Сохранение полей ---

document.querySelectorAll('.save-field-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const field = e.currentTarget.dataset.field;
    const value = document.getElementById(`profile-${field}`).value;

    if (!value) {
      alert('Пожалуйста, заполните поле');
      return;
    }

    const success = await saveProfileField(field, value);
    if (success) {
      showSaveNotification(`${field === 'email' ? 'Email' : 'Пароль'} обновлён`);
    }
  });
});

async function saveProfileField(field, value) {
  const userId = localStorage.getItem('user_id');
  
  try {
    const response = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        User_id: userId,
        Field: field,
        Value: value
      })
    });

    if (response.ok) {
      localStorage.setItem(field, value);
      return true;
    } else {
      alert('Ошибка при обновлении профиля');
      return false;
    }
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка при сохранении');
    return false;
  }
}

// --- Сохранение темы и языка ---

document.getElementById('profile-theme').addEventListener('change', (e) => {
  const theme = e.target.value;
  localStorage.setItem('theme', theme);
  applyTheme(theme);
});

document.getElementById('profile-language').addEventListener('change', (e) => {
  const language = e.target.value;
  localStorage.setItem('language', language);
  // Язык можно применить при перезагрузке или динамически
  alert('Язык изменится при перезагрузке страницы');
});

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.style.colorScheme = 'light';
  } else {
    document.documentElement.style.colorScheme = 'dark';
  }
}

// --- Удаление аккаунта ---

document.getElementById('delete-account-btn').addEventListener('click', async () => {
  const confirmDelete = confirm('Вы уверены? Это удалит весь вашу аккаунт и все данные. Это действие необратимо!');
  
  if (!confirmDelete) return;

  const secondConfirm = prompt('Введите "УДАЛИТЬ" для подтверждения:');
  
  if (secondConfirm !== 'УДАЛИТЬ') {
    alert('Удаление отменено');
    return;
  }

  try {
    const userId = localStorage.getItem('user_id');
    const response = await fetch('/api/profile/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });

    if (response.ok) {
      alert('Аккаунт удалён');
      localStorage.clear();
      window.location.href = '/login';
    } else {
      alert('Ошибка при удалении аккаунта');
    }
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка при удалении аккаунта');
  }
});

// --- Уведомление о сохранении ---

function showSaveNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'save-notification';
  notification.textContent = `✅ ${message}`;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: rgba(78, 205, 196, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    font-size: 13px;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Анимация для уведомлений
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
