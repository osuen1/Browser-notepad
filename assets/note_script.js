async function getJson() {
    fetch('/save-notes.html?param=example', {
        method: 'GET',
        headers: {
            'Accept': 'application/json', // Ожидаем JSON в ответе
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const ul = document.getElementById('notes');

        data.forEach(function(item) { // обрабатываем массив, приходящий с сервера и выводим его на экран в список
            const li = document.createElement('li');
            const checkbox = document.createElement('input');
            
            checkbox.type = 'checkbox';
            checkbox.id = 'check';

            li.textContent = item;
            li.prepend(checkbox);

            ul.appendChild(li);
        });
    })
    .catch(error => {
        console.error('There has been a problem with your fetch operation:', error);
    });
}