// --- Инициализация: загрузка профиля ДО остальных скриптов ---

async function initializeApp() {
  const userId = localStorage.getItem('user_id');
  
  if (!userId) {
    console.warn("User_id не найден");
    return;
  }

  try {
    const response = await fetch('/api/profile/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ User_id: userId })
    });

    if (!response.ok) {
      console.warn(`⚠️ Ошибка получения настроек профиля (${response.status})`);
      return;
    }

    const settings = await response.json();
    console.log("✅ Настройки профиля получены при инициализации:", settings);
    
    // Обновляем localStorage
    if (settings.Username) localStorage.setItem('username', settings.Username);
    if (settings.Email) localStorage.setItem('email', settings.Email);
    if (settings.Theme) localStorage.setItem('theme', settings.Theme);
    if (settings.Language) localStorage.setItem('language', settings.Language);

  } catch (error) {
    console.error("❌ Ошибка при инициализации профиля:", error);
  }
}

// Запуск инициализации
initializeApp();
