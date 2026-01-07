package main

import (
	"fmt"
	"net/http"
	"os"

	"server/serv"
)

// Надо добавить куки для сохранения данных


func main() {
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

	fmt.Print("Сервер запущен на порту: ", port, "\n")
	http.ListenAndServe(":"+port, mux) // запускаем сервер, начиная слушать 3030 порт localhost'а
}