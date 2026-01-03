//  Добавить шифрование данных

function register() {
    const username_input = document.getElementById("username");
    const password_input = document.getElementById("password");
    const confirm_password_input = document.getElementById("confirmPassword");
    const checkbox = document.getElementById("agree");
    let xhr = new XMLHttpRequest();
    let url = "http://localhost:3030/register.html";

    if (password_input.value != confirm_password_input.value) {
        // Заменить на более красивое сообщение
        alert("Пароли не совпадают!");
        return;
    }

    if (username_input.value == "" || password_input.value == "" || confirm_password_input.value == "") {
        alert("Убедитесь, что Вы заполнили все поля!");
        return;
    }

    if (username_input.value == password_input.value) {
        alert("Логин и пароль должны различаться!");
        return;
    }

    if (password_input.value.length < 8) {
        alert("Пароль должен содержать не менее 8 символов!");
        return;
    }

    // возможно уберется
    if (!checkbox.checked) {
        alert("Вы должны дать согласие на обработку персонвльных данных!");
        return;
    }

    let data = {
        "Login": username_input.value,
        "Password": password_input.value
    };

    let json = JSON.stringify(data);

    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.send(json)
}