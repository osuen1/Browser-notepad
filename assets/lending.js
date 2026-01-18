document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;

    if (localStorage.getItem('lending-theme') === 'dark') {
        body.classList.add('dark-mode');
    }

    themeBtn?.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        localStorage.setItem('lending-theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

    document.querySelectorAll('.email-badge').forEach(badge => {
        badge.addEventListener('click', function() {
            const email = this.innerText;
            navigator.clipboard.writeText(email).then(() => {
                const original = this.innerHTML;
                this.innerText = 'Скопировано! ✅';
                setTimeout(() => { this.innerHTML = original; }, 2000);
            });
        });
    });
});