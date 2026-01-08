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