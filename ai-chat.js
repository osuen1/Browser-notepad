// AI Chat functionality

function initAIChat() {
    const aiChatLink = document.getElementById('ai-chat-link');
    const aiChatModal = document.getElementById('ai-chat-modal');
    const closeAiChat = document.getElementById('close-ai-chat');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const chatInput = document.getElementById('chat-input');
    const selectNotesBtn = document.getElementById('select-notes-btn');
    
    // Notes selection modal elements
    const notesSelectionModal = document.getElementById('notes-selection-modal');
    const closeNotesSelection = document.getElementById('close-notes-selection');
    const notesSearch = document.getElementById('notes-search');
    const selectAllBtn = document.getElementById('select-all-btn');
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    const summarizeSelectedBtn = document.getElementById('summarize-selected-btn');

    // Selected notes array
    let selectedNotes = [];

    // Open chat modal
    aiChatLink?.addEventListener('click', () => {
        aiChatModal.style.display = 'flex';
        chatInput.focus();
    });

    // Close chat modal
    closeAiChat?.addEventListener('click', () => {
        aiChatModal.style.display = 'none';
    });

    // Close on outside click
    aiChatModal?.addEventListener('click', (e) => {
        if (e.target === aiChatModal) {
            aiChatModal.style.display = 'none';
        }
    });

    // Send message
    sendChatBtn?.addEventListener('click', sendMessage);

    // Send on Enter (Shift+Enter for new line)
    chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Open notes selection modal
    selectNotesBtn?.addEventListener('click', openNotesSelection);

    // Close notes selection modal
    closeNotesSelection?.addEventListener('click', () => {
        notesSelectionModal.style.display = 'none';
    });

    notesSelectionModal?.addEventListener('click', (e) => {
        if (e.target === notesSelectionModal) {
            notesSelectionModal.style.display = 'none';
        }
    });

    // Search functionality
    notesSearch?.addEventListener('input', filterNotes);

    // Select all button
    selectAllBtn?.addEventListener('click', selectAllNotes);

    // Clear selection button
    clearSelectionBtn?.addEventListener('click', clearSelection);

    // Summarize selected button
    summarizeSelectedBtn?.addEventListener('click', summarizeSelectedNotes);
}

// Get user ID from localStorage
function getUserId() {
    return localStorage.getItem('user_id');
}

// Get current note ID (the one marked as isCurrent)
function getCurrentNoteId() {
    const notes = JSON.parse(localStorage.getItem('notes')) || [];
    const currentNote = notes.find(note => note.isCurrent);
    return currentNote ? currentNote.id : null;
}

// Open notes selection modal
function openNotesSelection() {
    const notesSelectionModal = document.getElementById('notes-selection-modal');
    const userId = getUserId();
    
    if (!userId) {
        alert('Пожалуйста, войдите в систему');
        return;
    }
    
    loadNotesList();
    notesSelectionModal.style.display = 'flex';
}

// Load and display notes list
function loadNotesList() {
    const notesContainer = document.getElementById('notes-list-container');
    const notes = JSON.parse(localStorage.getItem('notes')) || [];
    
    notesContainer.innerHTML = '';
    
    if (notes.length === 0) {
        notesContainer.innerHTML = '<div class="no-notes-message">У вас пока нет заметок</div>';
        return;
    }
    
    notes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item-select';
        noteElement.dataset.noteId = note.id;
        
        // Truncate content for preview
        const preview = note.content ? note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '') : 'Пустая заметка';
        
        noteElement.innerHTML = `
            <input type="checkbox" class="note-checkbox" data-note-id="${note.id}">
            <div class="note-info">
                <div class="note-title-select">${note.title || 'Без названия'}</div>
                <div class="note-preview">${preview}</div>
            </div>
        `;
        
        // Add click handler for the entire element
        noteElement.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const checkbox = noteElement.querySelector('.note-checkbox');
                checkbox.checked = !checkbox.checked;
                updateNoteSelection(note.id, checkbox.checked);
            }
        });
        
        // Add change handler for checkbox
        const checkbox = noteElement.querySelector('.note-checkbox');
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            updateNoteSelection(note.id, e.target.checked);
        });
        
        notesContainer.appendChild(noteElement);
    });
}

// Update note selection state
function updateNoteSelection(noteId, isSelected) {
    const selectedNotes = JSON.parse(localStorage.getItem('selectedNotes') || '[]');
    
    if (isSelected) {
        if (!selectedNotes.includes(noteId)) {
            selectedNotes.push(noteId);
        }
    } else {
        const index = selectedNotes.indexOf(noteId);
        if (index > -1) {
            selectedNotes.splice(index, 1);
        }
    }
    
    localStorage.setItem('selectedNotes', JSON.stringify(selectedNotes));
    updateSelectionUI();
}

// Update selection UI
function updateSelectionUI() {
    const selectedNotes = JSON.parse(localStorage.getItem('selectedNotes') || '[]');
    const selectedCount = document.getElementById('selected-count');
    const summarizeBtn = document.getElementById('summarize-selected-btn');
    
    // Update count
    selectedCount.textContent = selectedNotes.length;
    
    // Update button state
    summarizeBtn.disabled = selectedNotes.length === 0;
    
    // Update checkbox states
    const checkboxes = document.querySelectorAll('.note-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectedNotes.includes(checkbox.dataset.noteId);
        const noteElement = checkbox.closest('.note-item-select');
        if (checkbox.checked) {
            noteElement.classList.add('selected');
        } else {
            noteElement.classList.remove('selected');
        }
    });
}

// Filter notes based on search input
function filterNotes() {
    const searchTerm = document.getElementById('notes-search').value.toLowerCase();
    const noteElements = document.querySelectorAll('.note-item-select');
    
    noteElements.forEach(element => {
        const title = element.querySelector('.note-title-select').textContent.toLowerCase();
        const preview = element.querySelector('.note-preview').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || preview.includes(searchTerm)) {
            element.style.display = 'flex';
        } else {
            element.style.display = 'none';
        }
    });
}

// Select all notes
function selectAllNotes() {
    const checkboxes = document.querySelectorAll('.note-checkbox');
    const allVisibleCheckboxes = Array.from(checkboxes).filter(cb => {
        return cb.closest('.note-item-select').style.display !== 'none';
    });
    
    const allSelected = allVisibleCheckboxes.every(cb => cb.checked);
    
    allVisibleCheckboxes.forEach(checkbox => {
        checkbox.checked = !allSelected;
        updateNoteSelection(checkbox.dataset.noteId, !allSelected);
    });
}

// Clear selection
function clearSelection() {
    localStorage.setItem('selectedNotes', JSON.stringify([]));
    updateSelectionUI();
}

// Send chat message
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();

    if (!message) return;

    const userId = getUserId();
    if (!userId) {
        alert('Пожалуйста, войдите в систему');
        return;
    }

    // Add user message to chat
    addMessageToChat(message, 'user');
    chatInput.value = '';

    // Show loading indicator
    const loadingId = addMessageToChat('Думаю...', 'ai', true);

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                User_id: userId,
                Message: message,
            }),
        });

        const data = await response.json();

        // Remove loading message
        removeMessage(loadingId);

        if (data.status && data.reply) {
            addMessageToChat(data.reply, 'ai');
        } else {
            addMessageToChat(data.message || 'Извините, произошла ошибка. Попробуйте еще раз.', 'ai');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        removeMessage(loadingId);
        addMessageToChat('Ошибка связи с сервером.', 'ai');
    }
}

// Summarize selected notes
async function summarizeSelectedNotes() {
    const userId = getUserId();
    if (!userId) {
        alert('Пожалуйста, войдите в систему');
        return;
    }

    const selectedNotes = JSON.parse(localStorage.getItem('selectedNotes') || '[]');
    if (selectedNotes.length === 0) {
        alert('Пожалуйста, выберите хотя бы одну заметку');
        return;
    }

    // Close selection modal
    document.getElementById('notes-selection-modal').style.display = 'none';
    
    // Show loading in chat
    const loadingId = addMessageToChat(`Анализирую ${selectedNotes.length} заметок...`, 'ai', true);

    try {
        const response = await fetch('/api/ai/summarize-selected', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                User_id: userId,
                Note_ids: selectedNotes,
            }),
        });

        const data = await response.json();

        // Remove loading message
        removeMessage(loadingId);

        if (data.status && data.reply) {
            addMessageToChat(data.reply, 'ai');
        } else {
            addMessageToChat(data.message || 'Не удалось создать резюме.', 'ai');
        }
    } catch (error) {
        console.error('Error summarizing selected notes:', error);
        removeMessage(loadingId);
        addMessageToChat('Ошибка при создании резюме.', 'ai');
    }
}

// Add message to chat UI
function addMessageToChat(content, role, isLoading = false) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    const messageId = 'msg-' + Date.now();
    
    messageDiv.id = messageId;
    messageDiv.className = role === 'user' ? 'user-message' : 'ai-message';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    if (isLoading) contentDiv.classList.add('loading-message');
    
    // Simple markdown-like formatting for AI messages
    if (role === 'ai' && !isLoading) {
        contentDiv.innerHTML = formatMessage(content);
    } else {
        contentDiv.textContent = content;
    }
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageId;
}

// Format message with basic markdown support
function formatMessage(text) {
    // Escape HTML
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Bold: **text** or __text__
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// Remove message from chat
function removeMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
        message.remove();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initAIChat();
    // Initialize selection UI if modal is opened
    document.getElementById('ai-chat-link')?.addEventListener('click', () => {
        setTimeout(() => {
            const selectedNotes = JSON.parse(localStorage.getItem('selectedNotes') || '[]');
            if (selectedNotes.length > 0) {
                updateSelectionUI();
            }
        }, 100);
    });
});
