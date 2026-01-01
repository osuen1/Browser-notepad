// Добавить шифрование пароля/логина

// let input = document.querySelector('input'); // получаем элемент input
// if (input.value) {
//     input.backgtoundColor = 'red'; // если в input что-то введено, то меняем цвет фона на красный
// };

function login() {
    let login = document.getElementById("username");
    let password = document.getElementById("password");

    let login_password = {
        "Login": login.value,
        "Password": password.value
    };

    let json = JSON.stringify(login_password);

    let xhr = new XMLHttpRequest();
    let url = "http://localhost:3030/login.html";
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.send(json)

    if (xhr.status == 200) {
        alert(1);
    }
}