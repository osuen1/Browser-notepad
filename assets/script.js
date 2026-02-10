var button = document.getElementById("save");
var result = document.querySelector('.result');

function toggleMenu() { // функция, открывающая боковое меню
    const dropdown = document.querySelector('.dropdown');
    dropdown.classList.toggle('show');

    document.addEventListener('mouseup', function (e) {
        const container = document.querySelector('.dropdown');

        if (container.classList.contains("show") && !container.contains(e.target)) {
            container.classList.toggle('show');
        }
    });
}

function saveStatement() {
    let date = new Date();
    let currentDate = date.toISOString(); // информация для первого поля в json (дата внесения изменения в список)
    var info = document.getElementById("notepad"); // текст, написанный пользователем блокнота

    let point = { // создаем объект для отправки на сервер в формате JSON
        "Date": currentDate,
        "Info": info.value
    };

    let json = JSON.stringify(point); // переводим данные из объекта (point) в формат JSON

    let xhr = new XMLHttpRequest(); // создаем http ответ серверу
    let url = "http://localhost:3030/"; // ссылка, куда будет отправляться ответ
    xhr.open("POST", url, true); // открываем соединение для отправки ответа
    xhr.setRequestHeader("Content-Type", "application/json"); // объявляем тип отправляемого файла

    xhr.send(json); // отправляем данные на сервер

    if (!info.classList.contains('send')) { // обработчик условия, выделяющего элемент textarea зеленым
        info.classList.toggle('send');
        setTimeout(function(){info.classList.toggle('send')}, 3000);
    }

    info.value = ""; // автоматически отчищаем поле для ввода
}