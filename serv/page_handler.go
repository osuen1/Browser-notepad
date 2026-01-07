package serv

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"os"

	"github.com/gorilla/sessions"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

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

type Login_response struct {
	Status  string `json:"status"`
    Message string `json:"message,omitempty"`
}

type ArrayInfo struct { // создаем структуру, которая создает срез для временного хранения информации (будет заменено базой данных)
	data []string
}

type Server struct {
	db 			    *pgxpool.Pool
	cookie_handler  *sessions.CookieStore
}

var tmpl = template.Must(template.ParseFiles("templates/index.html"))
var log_page = template.Must(template.ParseFiles("templates/login.html"))
var register_page = template.Must(template.ParseFiles("templates/register.html"))
var new_page = template.Must(template.ParseFiles("templates/new_page.html"))

var data Note // создаем data для хранения передачи информации с одной функции на другую (временно)
var info ArrayInfo // создаем элемент структуры (массив, состоящий из data.TextNote)
var data_test Login_info
var server Server

func init_server() {
	if err := godotenv.Load(); err != nil {
		fmt.Print(err)
	}

	if server.db == nil {
		server.db = db.Db_connect()
	}

	if server.cookie_handler == nil {
		key, _ := hex.DecodeString(os.Getenv("COOKIE_KEY"))
		server.cookie_handler = sessions.NewCookieStore(key)
	}
}

// индекс уйдет под отрисовку лендинга
func IndexHandler(w http.ResponseWriter, r *http.Request) { // отрисовка главной страницы блокнота (с полем вводе новой заметки)
	if r.Method == http.MethodGet && server.cookie_handler != nil {
		tmpl.Execute(w, nil) // передача HTML документа клиентскому серверу
	} else {
		http.Error(w, "u not login", http.StatusForbidden)
	}

	if r.Method == http.MethodPost && server.cookie_handler != nil { // если сервер отправляет JSON - обрабатываем

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
	if r.Method == http.MethodGet {
		new_page.Execute(w, nil)
	}
}

// дописать правильную отравку json
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		log_page.Execute(w, nil)
	}

	if r.Method == http.MethodPost {
		decoder := json.NewDecoder(r.Body) // декодируем JSON с клиента
		if err := decoder.Decode(&data_test); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		} else {
			var response Login_response

			init_server()
			
			// получаем захешированный пароль из базы данных
			user_id, _, password := db.Check_user(server.db, data_test.Login)

			// проверка пароля
			if status := Check_password(password, data_test.Password); status == true {
				response.Status = "true"
				w.Header().Set("Content-Type", "application/json")

				if err := json.NewEncoder(w).Encode(response); err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
				}

				session, _ := server.cookie_handler.Get(r, "session-name")
				session.Values["user_id"] = user_id
				session.Save(r, w)
			} else {
				response.Status = "false"
				response.Message = "Invalid login or password"

				w.Header().Set("Content-Type", "application/json")
				if err := json.NewEncoder(w).Encode(response); err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
				}
			}
		}
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

		init_server()
		db.Add_user(server.db, data_test.Login, Hash_password(data_test.Password))
	}
}