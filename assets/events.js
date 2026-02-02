const PRIORITIES = {
    imp: { order: 1, label: "Высший" },
    urg: { order: 2, label: "Срочный" },
    ave: { order: 3, label: "Средний" },
    low: { order: 4, label: "Низкий" }
};

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

    const addEventBtn = document.querySelector(".events-section .add-button");
    addEventBtn.addEventListener("click", createEvent);
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
            <div class="event-time">${event.time}</div>
            <div class="event-content">
                <div class="event-title">${event.title}</div>
                <div class="event-priority">${p.label}</div>
            </div>
        `;

        eventsSection.insertBefore(eventItem, addButton);
    });
}

// создание события
async function createEvent() {
    const time = prompt("Время события (например 14:00):");
    if (!time) return;

    const title = prompt("Название события:");
    if (!title) return;

    let priority = prompt("Приоритет (высокий / срочный / средний / низкий):");
    if (!priority) priority = "низкий";

    const date = new Date().toISOString();
    const user_id = getUserId();

    const newEvent = {
        user_id,
        time,
        title,
        priority,
        date
    };

    try {
        const response = await fetch("/api/events/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newEvent)
        });

        if (!response.ok) {
            throw new Error("Ошибка при создании события");
        }

        await loadEvents();
    } catch (error) {
        console.error(error);
        alert("Не удалось создать событие");
    }
}

function getUserId() {
    return localStorage.getItem('user_id')
}