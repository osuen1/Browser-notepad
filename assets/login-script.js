async function login() {
    const loginInput = document.getElementById('login').value;
    const passwordInput = document.getElementById('password').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            login: loginInput,
            password: passwordInput
        })
    });

    fetch("/register.html?=example", {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        }
    })
    .then(responce => {
        if (response.ok) {
            if (result.status === "true") {
                // Успешный вход — редирект
                window.location.replace('/'); // или куда нужно
            } else {
                alert('Login failed: ' + result.message);
            }
        } else {
            alert('Server error');
        }
    })
}