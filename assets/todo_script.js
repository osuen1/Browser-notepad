document.getElementById("new-note").addEventListener("click", () => {
    window.location.href = "/new_note"
});

const addTodoButton = document.getElementById("todo-add-btn");





document.addEventListener("DOMContentLoaded", () => {
    renderCalendar();
});


// --- Логика динамического календаря ---

let currentDisplayDate = new Date(); // Текущая дата для отображения календаря

// Функция рендеринга календаря
function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const monthYearLabel = document.getElementById("calendar-month-year");

  if (!grid || !monthYearLabel) return; // Если элементы календаря не найдены, выходим

  grid.innerHTML = ""; // Очищаем предыдущее содержимое
  const year = currentDisplayDate.getFullYear();
  const month = currentDisplayDate.getMonth();

  // Установка заголовка (Месяц Год)
  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];
  monthYearLabel.textContent = `${monthNames[month]} ${year}`;

  // Заголовки дней недели
  const weekDays = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
  weekDays.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "calendar-day weekday";
    dayHeader.textContent = day;
    grid.appendChild(dayHeader);
  });

  // Расчет дат для календаря
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // День недели первого дня месяца (0 - воскресенье)
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // Количество дней в месяце

  // Смещение для начала недели с понедельника (в JS 0 - воскресенье, 1 - понедельник, ..., 6 - суббота)
  let startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Отображение дней предыдущего месяца (серым цветом)
  const prevMonthLastDay = new Date(year, month, 0).getDate(); // Последний день предыдущего месяца
  for (let i = startOffset; i > 0; i--) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day other-month";
    dayDiv.textContent = prevMonthLastDay - i + 1;
    grid.appendChild(dayDiv);
  }

  // Отображение дней текущего месяца
  const today = new Date(); // Получаем текущую дату
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day";
    dayDiv.textContent = d;

    // Помечаем сегодняшний день
    if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayDiv.classList.add("today");
    }
    grid.appendChild(dayDiv);
  }

  // Отображение дней следующего месяца (для заполнения сетки)
  // Всего в сетке 42 ячейки (6 недель * 7 дней)
  const totalCellsRendered = grid.children.length - weekDays.length; // Кол-во ячеек, уже добавленных (дни пред. месяца + текущего)
  const remainingCells = 42 - (totalCellsRendered + weekDays.length); // Оставшиеся ячейки для дней следующего месяца
  for (let i = 1; i <= remainingCells; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day other-month";
    dayDiv.textContent = i;
    grid.appendChild(dayDiv);
  }
}

// Слушатели для навигации календаря (предыдущий/следующий месяц, сегодня)
document.getElementById("prev-month")?.addEventListener("click", () => {
  currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1); // Переход на предыдущий месяц
  renderCalendar(); // Перерисовываем календарь
});

document.getElementById("next-month")?.addEventListener("click", () => {
  currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1); // Переход на следующий месяц
  renderCalendar(); // Перерисовываем календарь
});

document.getElementById("today-btn")?.addEventListener("click", () => {
  currentDisplayDate = new Date(); // Устанавливаем текущую дату
  renderCalendar(); // Перерисовываем календарь
});