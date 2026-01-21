document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Темная тема по умолчанию
    if (localStorage.getItem('lending-theme') !== 'light') {
        localStorage.setItem('lending-theme', 'dark');
    } else {
        body.classList.add('light-mode');
    }

    // Переключение темы
    themeBtn?.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        localStorage.setItem('lending-theme', body.classList.contains('light-mode') ? 'light' : 'dark');
    });

    // Intersection Observer для анимаций
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

    // Email копирование с исправлением бага
    document.querySelectorAll('.email-badge').forEach(badge => {
        badge.addEventListener('click', function() {
            const email = this.getAttribute('data-email');
            
            navigator.clipboard.writeText(email).then(() => {
                // Сохраняем оригинальный текст
                const originalText = this.textContent;
                
                // Показываем "Скопировано!"
                this.textContent = 'Скопировано! ✅';
                this.classList.add('copied');
                
                // Возвращаем оригинальный текст через 2 секунды
                setTimeout(() => {
                    this.textContent = originalText;
                    this.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Ошибка копирования:', err);
            });
        });
    });
});
