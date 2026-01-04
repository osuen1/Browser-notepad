package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/sessions"
	"github.com/jackc/pgx/v5/pgxpool"

	"server/db"
	"server/serv"
)

// Надо добавить куки для сохранения данных
type Server struct {
	db 			    *pgxpool.Pool
	cookie_handler  *sessions.CookieStore
}

var server Server

func openDB() {
	if server.db == nil {
		server.db = db.Db_connect()
	}
}

func main() {
	port := os.Getenv("PORT") // устанавливаем порт
	if port == "" {
		port = "3030"
	}

	openDB()

	fs := http.FileServer(http.Dir("assets")) // находим файлы со стилями и внутренней логикой страниц

	mux := http.NewServeMux() // создаем новый мультиплексор для точной маршрутизации сайта 

	mux.Handle("/assets/", http.StripPrefix("/assets/", fs)) // переходим к файлу с css
	mux.HandleFunc("/", serv.IndexHandler) // вызываем функцию indexHandler, которая отрисовывает главную страницу, и устанавливаем ец путь "/"
	mux.HandleFunc("/save-notes.html", serv.NoteHandler) // вызываем функцию noteHandler, которая отрисовывает вторичную страницу, и устанавливаем ец путь /save-notes.html
	mux.HandleFunc("/login.html", serv.LoginHandler) // вызываем функцию loginHandler, которая отрисовывает страницу авторизации, и устанавливаем ец путь "/login.html
	mux.HandleFunc("/register.html", serv.RegisterHandler)

	fmt.Print("Сервер запущен на порту: ", port, "\n")
	http.ListenAndServe(":"+port, mux) // запускаем сервер, начиная слушать 3030 порт localhost'а
}