package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"os"
)

type Note struct { // парсим приходящий от js json
	Date     string `json:"Date"`
	TextNote string `json:"Info"`
}

type ArrayInfo struct { // создаем структуру, которая создает срез для временного хранения информации (будет заменено базой данных)
	data []string
}

var tmpl = template.Must(template.ParseFiles("index.html"))
var nh = template.Must(template.ParseFiles("save-notes.html"))

var data Note // создаем data для хранения передачи информации с одной функции на другую (временно)
var info ArrayInfo // создаем элемент структуры (массив, состоящий из data.TextNote)

func indexHandler(w http.ResponseWriter, r *http.Request) { // отрисовка главной страницы блокнота (с полем вводе новой заметки)
	if r.Method == http.MethodGet {
		tmpl.Execute(w, nil) // передача HTML документа клиентскому серверу
	}

	if r.Method == http.MethodPost { // если сервер отправляет JSON - обрабатываем

		decoder := json.NewDecoder(r.Body) // декодируем JSON с клиента
		if err := decoder.Decode(&data); err != nil { // записываем данные из JSON в структуру Note
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		info.data = append(info.data, data.TextNote) // заполняем массив текстом, который ввел пользователь
		fmt.Printf("Received JSON: %+v\n", info.data) // выводим данные в консоль
	}
}

func noteHandler(w http.ResponseWriter, r *http.Request) { // отрисовка вторичной страницы блокнота (со списком всех заметок)
	if r.Method == http.MethodGet { // проверяем, запрашивает ли клиент информацию
		if r.Header.Get("Accept") == "application/json" { // Если клиент запрашивает JSON

			w.Header().Set("Content-Type", "application/json") // устанавливаем заголовки
			if err := json.NewEncoder(w).Encode(info.data); err != nil { // кодируем массив значений, введенных пользователем, для отправки клиенту
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}

		} else { // Если клиент запрашивает HTML
			nh.Execute(w, nil)
		}
		return
	}

	http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
}

func main() {
	port := os.Getenv("PORT") // устанавливаем порт
	if port == "" {
		port = "3030"
	}

	fs := http.FileServer(http.Dir("assets")) // находим файлы со стилями и внутренней логикой страниц

	mux := http.NewServeMux() // создаем новый мультиплексор для точной маршрутизации сайта 

	mux.Handle("/assets/", http.StripPrefix("/assets/", fs)) // переходим к файлу с css
	mux.HandleFunc("/", indexHandler) // вызываем функцию indexHandler, которая отрисовывает главную страницу, и устанавливаем ец путь "/"
	mux.HandleFunc("/save-notes.html", noteHandler) // вызываем функцию noteHandler, которая отрисовывает вторичную страницу, и устанавливаем ец путь /save-notes.html

	http.ListenAndServe(":"+port, mux) // запускаем сервер, начиная слушать 3030 порт localhost'а
}