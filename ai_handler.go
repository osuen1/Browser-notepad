package serv

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"server/ai"
	"server/db"
)

type ChatRequest struct {
	User_id string `json:"User_id"`
	Message string `json:"Message"`
}

type SummarizeSelectedRequest struct {
	User_id  string   `json:"User_id"`
	Note_ids []string `json:"Note_ids"`
}

type ChatResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message,omitempty"`
	Reply   string `json:"reply,omitempty"`
}

var geminiClient *ai.GeminiClient

func initGeminiClient() {
	if geminiClient == nil {
		geminiClient = ai.NewGeminiClient()
	}
}

func AIChatHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	init_server()
	initGeminiClient()

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		response := ChatResponse{
			Status:  false,
			Message: "Сообщение не может быть пустым",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	reply, err := geminiClient.SendMessage(req.Message)
	if err != nil {
		fmt.Printf("Ошибка Gemini API: %v\n", err)
		response := ChatResponse{
			Status:  false,
			Message: "Ошибка связи с AI",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	response := ChatResponse{
		Status: true,
		Reply:  reply,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func AISummarizeSelectedHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	init_server()
	initGeminiClient()

	var req SummarizeSelectedRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if server.db == nil {
		http.Error(w, "Database not initialized", http.StatusInternalServerError)
		return
	}

	if len(req.Note_ids) == 0 {
		response := ChatResponse{
			Status:  false,
			Message: "Не выбрано ни одной заметки",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Get selected notes
	var notesToSummarize []string

	for _, noteId := range req.Note_ids {
		// Verify note belongs to user and exists
		noteExists, err := db.Check_note(server.db, noteId)
		if err != nil || !noteExists {
			continue // Skip invalid notes
		}

		// Get note details
		rows, err := server.db.Query(context.Background(),
			"SELECT title, text FROM note WHERE id = $1 AND user_id = $2",
			noteId, req.User_id)
		if err != nil {
			continue
		}

		var title, content string
		if rows.Next() {
			if err := rows.Scan(&title, &content); err != nil {
				rows.Close()
				continue
			}
		}
		rows.Close()

		if title != "" || content != "" {
			notesToSummarize = append(notesToSummarize, fmt.Sprintf("Заголовок: %s\nСодержание: %s", title, content))
		}
	}

	if len(notesToSummarize) == 0 {
		response := ChatResponse{
			Status:  false,
			Message: "Не найдено доступных заметок для суммаризации",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	combinedNotes := strings.Join(notesToSummarize, "\n\n---\n\n")

	summary, err := geminiClient.SummarizeNotes(combinedNotes)
	if err != nil {
		fmt.Printf("Ошибка суммаризации: %v\n", err)
		response := ChatResponse{
			Status:  false,
			Message: "Ошибка создания резюме",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	response := ChatResponse{
		Status: true,
		Reply:  summary,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
