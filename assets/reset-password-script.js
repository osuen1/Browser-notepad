document.addEventListener('DOMContentLoaded', () => {
        // Инициализация переключателя видимости пароля для новых полей
        const togglePasswordIcons = document.querySelectorAll('.toggle-password');
        togglePasswordIcons.forEach(icon => {
            icon.addEventListener('click', () => {
                const targetId = icon.dataset.target;
                const passwordField = document.getElementById(targetId);
                if (passwordField.type === 'password') {
                    passwordField.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordField.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    });

    async function resetPassword() {
        const email = document.getElementById('resetEmail').value.trim();
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        const resetMessage = document.getElementById('resetMessage');

        resetMessage.textContent = ''; // Очистить предыдущие сообщения
        resetMessage.style.color = ''; // Сбросить цвет

        if (!email || !newPassword || !confirmNewPassword) {
            resetMessage.style.color = 'red';
            resetMessage.textContent = 'Пожалуйста, заполните все поля.';
            return;
        }

        // Простая валидация email
        if (!/\S+@\S+\.\S+/.test(email)) {
            resetMessage.style.color = 'red';
            resetMessage.textContent = 'Пожалуйста, введите корректный адрес электронной почты.';
            return;
        }

        if (newPassword.length < 8) { // Пример политики паролей
            resetMessage.style.color = 'red';
            resetMessage.textContent = 'Пароль должен содержать не менее 8 символов.';
            return;
        }

        if (newPassword !== confirmNewPassword) {
            resetMessage.style.color = 'red';
            resetMessage.textContent = 'Пароли не совпадают.';
            return;
        }

        try {
            // Предполагается, что на сервере есть эндпоинт для сброса пароля
            // В реальном приложении сюда может передаваться токен сброса,
            // который пользователь получил по почте (например, через URL параметры).
            const response = await fetch('/api/reset-password', { // Замените на ваш реальный эндпоинт
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ "Email": email, "NewPassword": newPassword })
            });

            const data = await response.json();

            if (response.ok) { // Status codes 200-299
                resetMessage.style.color = 'green';
                resetMessage.textContent = data.message || 'Пароль успешно сброшен!';
                // Очистить поля после успешного сброса
                document.getElementById('resetEmail').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmNewPassword').value = '';
                // Сбросить тип поля пароля на 'password' и иконки на 'fa-eye'
                document.getElementById('newPassword').type = 'password';
                document.getElementById('confirmNewPassword').type = 'password';
                document.querySelectorAll('.toggle-password').forEach(icon => {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                });

            } else {
                // Обработка ошибок от сервера (например, пользователя не найдено, токен недействителен)
                resetMessage.style.color = 'red';
                resetMessage.textContent = data.message || 'Ошибка при сбросе пароля. Пожалуйста, попробуйте еще раз.';
            }
        } catch (error) {
            console.error('Ошибка сети или сервера:', error);
            resetMessage.style.color = 'red';
            resetMessage.textContent = 'Произошла ошибка при подключении к серверу. Пожалуйста, попробуйте позже.';
        }
    }