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
	mux.HandleFunc("/", serv.IndexHandler) // вызываем функцию indexHandler, которая отрисовывает главную страницу, и устанавливаем ец путь "/"
	mux.HandleFunc("/new_note", serv.NoteHandler) // вызываем функцию noteHandler, которая отрисовывает вторичную страницу, и устанавливаем ец путь /save-notes.html
	mux.HandleFunc("/login.html", serv.LoginHandler) // вызываем функцию loginHandler, которая отрисовывает страницу авторизации, и устанавливаем ец путь "/login.html
	mux.HandleFunc("/register.html", serv.RegisterHandler)
	mux.HandleFunc("/forgotpassword", serv.ForgotPasswordHandler)
	mux.HandleFunc("/resetpassword", serv.ResetPasswordHandler)
	
	
	mux.HandleFunc("/api/folders/create", serv.CreateFolderHandler)
	mux.HandleFunc("/api/folders/delete", serv.DeleteFolderHandler)
	mux.HandleFunc("/api/folders/get", serv.GetFoldersHandler)
	mux.HandleFunc("/api/notes/get", serv.Get_notes_handler)
    mux.HandleFunc("/api/notes/create", serv.Create_note_handler)
    mux.HandleFunc("/api/notes/delete", serv.Delete_note_handler)
    mux.HandleFunc("/api/reset-password", serv.ResetApiHandler)
    

	fmt.Print("Сервер запущен на порту: ", port, "\n")
	http.ListenAndServe(":"+port, mux) // запускаем сервер, начиная слушать 3030 порт localhost'а
}