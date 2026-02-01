// === ГЛОБАЛЬНЫЙ ПОИСК ИЗ TOPBAR ===

const globalSearchInput = document.getElementById("global-notes-search");

if (globalSearchInput) {
  globalSearchInput.addEventListener("input", () => {
    const query = globalSearchInput.value.trim().toLowerCase();

    if (!query) {
      renderFolders(); // вернуть обычный вид
      return;
    }

    renderSearchResultsInSidebar(query);
  });
}

function renderSearchResultsInSidebar(query) {
  const folderList = document.getElementById("folder-list");
  folderList.innerHTML = "";

  const matchedNotes = notes.filter(n =>
    n.title.toLowerCase().includes(query) ||
    n.content.toLowerCase().includes(query)
  );

  if (matchedNotes.length === 0) {
    folderList.innerHTML = `
      <li style="opacity:0.6; padding:10px;">
        Ничего не найдено
      </li>
    `;
    return;
  }

  matchedNotes.forEach(note => {
    const li = document.createElement("li");
    li.className = "note-item";
    li.dataset.id = note.id;

    li.innerHTML = `
      <div class="folder-item">
        <i class="far fa-file-alt note-icon"></i>
        <span class="note-title">${note.title}</span>
      </div>
    `;

    li.addEventListener("click", () => {
      notes.forEach(n => (n.isCurrent = false));
      note.isCurrent = true;

      document.getElementById("notes-content").value = note.content;
      document.getElementById("current-note-title").textContent = note.title;

      renderFolders();
      renderSelectedTags();
    });

    folderList.appendChild(li);
  });
}