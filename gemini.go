package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type GeminiClient struct {
	apiKey  string
	baseURL string
	model   string
}

// Groq/OpenAI-compatible request format
type ChatRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Groq/OpenAI-compatible response format
type ChatResponse struct {
	Choices []Choice  `json:"choices"`
	Error   *APIError `json:"error,omitempty"`
}

type Choice struct {
	Message ChatMessage `json:"message"`
}

type APIError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
}

func NewGeminiClient() *GeminiClient {
	return &GeminiClient{
		apiKey:  os.Getenv("GROQ_API_KEY"),
		baseURL: "https://api.groq.com/openai/v1/chat/completions",
		model:   "llama-3.3-70b-versatile",
	}
}

func (c *GeminiClient) SendMessage(prompt string) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("GROQ_API_KEY не установлен")
	}

	reqBody := ChatRequest{
		Model: c.model,
		Messages: []ChatMessage{
			{Role: "user", Content: prompt},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("ошибка сериализации запроса: %v", err)
	}

	req, err := http.NewRequest("POST", c.baseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("ошибка создания запроса: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("ошибка отправки запроса: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("ошибка чтения ответа: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ошибка API (статус %d): %s", resp.StatusCode, string(body))
	}

	var chatResp ChatResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		return "", fmt.Errorf("ошибка десериализации ответа: %v", err)
	}

	if chatResp.Error != nil {
		return "", fmt.Errorf("ошибка API: %s", chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("пустой ответ от API")
	}

	return chatResp.Choices[0].Message.Content, nil
}

func (c *GeminiClient) SummarizeNotes(notesContent string) (string, error) {
	prompt := fmt.Sprintf(`Ты - полезный ассистент, который помогает пользователю с его заметками.
Пожалуйста, создай краткое резюме следующих заметок на русском языке:

%s

Резюме:`, notesContent)

	return c.SendMessage(prompt)
}
