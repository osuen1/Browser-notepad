const togglePassword = document.querySelector('#toggle-password');
const passwordInput = document.querySelector('#password-input');

togglePassword.addEventListener('click', function () {
    // Переключаем тип атрибута
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Переключаем иконку (с глаза на перечеркнутый глаз)
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

async function login() {
    const loginInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;

    const response = await fetch('/login.html', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            Login: loginInput,
            Password: passwordInput
        })
    });

    if (response.ok) {
        const result = await response.json();

        if (result.status) {
            console.log("Что прислали с сервера:", result)
            localStorage.setItem("user_id", result.user_id)
            
            // Успешный вход — редирект
            window.location.replace('/new_note');
        } else {
            alert('Login failed: ' + result.message);
        }
    } else {
        alert('Server error');
    }
}