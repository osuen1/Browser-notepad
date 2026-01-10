function register() {
  const username_input = document.getElementById("username");
  const password_input = document.getElementById("password");
  const confirm_password_input = document.getElementById("confirmPassword");
  const checkbox = document.getElementById("agree");
  const email = document.getElementById("email");
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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) {
    alert("Пожалуйста, введите корректный адрес электронной почты!");
    return;
  }

  let data = {
    "Email": email.value,
    "Login": username_input.value,
    "Password": password_input.value
  };

  let json = JSON.stringify(data);

  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-Type", "application/json");

  // xhr.send(json);
  // window.location.href = "/login.html";
  
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status >= 200 && xhr.status < 300) { // HTTP success status codes
        try {
          const response = JSON.parse(xhr.responseText);
          // Assuming the server returns a JSON object that indicates success.
          // For example: { "status": "success", "message": "User registered successfully" }
          if (response && response.status == true) { // Adapt 'response.status' to your server's actual success indicator
            alert("Регистрация успешна: " + (response.message || ""));
            window.location.href = "/login.html";
          } else if (response && response.message) {
            // Server returned 2xx but indicated an application-level error (e.g., duplicate email)
            alert("Ошибка регистрации: " + response.message);
          } else {
            // General success, but no specific 'status' or 'message' field found.
            alert("Регистрация успешна!");
            window.location.href = "/login.html";
          }
        } catch (e) {
          console.error("Failed to parse JSON response on successful registration:", e);
          alert("Регистрация завершена, но произошла ошибка при обработке ответа сервера.");
          // If registration was theoretically successful but JSON parse failed, it might be safer to still redirect.
          window.location.href = "/login.html";
        }
      } else {
        // Server returned an error status (e.g., 4xx, 5xx)
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          alert(errorResponse.message || "Ошибка регистрации. Код статуса: " + xhr.status + " " + xhr.statusText);
        } catch (e) {
          console.error("Failed to parse JSON error response or non-JSON error:", e);
          alert("Ошибка регистрации. Пожалуйста, попробуйте снова. Код статуса: " + xhr.status + " " + xhr.statusText);
        }
      }
    }
  };
  
  xhr.onerror = function() {
    alert("Ошибка сети или сервера. Пожалуйста, проверьте подключение и попробуйте еще раз.");
  };
  
  xhr.send(json); 
  

  document.addEventListener('DOMContentLoaded', function () {
    const icons = document.querySelectorAll('.toggle-password');
    
    icons.forEach(icon => {
      icon.addEventListener('click', function () {
        // Находим инпут по ID из атрибута data-target
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);
            
        if (input.type === 'password') {
          input.type = 'text';
          this.classList.remove('fa-eye');
          this.classList.add('fa-eye-slash');
        } else {
          input.type = 'password';
          this.classList.remove('fa-eye-slash');
          this.classList.add('fa-eye');
        }
      });
    });
  });
}

