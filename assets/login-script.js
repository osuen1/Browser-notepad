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

        if (result.status === "true") {
            // Успешный вход — редирект
            window.location.replace('/'); // или куда нужно
        } else {
            alert('Login failed: ' + result.message);
        }
    } else {
        alert('Server error');
    }
}