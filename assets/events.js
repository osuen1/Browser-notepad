const PRIORITIES = {
    imp: { order: 1, label: "Высший" },
    urg: { order: 2, label: "Срочный" },
    ave: { order: 3, label: "Средний" },
    low: { order: 4, label: "Низкий" }
};

const modal = document.getElementById("event-modal");
const datetimeInput = document.getElementById("event-datetime");
const titleInput = document.getElementById("event-title");
const priorityInput = document.getElementById("event-priority");

function normalizePriority(priority) {
    if (!priority) return { key: "low", label: "Низкий" };

    const map = {
        "высокий": { key: "imp", label: "Высший" },
        "срочный": { key: "urg", label: "Срочный" },
        "средний": { key: "ave", label: "Средний" },
        "низкий": { key: "low", label: "Низкий" }
    };

    return map[priority.toLowerCase()] || { key: "low", label: priority };
}

document.addEventListener("DOMContentLoaded", () => {
    loadEvents();
});

// загрузка событий
async function loadEvents() {
    try {
        const req = {
            "user_id": getUserId()
        }
        const response = await fetch("/api/events/get", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(req)
        });
        const events = await response.json();
        renderEvents(events);
    } catch (error) {
        console.error("Ошибка загрузки событий:", error);
    }
}

function formatEventDate(isoString) {
    const date = new Date(isoString);

    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


// рендер
function renderEvents(events) {
    const eventsSection = document.querySelector(".events-section");
    const addButton = eventsSection.querySelector(".add-button");

    eventsSection.querySelectorAll(".event-item").forEach(el => el.remove());

    // сортируем по приоритету
    events.sort((a, b) => {
        const pa = PRIORITIES[a.priority]?.order ?? 999;
        const pb = PRIORITIES[b.priority]?.order ?? 999;
        return pa - pb;
    });

    events.forEach(event => {
        const p = PRIORITIES[event.priority] || {
            order: 999,
            label: event.priority
        };

        const eventItem = document.createElement("div");
        eventItem.className = `event-item priority-${event.priority}`;

        eventItem.innerHTML = `
            <div class="event-time">${formatEventDate(event.eventdate)}</div>
            <div class="event-content">
                <div class="event-title">${event.title}</div>
                <div class="event-priority">${p.label}</div>
            </div>
        `;

        eventsSection.insertBefore(eventItem, addButton);
    });
}

document.querySelector(".events-section .add-button")
  .addEventListener("click", openEventModal);

document.getElementById("event-cancel")
  .addEventListener("click", closeEventModal);

document.getElementById("event-save")
  .addEventListener("click", saveEventFromModal);

function openEventModal() {
  modal.classList.remove("hidden");

  // по умолчанию — сейчас + 10 минут
  const now = new Date();
  now.setMinutes(now.getMinutes() + 10);
  datetimeInput.value = now.toISOString().slice(0, 16);
}

function closeEventModal() {
  modal.classList.add("hidden");
  titleInput.value = "";
}

async function saveEventFromModal() {
  if (!datetimeInput.value || !titleInput.value) {
    alert("Заполните дату и название");
    return;
  }

  const eventdate = new Date(datetimeInput.value).toISOString();
  const title = titleInput.value;
  const priority = priorityInput.value;

  const payload = {
    user_id: getUserId(),
    eventdate,
    title,
    priority,
    date: new Date().toISOString()
  };

  try {
    const response = await fetch("/api/events/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Ошибка сервера");

    closeEventModal();
    loadEvents();
  } catch (e) {
    console.error(e);
    alert("Не удалось сохранить событие");
  }
}


function getUserId() {
    return localStorage.getItem('user_id')
}