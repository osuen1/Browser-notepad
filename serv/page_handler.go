package serv

import (
	"fmt"
	"net/http"
	"html/template"
	"encoding/json"

	"github.com/gorilla/sessions"
	"github.com/jackc/pgx/v5/pgxpool"

	"server/db"
)

type Note struct { // парсим приходящий от js json
	ID       int    `json:"ID"`
	User_id  int    `json:"User_id"`
	Date     string `json:"Date"`
	TextNote string `json:"Info"`
}

type Login_info struct { // парсим приходящий от js json
	Login    string `json:"Login"`
	Password string `json:"Password"`
}

type Login_array struct {
	data_login []string
	data_password []string
}

type ArrayInfo struct { // создаем структуру, которая создает срез для временного хранения информации (будет заменено базой данных)
	data []string
}

type Server struct {
	db 			    *pgxpool.Pool
	cookie_handler  *sessions.CookieStore
}

var tmpl = template.Must(template.ParseFiles("templates/index.html"))
var note_page = template.Must(template.ParseFiles("templates/save-notes.html"))
var log_page = template.Must(template.ParseFiles("templates/login.html"))
var register_page = template.Must(template.ParseFiles("templates/register.html"))

var data Note // создаем data для хранения передачи информации с одной функции на другую (временно)
var info ArrayInfo // создаем элемент структуры (массив, состоящий из data.TextNote)
var data_test Login_info
var log_info Login_array
var server Server

func openDB() {
	if server.db == nil {
		server.db = db.Db_connect()
	}
}

func IndexHandler(w http.ResponseWriter, r *http.Request) { // отрисовка главной страницы блокнота (с полем вводе новой заметки)
	if r.Method == http.MethodGet {
		tmpl.Execute(w, nil) // передача HTML документа клиентскому серверу
	}

	if r.Method == http.MethodPost { // если сервер отправляет JSON - обрабатываем

		decoder := json.NewDecoder(r.Body) // декодируем JSON с клиента
		if err := decoder.Decode(&data); err != nil { // записываем данные из JSON в структуру Note
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		info.data = append(info.data, data.TextNote) // заполняем массив текстом, который ввел пользователь
		fmt.Printf("Received JSON: %+v\n", info.data) // выводим данные в консоль
	}
}

func NoteHandler(w http.ResponseWriter, r *http.Request) { // отрисовка вторичной страницы блокнота (со списком всех заметок)
	if r.Method == http.MethodGet { // проверяем, запрашивает ли клиент информацию
		if r.Header.Get("Accept") == "application/json" { // Если клиент запрашивает JSON

			w.Header().Set("Content-Type", "application/json") // устанавливаем заголовки
			if err := json.NewEncoder(w).Encode(info.data); err != nil { // кодируем массив значений, введенных пользователем, для отправки клиенту
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}

		} else { // Если клиент запрашивает HTML
			note_page.Execute(w, nil)
		}
		return
	}

	http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
}

// добавить шифрование
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		log_page.Execute(w, nil)
	}

	if r.Method == http.MethodPost {
		decoder := json.NewDecoder(r.Body) // декодируем JSON с клиента
		if err := decoder.Decode(&data_test); err != nil { // записываем данные из JSON в структуру login_info
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		
		log_info.data_login = append(log_info.data_login, data_test.Login)
		log_info.data_password = append(log_info.data_password, data_test.Password)

		fmt.Printf("Received JSON: %+v\n %+v\n", log_info.data_login,log_info.data_password)
	}
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		register_page.Execute(w, nil)
	}

	if r.Method == http.MethodPost {
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&data_test); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		openDB()
		db.Add_user(server.db, data_test.Login, Hash_password(data_test.Password))
	}
}