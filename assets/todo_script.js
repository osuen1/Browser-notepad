document.getElementById("new-note").addEventListener("click", () => {
    window.location.href = "/new_note"
});

let todos = JSON.parse(localStorage.getItem("todos")) || [];

// Функция загрузки todos с сервера
async function syncTodosFromServer() {
  const userId = getUserId();
  if (!userId) {
    console.warn("User_id не найден.");
    return;
  }

  try {
    const response = await fetch("/api/todos/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ User_id: userId }), // ИСПРАВЛЕНО: user_id вместо User_id
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);

    const data = await response.json();
    console.log("Полученные с сервера todos:", data);

    // ИСПРАВЛЕНО: правильная обработка ответа
    if (data && Array.isArray(data)) {
      todos = data.map(todo => ({
        Id: todo.Id,
        Text: todo.Text,
        IsDone: todo.IsDone
      }));
    } else if (data && Array.isArray(data.TodoData)) {
      todos = data.TodoData;
    } else {
      todos = [];
    }

    localStorage.setItem("todos", JSON.stringify(todos));
    renderTodo();
    console.log("✅ Todos синхронизированы с сервера");
  } catch (error) {
    console.error("❌ Ошибка синхронизации todos:", error);
  }
}

// Функция отправки новой задачи на сервер
async function addTodo() {
  const task = prompt("Введите задачу");
  if (!task?.trim()) return;

  const userId = getUserId();
  if (!userId) {
    alert("Пожалуйста, войдите в систему");
    return;
  }

  const payload = {
    User_id: userId,
    Text: task.trim(),
    IsDone: false
  };

  console.log("Отправка todo:", payload);

  try {
    const response = await fetch("/api/todo/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ошибка сервера:", errorText);
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    const savedTodo = await response.json();
    console.log("Сохраненная задача:", savedTodo);
    
    todos.push(savedTodo);
    localStorage.setItem("todos", JSON.stringify(todos));
    renderTodo();
    
    console.log("✅ Задача добавлена!");
  } catch (error) {
    console.error("❌ Ошибка при добавлении задачи:", error);
    alert(`Не удалось добавить задачу: ${error.message}`);
  }
}

// Функция удаления задачи с сервера
async function deleteTodo(todos) {
  const userId = todos.User_id;
  const todoIds = todos.map(todo => todo.Id);

  try {
    const response = await fetch("/api/todo/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ User_id: userId, Id: todoIds }),
    });

    if (!response.ok) throw new Error("Ошибка при удалении на сервере");
    
    // Удаляем локально
    todos = todos.filter(t => t.Id !== todoId);
    localStorage.setItem("todos", JSON.stringify(todos));
    renderTodo();
    
    console.log("✅ Задача удалена с сервера");
    return true;
  } catch (error) {
    console.error("❌ Ошибка удаления задачи:", error);
    return false;
  }
}

// Функция обновления статуса задачи
async function updateTodoStatus(todoId, isDone) {
  const userId = getUserId();
  if (!userId) return false;

  const payload = {
    user_id: userId,
    Id: todoId,
    IsDone: isDone
  };

  try {
    const response = await fetch("/api/todo/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Ошибка при обновлении");
    
    console.log("✅ Статус задачи обновлен");
    return true;
  } catch (error) {
    console.error("❌ Ошибка обновления задачи:", error);
    return false;
  }
}

// Функция отправки выполненных задач на сервер
async function sendCompletedTodos() {
  const userId = getUserId();
  if (!userId) {
    console.warn("User_id не найден");
    return;
  }

  // 1. выбираем выполненные заметки
  const completedTodos = todos.filter(todo => todo.IsDone);

  if (completedTodos.length === 0) {
    console.log("Нет выполненных задач для отправки");
    return;
  }

  const payload = {
    User_id: userId,
    Todos: completedTodos
  };

  deleteTodo(payload);
}


// ИСПРАВЛЕННАЯ функция рендеринга TODO
function renderTodo() {
  const container = document.getElementById("todo-list-full"); 
  if (!container) {
    console.warn("Контейнер todo-list-full не найден");
    return;
  }
  
  container.innerHTML = "";

  // ИСПРАВЛЕНО: forEach вместо .for
  todos.forEach((todo) => {
    const todoElement = document.createElement("div");
    todoElement.className = "todo-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-checkbox";
    checkbox.checked = todo.IsDone;

    checkbox.addEventListener("change", async () => {
      todo.IsDone = checkbox.checked;
      await updateTodoStatus(todo.Id, todo.IsDone);
      localStorage.setItem("todos", JSON.stringify(todos));
    });

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.Text;
    if (todo.IsDone) {
      text.style.textDecoration = "line-through";
      text.style.opacity = "0.6";
    }

    // Кнопка удаления
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "todo-delete-btn";
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Удалить задачу?")) {
        await deleteTodo(todo.Id);
      }
    });

    todoElement.appendChild(checkbox);
    todoElement.appendChild(text);
    todoElement.appendChild(deleteBtn);
    container.appendChild(todoElement);
  });

  console.log(`Отрендерено ${todos.length} задач`);
}

function getUserId() {
  const userId = parseInt(localStorage.getItem("user_id"));
  return userId;
}

document.addEventListener("DOMContentLoaded", () => {
  syncTodosFromServer();
  renderTodo();
});

document.getElementById("todo-add-btn").addEventListener("click", addTodo);

document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.clear();
    window.location.replace("/login");
});

document.getElementById("clear-completed-btn").addEventListener("click", () => {
  const completedTodos = todos.filter(todo => todo.IsDone);
  if (completedTodos.length > 0 && confirm("Удалить завершенные задачи?")) {
    deleteTodo(completedTodos);
  }
});