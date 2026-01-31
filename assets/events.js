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

    eventsSection.querySelectorAll(".event-item").forEach(el => el.remove());

    events.forEach(event => {
        const eventItem = document.createElement("div");
        eventItem.className = "event-item";

        eventItem.innerHTML = `
            <div class="event-time">${event.time}</div>
            <div class="event-text">${event.title}</div>
        `;

        const addButton = eventsSection.querySelector(".add-button");
        eventsSection.insertBefore(eventItem, addButton);
    });
}

// создание события
async function createEvent() {
    const time = prompt("Время события (например 14:00):");
    if (!time) return;

    const title = prompt("Название события:");
    if (!title) return;
    const user_id = getUserId()

    const newEvent = { user_id, time, title };

    try {
        const response = await fetch("/api/events/upload", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newEvent)
        });

        if (!response.ok) {
            throw new Error("Ошибка при создании события");
        }

        // перезагружаем события с сервера
        await loadEvents();

    } catch (error) {
        console.error(error);
        alert("Не удалось создать событие");
    }
}

function getUserId() {
    return localStorage.getItem('user_id')
}