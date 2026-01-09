// Логика для страницы восстановления пароля
function sendResetLink() {
  const emailField = document.getElementById('email');
  const email = emailField.value.trim();

  if (!email) {
    alert('Пожалуйста, введите вашу электронную почту.');
    return;
  }

  // Простая валидация email с использованием регулярного выражения
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('Пожалуйста, введите действительный адрес электронной почты.');
    return;
  }

  // Имитация отправки ссылки для восстановления пароля
  console.log(`Отправка ссылки для восстановления на: ${email}`);
  alert(`Ссылка для сброса пароля отправлена на адрес ${email}. Пожалуйста, проверьте свою почту.`);
  
  data = {
    "Email": emailField.value,
  }
  
  let json = JSON.stringify(data);
  let xhr = new XMLHttpRequest(); // создаем http ответ серверу
  let url = "http://localhost:3030/forgotpassword"; // ссылка, куда будет отправляться ответ
  xhr.open("POST", url, true); // открываем соединение для отправки ответа
  xhr.setRequestHeader("Content-Type", "application/json"); // объявляем тип отправляемого файла

  xhr.send(json); // отправляем данные на сервер
}