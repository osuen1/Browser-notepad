package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"server/serv"
)

func main() {
	godotenv.Load()
	port := os.Getenv("PORT") // устанавливаем порт
	if port == "" {
		port = "3030"
	}

	fs := http.FileServer(http.Dir("assets")) // находим файлы со стилями и внутренней логикой страниц

	mux := http.NewServeMux() // создаем новый мультиплексор для точной маршрутизации сайта

	mux.Handle("/assets/", http.StripPrefix("/assets/", fs)) // переходим к файлу с css
	mux.HandleFunc("/", serv.IndexHandler)                   // вызываем функцию indexHandler, которая отрисовывает главную страницу, и устанавливаем ец путь "/"
	mux.HandleFunc("/new_note", serv.NoteHandler)            // вызываем функцию noteHandler, которая отрисовывает вторичную страницу, и устанавливаем ец путь /save-notes.html
	mux.HandleFunc("/login", serv.LoginHandler)              // вызываем функцию loginHandler, которая отрисовывает страницу авторизации, и устанавливаем ец путь "/login.html
	mux.HandleFunc("/register", serv.RegisterHandler)
	mux.HandleFunc("/forgotpassword", serv.ForgotPasswordHandler)
	mux.HandleFunc("/resetpassword", serv.ResetPasswordHandler)
	mux.HandleFunc("/todolist", serv.TodoPageHandler)
	mux.HandleFunc("/dashboard", serv.DashboardHandler)

	mux.HandleFunc("/api/folders/create", serv.CreateFolderHandler)
	mux.HandleFunc("/api/folders/delete", serv.DeleteFolderHandler)
	mux.HandleFunc("/api/folders/get", serv.GetFoldersHandler)
	mux.HandleFunc("/api/notes/get", serv.GetNotesHandler)
	mux.HandleFunc("/api/notes/create", serv.CreateNoteHandler)
	mux.HandleFunc("/api/notes/delete", serv.DeleteNoteHandler)
	mux.HandleFunc("/api/reset-password", serv.ResetApiHandler)
	mux.HandleFunc("/api/todo/create", serv.TodoCreateHadler)
	mux.HandleFunc("/api/todos/get", serv.GetTodoHandler)
	mux.HandleFunc("/api/todo/delete", serv.DeleteTodoHandler)
	mux.HandleFunc("/api/files/upload", serv.CreateFileHandler)
	mux.HandleFunc("/api/files/get", serv.GetFilesHandler)
	mux.HandleFunc("/api/files/delete", serv.DeleteFileHandler)
	mux.HandleFunc("/api/profile/update", serv.UpdateProfileHandler)
	mux.HandleFunc("/api/profile/get", serv.GetProfileHandler)
	mux.HandleFunc("/api/ai/chat", serv.AIChatHandler)
	mux.HandleFunc("/api/ai/summarize-selected", serv.AISummarizeSelectedHandler)
	mux.HandleFunc("/api/events/get", serv.EventsGetHandler)
	mux.HandleFunc("/api/events/upload", serv.EventsCreateHandler)

	fmt.Print("Сервер запущен на порту: ", port, "\n")
	http.ListenAndServe(":"+port, mux) // запускаем сервер, начиная слушать 3030 порт localhost'а
}
